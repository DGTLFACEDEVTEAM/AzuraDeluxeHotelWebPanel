import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, open, readFile, realpath, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { LOCALES, parseIfMatch, resolveAzuraPaths } from "./azura-homepage-storage.mjs";
import { inspectHomepageImage, MAX_IMAGE_BYTES } from "./azura-homepage-media.mjs";

export const ROOM_FEATURE_IDS = Object.freeze(["area", "dresser", "nonSmoking", "minibar", "safe", "hairdryer", "bathEssentials", "teaCoffee", "tvWifi", "balcony", "shower"]);
const ROOM_LINKS = Object.freeze({ deluxe: "/rooms/deluxeroom", family: "/rooms/familyroom", fantasy: "/rooms/fantasyroom" });
// A room is readable only after an explicit configuration is added here.
const ROOMS = Object.freeze({ deluxe: Object.freeze({
  pageKey: "deluxeroom", file: "deluxeroom.json", folder: "deluxeroom",
  galleryIds: Object.freeze(Array.from({ length: 9 }, (_, i) => `deluxe-gallery-${i + 1}`)),
  tourIds: Object.freeze(["land", "sea", "partialSea"]),
  optionIds: Object.freeze(["family", "fantasy"]),
}) });

export class RoomDetailContentError extends Error {
  constructor(message, status = 400) { super(message); this.name = "RoomDetailContentError"; this.status = status; }
}

export function roomDetailConfig(roomKey) {
  if (typeof roomKey !== "string" || !Object.hasOwn(ROOMS, roomKey)) throw new RoomDetailContentError("Etkin olmayan veya geçersiz oda kimliği.", 404);
  return ROOMS[roomKey];
}

export function roomDetailLink(roomKey) {
  if (typeof roomKey !== "string" || !Object.hasOwn(ROOM_LINKS, roomKey)) throw new RoomDetailContentError("Geçersiz hedef oda.");
  return ROOM_LINKS[roomKey];
}

function keys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).length !== expected.length || expected.some(key => !Object.hasOwn(value, key))) {
    throw new RoomDetailContentError(`${label}: eksik veya geçersiz alan.`);
  }
}

function texts(value, fields, label, max = 4000) {
  keys(value, fields, label);
  for (const field of fields) {
    if (typeof value[field] !== "string" || !value[field].trim() || value[field].length > max ||
        /[<>\u0000-\u001f\u007f]/.test(value[field])) throw new RoomDetailContentError(`${label}.${field}: geçersiz düz metin.`);
  }
}

export function validateRoomTourUrl(value) {
  if (typeof value !== "string" || value.length > 1500 || /[\s\\<>]/.test(value)) throw new RoomDetailContentError("Geçersiz tur URL'si.");
  let url;
  try { url = new URL(value); } catch { throw new RoomDetailContentError("Geçersiz tur URL'si."); }
  if (!value.startsWith("https://kuula.co/share/collection/") || url.origin !== "https://kuula.co" ||
      url.username || url.password || url.hash || !/^\/share\/collection\/[A-Za-z0-9]{5}$/.test(url.pathname)) {
    throw new RoomDetailContentError("Tur yalnızca Kuula HTTPS koleksiyon adresi olabilir.");
  }
  const rules = { logo: /^[01]$/, info: /^[01]$/, fs: /^[01]$/, vr: /^[01]$/, autorotate: /^\d+(\.\d+)?$/,
    autop: /^\d+$/, autopalt: /^[01]$/, thumbs: /^\d+$/, margin: /^\d+$/, alpha: /^(0(\.\d+)?|1(\.0+)?)$/,
    // Preserve the existing first tour's truncated, empty `alph` query without inventing a correction.
    alph: /^$/ };
  const seen = new Set();
  for (const [key, val] of url.searchParams) {
    if (!Object.hasOwn(rules, key) || !rules[key].test(val) || seen.has(key)) throw new RoomDetailContentError("Geçersiz tur parametresi.");
    seen.add(key);
  }
  return value;
}

function image(record, label, config, collection = false, shared = false) {
  keys(record, [...(collection ? ["id", "order"] : []), "image", "width", "height", "translations"], label);
  const match = typeof record.image === "string" && record.image.match(/^\/uploads\/pages\/([a-z-]+)\/([A-Za-z0-9][A-Za-z0-9._-]{0,127}\.(?:jpg|jpeg|png|webp))$/i);
  if (!match || record.image.includes("..") || !(match[1] === config.folder || (shared && match[1] === "room-options"))) {
    throw new RoomDetailContentError(`${label}: geçersiz görsel yolu.`);
  }
  if (!Number.isInteger(record.width) || !Number.isInteger(record.height) || record.width <= 0 || record.height <= 0 || record.width * record.height > 16_000_000) {
    throw new RoomDetailContentError(`${label}: geçersiz ölçüler.`);
  }
  keys(record.translations, LOCALES, `${label}.translations`);
  for (const locale of LOCALES) texts(record.translations[locale], ["alt"], `${label}.${locale}`, 300);
}

