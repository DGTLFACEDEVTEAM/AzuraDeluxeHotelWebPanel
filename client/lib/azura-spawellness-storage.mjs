import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, open, readFile, realpath, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { LOCALES, parseIfMatch, resolveAzuraPaths } from "./azura-homepage-storage.mjs";
import { inspectHomepageImage, MAX_IMAGE_BYTES } from "./azura-homepage-media.mjs";

export const SPA_GALLERY_IDS = Object.freeze(Array.from({ length: 5 }, (_, i) => `spa-gallery-${i + 1}`));
export const SPA_MASSAGE_IDS = Object.freeze(["aromatic", "oriental", "classic", "facial"].map(key => `spa-massage-${key}`));
const GROUP_FIELDS = ["subtitle", "title", "text"];
const LIST_FIELDS = Array.from({ length: 7 }, (_, i) => `list${i + 1}`);

export class SpaWellnessContentError extends Error {
  constructor(message, status = 400) { super(message); this.name = "SpaWellnessContentError"; this.status = status; }
}

function keys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).length !== expected.length || expected.some(key => !Object.hasOwn(value, key))) {
    throw new SpaWellnessContentError(`${label}: eksik veya geçersiz alan.`);
  }
}

function text(value, label, max = 4000) {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new SpaWellnessContentError(`${label}: geçersiz metin.`);
  }
}

function texts(value, fields, label) {
  keys(value, fields, label);
  for (const field of fields) text(value[field], `${label}.${field}`);
}

function image(record, label, collection = false) {
  keys(record, [...(collection ? ["id", "order"] : []), "image", "width", "height", "translations"], label);
  if (typeof record.image !== "string" ||
      !/^\/uploads\/pages\/spawellness\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.(jpg|jpeg|png|webp)$/i.test(record.image) ||
      record.image.includes("..")) throw new SpaWellnessContentError(`${label}: geçersiz görsel yolu.`);
  if (!Number.isInteger(record.width) || !Number.isInteger(record.height) || record.width <= 0 ||
      record.height <= 0 || record.width * record.height > 16_000_000) {
    throw new SpaWellnessContentError(`${label}: geçersiz görsel ölçüsü.`);
  }
  keys(record.translations, LOCALES, `${label}.translations`);
  for (const locale of LOCALES) {
    keys(record.translations[locale], ["alt"], `${label}.${locale}`);
    text(record.translations[locale].alt, `${label}.${locale}.alt`, 300);
  }
}

function collection(value, ids, label) {
  keys(value, ["images"], label);
  if (!Array.isArray(value.images) || value.images.length !== ids.length) {
    throw new SpaWellnessContentError(`${label}: tam ${ids.length} görsel zorunludur.`);
  }
  value.images.forEach((record, index) => {
    image(record, `${label}.${index}`, true);
    if (record.id !== ids[index] || record.order !== index) {
      throw new SpaWellnessContentError(`${label}: kimlik veya sıra geçersiz.`);
    }
  });
}

export function validateSpaWellnessContent(content) {
  if (!content || typeof content !== "object" || Array.isArray(content) ||
      !["schemaVersion", "pageKey", "translations", "media"].every(key => Object.hasOwn(content, key))) {
    throw new SpaWellnessContentError("Spa kök alanları eksik veya geçersiz.");
  }
  if (content.schemaVersion !== 1 || content.pageKey !== "spawellness") {
    throw new SpaWellnessContentError("Spa şeması veya sayfa anahtarı geçersiz.");
  }
  keys(content.translations, LOCALES, "translations");
  for (const locale of LOCALES) {
    const t = content.translations[locale];
    keys(t, ["hero", "info", "gallery", "massage", "types"], locale);
    texts(t.hero, GROUP_FIELDS, `${locale}.hero`);
    keys(t.info, ["intro", "wellness", "sauna"], `${locale}.info`);
    texts(t.info.intro, GROUP_FIELDS, `${locale}.info.intro`);
    texts(t.info.sauna, GROUP_FIELDS, `${locale}.info.sauna`);
    texts(t.info.wellness, [...GROUP_FIELDS, ...LIST_FIELDS], `${locale}.info.wellness`);
    texts(t.gallery, GROUP_FIELDS, `${locale}.gallery`);
    keys(t.massage, [...GROUP_FIELDS, "time", "cards"], `${locale}.massage`);
    for (const field of [...GROUP_FIELDS, "time"]) text(t.massage[field], `${locale}.massage.${field}`);
    keys(t.massage.cards, SPA_MASSAGE_IDS, `${locale}.massage.cards`);
    for (const id of SPA_MASSAGE_IDS) texts(t.massage.cards[id], ["title"], `${locale}.massage.cards.${id}`);
    keys(t.types, ["indoor", "turkishBath"], `${locale}.types`);
    for (const key of ["indoor", "turkishBath"]) texts(t.types[key], GROUP_FIELDS, `${locale}.types.${key}`);
  }
  const m = content.media;
  keys(m, ["hero", "info", "gallery", "massage", "types"], "media");
  image(m.hero, "hero");
  keys(m.info, ["wellness", "sauna"], "media.info");
  for (const key of ["wellness", "sauna"]) image(m.info[key], `media.info.${key}`);
  collection(m.gallery, SPA_GALLERY_IDS, "gallery");
  collection(m.massage, SPA_MASSAGE_IDS, "massage");
  keys(m.types, ["indoor", "turkishBath"], "media.types");
  for (const key of ["indoor", "turkishBath"]) image(m.types[key], `media.types.${key}`);
  return content;
}

