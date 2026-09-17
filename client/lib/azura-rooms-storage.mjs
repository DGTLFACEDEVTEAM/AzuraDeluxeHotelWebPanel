import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, open, readFile, realpath, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { inspectHomepageImage } from "./azura-homepage-media.mjs";
import { LOCALES, parseIfMatch, resolveAzuraPaths } from "./azura-homepage-storage.mjs";

export const ROOM_KEYS = Object.freeze(["deluxe", "family", "fantasy"]);
const IMAGE_PATH = /^\/uploads\/pages\/rooms\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.(?:jpg|jpeg|png|webp)$/i;
const TEXT_LIMITS = Object.freeze({ title: 250, text: 2000, area: 120, view: 200, buttonText: 120 });
const MAX_PIXELS = 16_000_000;
let roomsWriteQueue = Promise.resolve();

export class RoomsContentError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "RoomsContentError";
    this.status = status;
  }
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) {
    throw new RoomsContentError(`${label} beklenen biçimde değil.`);
  }
}

function validText(value, limit, label) {
  if (typeof value !== "string" || !value.trim() || value.length > limit || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new RoomsContentError(`${label} geçersiz veya çok uzun.`);
  }
}

function validateImage(image, label) {
  exactKeys(image, ["src", "width", "height", "translations"], label);
  if (typeof image.src !== "string" || !IMAGE_PATH.test(image.src) || image.src.includes("..")) {
    throw new RoomsContentError(`${label}.src geçersiz.`);
  }
  if (!Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width <= 0 ||
      image.height <= 0 || image.width * image.height > MAX_PIXELS) {
    throw new RoomsContentError(`${label} görsel ölçüleri geçersiz.`);
  }
  exactKeys(image.translations, LOCALES, `${label}.translations`);
  for (const locale of LOCALES) {
    exactKeys(image.translations[locale], ["alt"], `${label}.translations.${locale}`);
    validText(image.translations[locale].alt, 300, `${label}.translations.${locale}.alt`);
  }
}

export function validateRoomsContent(content) {
  if (!content || typeof content !== "object" || Array.isArray(content) ||
      !["schemaVersion", "pageKey", "cards"].every((key) => Object.hasOwn(content, key))) {
    throw new RoomsContentError("rooms beklenen biçimde değil.");
  }
  if (content.schemaVersion !== 1 || content.pageKey !== "rooms" ||
      !Array.isArray(content.cards) || content.cards.length !== ROOM_KEYS.length) {
    throw new RoomsContentError("rooms sayfa anahtarı, sürümü veya kart sayısı geçersiz.");
  }
  content.cards.forEach((card, index) => {
    const label = `cards[${index}]`;
    exactKeys(card, ["key", "primary", "secondary", "translations"], label);
    if (card.key !== ROOM_KEYS[index]) throw new RoomsContentError(`${label}.key veya kart sırası geçersiz.`);
    validateImage(card.primary, `${label}.primary`);
    validateImage(card.secondary, `${label}.secondary`);
    exactKeys(card.translations, LOCALES, `${label}.translations`);
    for (const locale of LOCALES) {
      exactKeys(card.translations[locale], Object.keys(TEXT_LIMITS), `${label}.translations.${locale}`);
      for (const [field, limit] of Object.entries(TEXT_LIMITS)) {
        validText(card.translations[locale][field], limit, `${label}.translations.${locale}.${field}`);
      }
    }
  });
  return content;
}