function collection(value, ids, label, config, shared = false) {
  keys(value, ["images"], label);
  if (!Array.isArray(value.images) || value.images.length !== ids.length) throw new RoomDetailContentError(`${label}: görsel sayısı geçersiz.`);
  value.images.forEach((record, index) => {
    image(record, label, config, true, shared);
    if (record.id !== ids[index] || record.order !== index) throw new RoomDetailContentError(`${label}: kimlik veya sıra geçersiz.`);
  });
}

export function validateRoomDetailContent(roomKey, content) {
  const config = roomDetailConfig(roomKey);
  if (!content || typeof content !== "object" || Array.isArray(content) || !["schemaVersion", "pageKey", "roomKey", "translations", "media", "tours"].every(key => Object.hasOwn(content, key))) throw new RoomDetailContentError("Oda kök alanları eksik.");
  if (content.schemaVersion !== 1 || content.pageKey !== config.pageKey || content.roomKey !== roomKey) throw new RoomDetailContentError("Oda şeması/kimliği eşleşmiyor.");
  keys(content.translations, LOCALES, "translations");
  for (const locale of LOCALES) {
    const t = content.translations[locale];
    const bannerFields = ["subtitle", "title", "text1", "text2", "text3"];
    keys(t, [...bannerFields, "RoomInfo", "BackgroundSection", "RoomTour", "OtherOptions"], locale);
    texts(Object.fromEntries(bannerFields.map(key => [key, t[key]])), bannerFields, `${locale}.hero`);
    const fields = ["subtitle", "title", "text", "title2", "title3", "text2"];
    keys(t.RoomInfo, [...fields, "amenities", "features"], `${locale}.RoomInfo`);
    texts(Object.fromEntries(fields.map(key => [key, t.RoomInfo[key]])), fields, `${locale}.RoomInfo`);
    texts(t.RoomInfo.amenities, ["doubleBed", "singleBed", "sofa"], `${locale}.amenities`);
    texts(t.RoomInfo.features, ROOM_FEATURE_IDS, `${locale}.features`);
    texts(t.BackgroundSection, ["subtitle", "title", "text"], `${locale}.BackgroundSection`);
    keys(t.RoomTour, config.tourIds, `${locale}.RoomTour`);
    for (const id of config.tourIds) texts(t.RoomTour[id], ["subtitle", "title", "text"], `${locale}.RoomTour.${id}`);
    keys(t.OtherOptions, ["span", "title", "buttonText", "cards"], `${locale}.OtherOptions`);
    const { span, title, buttonText } = t.OtherOptions;
    texts({ span, title, buttonText }, ["span", "title", "buttonText"], `${locale}.OtherOptions`);
    keys(t.OtherOptions.cards, config.optionIds, `${locale}.OtherOptions.cards`);
    for (const id of config.optionIds) {
      if (id === roomKey) throw new RoomDetailContentError("Oda kendisini öneremez.");
      roomDetailLink(id);
      texts(t.OtherOptions.cards[id], ["subtitle", "title", "m", "capacity", "text"], `${locale}.OtherOptions.${id}`);
    }
  }
  keys(content.media, ["hero", "gallery", "background", "otherOptions"], "media");
  image(content.media.hero, "hero", config);
  image(content.media.background, "background", config);
  collection(content.media.gallery, config.galleryIds, "gallery", config);
  collection(content.media.otherOptions, config.optionIds, "otherOptions", config, true);
  if (!Array.isArray(content.tours) || content.tours.length !== config.tourIds.length) throw new RoomDetailContentError("Tur sayısı geçersiz.");
  content.tours.forEach((tour, i) => {
    keys(tour, ["id", "order", "url"], "tour");
    if (tour.id !== config.tourIds[i] || tour.order !== i) throw new RoomDetailContentError("Tur kimliği/sırası geçersiz.");
    validateRoomTourUrl(tour.url);
  });
  return content;
}

export function roomDetailImages(media) {
  return [media.hero, ...media.gallery.images, media.background, ...media.otherOptions.images];
}

export function roomDetailFile(roomKey, paths = resolveAzuraPaths()) {
  return path.join(paths.contentRoot, "site-pages", roomDetailConfig(roomKey).file);
}

export async function readRoomDetailContent(roomKey, paths = resolveAzuraPaths()) {
  const file = roomDetailFile(roomKey, paths);
  let content;
  try { content = JSON.parse(await readFile(file, "utf8")); }
  catch (error) { throw new RoomDetailContentError(`Oda detay verisi okunamadı: ${file} (${error.message})`); }
  validateRoomDetailContent(roomKey, content);
  await validateRoomDetailImages(content.media, paths);
  return content;
}