export function spaWellnessImages(media) {
  return [media.hero, media.info.wellness, media.info.sauna, ...media.gallery.images,
    ...media.massage.images, media.types.indoor, media.types.turkishBath];
}

export function spaWellnessFile(paths = resolveAzuraPaths()) {
  return path.join(paths.contentRoot, "site-pages", "spawellness.json");
}

export async function readSpaWellnessContent(paths = resolveAzuraPaths()) {
  let content;
  try { content = JSON.parse(await readFile(spaWellnessFile(paths), "utf8")); }
  catch (error) { throw new SpaWellnessContentError(`Azura spawellness verisi okunamadı: ${spaWellnessFile(paths)} (${error.message})`); }
  validateSpaWellnessContent(content);
  await validateSpaWellnessImages(content.media, paths);
  return content;
}

async function validateSpaWellnessImages(media, paths) {
  // Reused media is decoded once per read; every record still has its dimensions checked.
  const inspected = new Map();
  for (const record of spaWellnessImages(media)) {
    let handle;
    try {
      let actual = inspected.get(record.image);
      if (!actual) {
        const root = await realpath(paths.uploadsRoot);
        const file = path.join(paths.uploadsRoot, record.image.slice("/uploads/".length));
        if (await realpath(path.dirname(file)) !== path.join(root, "pages", "spawellness")) throw new Error("Güvenli olmayan dizin");
        handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
        const stat = await handle.stat();
        if (!stat.isFile() || stat.size > MAX_IMAGE_BYTES) throw new Error("Geçersiz dosya");
        const ext = path.extname(file).toLowerCase();
        const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
        actual = await inspectHomepageImage(await handle.readFile(), mime);
        inspected.set(record.image, actual);
      }
      if (actual.width !== record.width || actual.height !== record.height) throw new Error("Gerçek ölçüler JSON ile eşleşmiyor");
    } catch (error) { throw new SpaWellnessContentError(`Spa görseli okunamadı: ${record.image} (${error.message})`); }
    finally { if (handle) await handle.close(); }
  }
}

export async function readSpaWellnessPageLocale(locale, paths = resolveAzuraPaths()) {
  if (!LOCALES.includes(locale)) throw new SpaWellnessContentError(`Desteklenmeyen spa dili: ${locale}`);
  const content = await readSpaWellnessContent(paths);
  const texts = content.translations[locale];
  const localize = r => ({ src: r.image, width: r.width, height: r.height, alt: r.translations[locale].alt });
  const m = content.media;
  return { texts, images: {
    hero: localize(m.hero),
    info: { wellness: localize(m.info.wellness), sauna: localize(m.info.sauna) },
    gallery: m.gallery.images.map(r => ({ id: r.id, order: r.order, ...localize(r) })),
    // Titles and media meet by stable identity, never by independent array indexes.
    massage: m.massage.images.map(r => ({ id: r.id, order: r.order, ...localize(r), title: texts.massage.cards[r.id].title })),
    types: { indoor: localize(m.types.indoor), turkishBath: localize(m.types.turkishBath) },
  } };
}

let spaWellnessWriteQueue = Promise.resolve();

export function validateSpaWellnessPageContent(bundle, media) {
  validateSpaWellnessContent({ schemaVersion: 1, pageKey: "spawellness", translations: bundle, media });
  return { bundle, media };
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function spaWellnessPageRevision(bundle, media) {
  validateSpaWellnessPageContent(bundle, media);
  return createHash("sha256").update(canonicalJson({ bundle, media })).digest("hex");
}

export async function readSpaWellnessPageContent(paths = resolveAzuraPaths()) {
  const content = await readSpaWellnessContent(paths);
  const bundle = content.translations;
  const { media } = content;
  return { bundle, media, revision: spaWellnessPageRevision(bundle, media) };
}

async function writeSpaWellnessAtomically(content, paths) {
  const target = spaWellnessFile(paths);
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

function enqueueSpaWellnessWrite(operation) {
  const result = spaWellnessWriteQueue.then(operation, operation);
  spaWellnessWriteQueue = result.then(() => undefined, () => undefined);
  return result;
}

export async function writeSpaWellnessPageContent(bundle, media, expectedRevision, paths = resolveAzuraPaths()) {
  validateSpaWellnessPageContent(bundle, media);
  return enqueueSpaWellnessWrite(async () => {
    const current = await readSpaWellnessContent(paths);
    if (spaWellnessPageRevision(current.translations, current.media) !== expectedRevision) {
      throw new SpaWellnessContentError("Spa & Wellness sayfası başka bir kayıtla değişti.", 409);
    }
    const next = { ...current, translations: bundle, media };
    validateSpaWellnessContent(next);
    await validateSpaWellnessImages(media, paths);
    await writeSpaWellnessAtomically(next, paths);
    return { bundle, media, revision: spaWellnessPageRevision(bundle, media) };
  });
}

export function parseSpaWellnessIfMatch(value) {
  return parseIfMatch(value);
}