export function validateRoomsCards(cards) {
  validateRoomsContent({ schemaVersion: 1, pageKey: "rooms", cards });
  return cards;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function roomsCardsRevision(cards) {
  validateRoomsCards(cards);
  return roomsRevisionFor(cards);
}

export function roomsRevisionFor(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function parseRoomsIfMatch(value) {
  return parseIfMatch(value);
}

export function roomsFile(paths = resolveAzuraPaths()) {
  return path.join(paths.contentRoot, "site-pages", "rooms.json");
}

async function validateImageFile(image, paths, root) {
  const actual = await inspectRoomImagePath(image.src, paths, root);
  if (actual.width !== image.width || actual.height !== image.height) {
    throw new RoomsContentError(`Oda görselinin gerçek ölçüleri rooms.json ile eşleşmiyor: ${image.src}`);
  }
}

export async function inspectRoomImagePath(src, paths = resolveAzuraPaths(), knownRoot) {
  if (typeof src !== "string" || !IMAGE_PATH.test(src) || src.includes("..")) {
    throw new RoomsContentError("Oda görsel yolu geçersiz.");
  }
  const root = knownRoot ?? await realpath(paths.uploadsRoot);
  const relative = src.slice("/uploads/".length);
  const file = path.join(paths.uploadsRoot, relative);
  const roomsRoot = path.join(root, "pages", "rooms");
  try {
    if (await realpath(path.dirname(file)) !== roomsRoot) throw new Error("rooms directory");
  } catch {
    throw new RoomsContentError(`Oda görseli kalıcı uploads dizininde bulunamadı: ${src}`);
  }
  const extension = path.extname(src).toLowerCase();
  const mimeType = extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" :
    extension === ".png" ? "image/png" : "image/webp";
  let actual;
  let handle;
  try {
    handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
    if (!(await handle.stat()).isFile()) throw new Error("not a file");
    actual = await inspectHomepageImage(await handle.readFile(), mimeType);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new RoomsContentError(`Oda görseli kalıcı uploads dizininde bulunamadı: ${src}`);
    }
    throw new RoomsContentError(`Oda görseli geçersiz veya bozuk: ${src}`);
  } finally {
    if (handle) await handle.close();
  }
  return actual;
}

async function validateCardImages(cards, paths) {
  const root = await realpath(paths.uploadsRoot);
  for (const card of cards) {
    await validateImageFile(card.primary, paths, root);
    await validateImageFile(card.secondary, paths, root);
  }
}

export async function readRoomsContent(paths = resolveAzuraPaths()) {
  let content;
  try {
    content = JSON.parse(await readFile(roomsFile(paths), "utf8"));
  } catch (error) {
    throw new RoomsContentError(`Azura rooms verisi okunamadı: ${roomsFile(paths)} (${error.message})`);
  }
  validateRoomsContent(content);
  await validateCardImages(content.cards, paths);
  return content;
}

export async function readRoomsCardsVersion(paths = resolveAzuraPaths()) {
  const { cards } = await readRoomsContent(paths);
  return { cards, revision: roomsCardsRevision(cards) };
}

export async function writeRoomsAtomically(content, paths) {
  const target = roomsFile(paths);
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = path.join(path.dirname(target), `.${path.basename(target)}.${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(temporary, "wx", 0o600);
    await handle.writeFile(`${JSON.stringify(content, null, 2)}\n`);
    await handle.sync();
    await handle.close();
    handle = null;
    await rename(temporary, target);
    const directory = await open(path.dirname(target), "r");
    try { await directory.sync(); } finally { await directory.close(); }
  } catch (error) {
    if (handle) await handle.close();
    await unlink(temporary).catch(() => {});
    throw error;
  }
}

export function enqueueRoomsWrite(operation) {
  const result = roomsWriteQueue.then(operation, operation);
  roomsWriteQueue = result.then(() => undefined, () => undefined);
  return result;
}

export async function writeRoomsCards(cards, expectedRevision, paths = resolveAzuraPaths()) {
  validateRoomsCards(cards);
  const operation = async () => {
    const current = await readRoomsContent(paths);
    if (roomsCardsRevision(current.cards) !== expectedRevision) {
      throw new RoomsContentError("Oda kartları başka bir kayıtla değişti.", 409);
    }
    await validateCardImages(cards, paths);
    await writeRoomsAtomically({ ...current, cards }, paths);
    return { cards, revision: roomsCardsRevision(cards) };
  };
  return enqueueRoomsWrite(operation);
}

export async function readRoomsCards(locale, paths = resolveAzuraPaths()) {
  if (!LOCALES.includes(locale)) throw new RoomsContentError(`Desteklenmeyen oda dili: ${locale}`);
  const content = await readRoomsContent(paths);
  return content.cards.map((card) => ({
    key: card.key,
    primary: {
      src: card.primary.src,
      width: card.primary.width,
      height: card.primary.height,
      alt: card.primary.translations[locale].alt,
    },
    secondary: {
      src: card.secondary.src,
      width: card.secondary.width,
      height: card.secondary.height,
      alt: card.secondary.translations[locale].alt,
    },
    ...card.translations[locale],
  }));
}