async function validateRoomDetailImages(media, paths) {
  const inspected = new Map();
  for (const record of roomDetailImages(media)) {
    let handle;
    try {
      let actual = inspected.get(record.image);
      if (!actual) {
        const root = await realpath(paths.uploadsRoot);
        const relative = record.image.slice("/uploads/".length);
        const target = path.join(paths.uploadsRoot, relative);
        if (await realpath(path.dirname(target)) !== path.join(root, path.dirname(relative))) throw new Error("Güvenli olmayan dizin");
        handle = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW);
        const stat = await handle.stat();
        if (!stat.isFile() || stat.size > MAX_IMAGE_BYTES) throw new Error("Geçersiz dosya");
        const ext = path.extname(target).toLowerCase();
        actual = await inspectHomepageImage(await handle.readFile(), ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg");
        inspected.set(record.image, actual);
      }
      if (record.width !== actual.width || record.height !== actual.height) throw new Error("Gerçek ölçüler eşleşmiyor");
    } catch (error) { throw new RoomDetailContentError(`Oda görseli okunamadı: ${record.image} (${error.message})`); }
    finally { if (handle) await handle.close(); }
  }
}

export async function readRoomDetailLocale(roomKey, locale, paths = resolveAzuraPaths()) {
  if (!LOCALES.includes(locale)) throw new RoomDetailContentError("Geçersiz oda dili.");
  const content = await readRoomDetailContent(roomKey, paths);
  const texts = content.translations[locale];
  const localized = r => ({ src: r.image, width: r.width, height: r.height, alt: r.translations[locale].alt });
  return { texts, featureTexts: ROOM_FEATURE_IDS.map(id => texts.RoomInfo.features[id]),
    images: { hero: localized(content.media.hero), gallery: content.media.gallery.images.map(r => ({ id: r.id, ...localized(r) })), background: localized(content.media.background) },
    tours: content.tours.map(tour => ({ ...tour, ...texts.RoomTour[tour.id] })),
    rooms: content.media.otherOptions.images.map(r => {
      const t = texts.OtherOptions.cards[r.id];
      return { id: r.id, img: localized(r), title: t.title, description: t.subtitle, size: t.m, capacity: t.capacity, text: t.text, link: roomDetailLink(r.id) };
    }),
  };
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function writeRoomDetailAtomically(roomKey, content, paths) {
  const target = roomDetailFile(roomKey, paths);
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


// Symbol registry shares the queue even across separately bundled route modules.
const queueKey = Symbol.for("azura.room-details.write-queue");
function enqueueRoomWrite(operation) {
  const result = (globalThis[queueKey] ?? Promise.resolve()).then(operation, operation);
  globalThis[queueKey] = result.then(() => undefined, () => undefined);
  return result;
}
export const parseRoomDetailIfMatch = parseIfMatch;
export function validateRoomDetailPageContent(roomKey, bundle, media) {
  const config = roomDetailConfig(roomKey);
  keys(bundle, ["translations", "tours"], "bundle");
  validateRoomDetailContent(roomKey, {schemaVersion:1, pageKey:config.pageKey, roomKey, ...bundle, media});
}
export function roomDetailRevision(roomKey, bundle, media) {
  validateRoomDetailPageContent(roomKey, bundle, media);
  return createHash("sha256").update(canonicalJson({bundle, media})).digest("hex");
}
export async function readRoomDetailPageContent(roomKey, paths = resolveAzuraPaths()) {
  const {translations, tours, media} = await readRoomDetailContent(roomKey, paths);
  const bundle = {translations, tours};
  return {bundle, media, revision:roomDetailRevision(roomKey, bundle, media)};
}
export async function writeRoomDetailPageContent(roomKey, bundle, media, expectedRevision, paths = resolveAzuraPaths()) {
  // Capture a validated snapshot before waiting; callers cannot mutate queued input.
  bundle = structuredClone(bundle); media = structuredClone(media);
  validateRoomDetailPageContent(roomKey, bundle, media);
  return enqueueRoomWrite(async () => {
    const current = await readRoomDetailContent(roomKey, paths);
    if (roomDetailRevision(roomKey, {translations:current.translations, tours:current.tours}, current.media) !== expectedRevision) throw new RoomDetailContentError("Oda içeriği başka bir kayıtla değişti.", 409);
    const next = {...current, ...bundle, media};
    validateRoomDetailContent(roomKey, next);
    await validateRoomDetailImages(media, paths);
    await writeRoomDetailAtomically(roomKey, next, paths);
    return {bundle, media, revision:roomDetailRevision(roomKey, bundle, media)};
  });
}
