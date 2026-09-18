import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, open, readFile, realpath, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { LOCALES, parseIfMatch, resolveAzuraPaths } from "./azura-homepage-storage.mjs";
import { inspectHomepageImage, MAX_IMAGE_BYTES } from "./azura-homepage-media.mjs";

export class AboutContentError extends Error {
  constructor(message, status = 400) { super(message); this.name = "AboutContentError"; this.status = status; }
}

function keys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).length !== expected.length || expected.some((key) => !Object.hasOwn(value, key))) {
    throw new AboutContentError(`${label}: eksik veya geçersiz alan.`);
  }
}

function texts(value, fields, label) {
  keys(value, fields, label);
  for (const field of fields) {
    if (typeof value[field] !== "string" || !value[field].trim() || value[field].length > 4000 ||
        /[\u0000-\u001f\u007f]/.test(value[field])) throw new AboutContentError(`${label}.${field}: geçersiz metin.`);
  }
}

function image(record, label, moment = false) {
  keys(record, [...(moment ? ["id", "order"] : []), "image", "width", "height", "translations"], label);
  if (typeof record.image !== "string" ||
      !/^\/uploads\/pages\/about\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.(jpg|jpeg|png|webp)$/i.test(record.image) ||
      record.image.includes("..")) throw new AboutContentError(`${label}: geçersiz görsel yolu.`);
  if (!Number.isInteger(record.width) || !Number.isInteger(record.height) || record.width <= 0 ||
      record.height <= 0 || record.width * record.height > 16_000_000) {
    throw new AboutContentError(`${label}: geçersiz görsel ölçüsü.`);
  }
  keys(record.translations, LOCALES, `${label}.translations`);
  for (const locale of LOCALES) {
    texts(record.translations[locale], ["alt"], `${label}.${locale}`);
    if (record.translations[locale].alt.length > 300) throw new AboutContentError(`${label}: alt çok uzun.`);
  }
}

export function aboutImages(media) {
  return [media.hero, media.location, ...media.moments.images, media.missionVision.mission, media.missionVision.vision];
}

export function validateAboutContent(content) {
  if (!content || typeof content !== "object" || Array.isArray(content) ||
      !["schemaVersion", "pageKey", "translations", "media"].every(key => Object.hasOwn(content, key))) {
    throw new AboutContentError("About kök alanları eksik veya geçersiz.");
  }
  if (content.schemaVersion !== 1 || content.pageKey !== "about") throw new AboutContentError("About şeması veya sayfa anahtarı geçersiz.");
  keys(content.translations, LOCALES, "translations");
  for (const locale of LOCALES) {
    const t = content.translations[locale];
    keys(t, ["hero", "location", "missionVision"], locale);
    texts(t.hero, ["subtitle", "title"], `${locale}.hero`);
    texts(t.location, ["subtitle", "title", "text", "buttonText"], `${locale}.location`);
    keys(t.missionVision, ["subtitle", "title", "text", "mission", "vision"], `${locale}.missionVision`);
    const { subtitle, title, text } = t.missionVision;
    texts({ subtitle, title, text }, ["subtitle", "title", "text"], `${locale}.missionVision`);
    for (const key of ["mission", "vision"]) texts(t.missionVision[key], ["subtitle", "title", "text"], `${locale}.${key}`);
  }
  const m = content.media;
  keys(m, ["hero", "location", "moments", "missionVision"], "media");
  image(m.hero, "hero"); image(m.location, "location");
  keys(m.moments, ["images"], "moments");
  if (!Array.isArray(m.moments.images) || m.moments.images.length !== 4) throw new AboutContentError("Dört moments görseli zorunludur.");
  m.moments.images.forEach((record, index) => {
    image(record, `moments.${index}`, true);
    if (record.id !== `about-moment-${index + 1}` || record.order !== index) throw new AboutContentError("Moments görsel sırası geçersiz.");
  });
  keys(m.missionVision, ["mission", "vision"], "media.missionVision");
  image(m.missionVision.mission, "mission"); image(m.missionVision.vision, "vision");
  return content;
}

export function aboutFile(paths = resolveAzuraPaths()) {
  return path.join(paths.contentRoot, "site-pages", "about.json");
}

export async function readAboutContent(paths = resolveAzuraPaths()) {
  let content;
  try { content = JSON.parse(await readFile(aboutFile(paths), "utf8")); }
  catch (error) { throw new AboutContentError(`Azura about verisi okunamadı: ${aboutFile(paths)} (${error.message})`); }
  validateAboutContent(content);
  await validateAboutImages(content.media, paths);
  return content;
}

async function validateAboutImages(media, paths) {
  for (const record of aboutImages(media)) {
    let handle;
    try {
      const root = await realpath(paths.uploadsRoot);
      const file = path.join(paths.uploadsRoot, record.image.slice("/uploads/".length));
      if (await realpath(path.dirname(file)) !== path.join(root, "pages", "about")) throw new Error("Güvenli olmayan dizin");
      handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > MAX_IMAGE_BYTES) throw new Error("Geçersiz dosya");
      const ext = path.extname(file).toLowerCase();
      const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
      const actual = await inspectHomepageImage(await handle.readFile(), mime);
      if (actual.width !== record.width || actual.height !== record.height) throw new Error("Gerçek ölçüler JSON ile eşleşmiyor");
    } catch (error) { throw new AboutContentError(`About görseli okunamadı: ${record.image} (${error.message})`); }
    finally { if (handle) await handle.close(); }
  }
}

export async function readAboutPageLocale(locale, paths = resolveAzuraPaths()) {
  if (!LOCALES.includes(locale)) throw new AboutContentError(`Desteklenmeyen about dili: ${locale}`);
  const content = await readAboutContent(paths);
  const localize = (r) => ({ src: r.image, width: r.width, height: r.height, alt: r.translations[locale].alt });
  const m = content.media;
  return { texts: content.translations[locale], images: {
    hero: localize(m.hero), location: localize(m.location), moments: m.moments.images.map(localize),
    missionVision: { mission: localize(m.missionVision.mission), vision: localize(m.missionVision.vision) },
  } };
}

let aboutWriteQueue = Promise.resolve();

export function validateAboutPageContent(bundle, media) {
  validateAboutContent({ schemaVersion: 1, pageKey: "about", translations: bundle, media });
  return { bundle, media };
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function aboutPageRevision(bundle, media) {
  validateAboutPageContent(bundle, media);
  return createHash("sha256").update(canonicalJson({ bundle, media })).digest("hex");
}

export async function readAboutPageContent(paths = resolveAzuraPaths()) {
  const content = await readAboutContent(paths);
  const bundle = content.translations;
  const { media } = content;
  return { bundle, media, revision: aboutPageRevision(bundle, media) };
}

async function writeAboutAtomically(content, paths) {
  const target = aboutFile(paths);
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

function enqueueAboutWrite(operation) {
  const result = aboutWriteQueue.then(operation, operation);
  aboutWriteQueue = result.then(() => undefined, () => undefined);
  return result;
}

export async function writeAboutPageContent(bundle, media, expectedRevision, paths = resolveAzuraPaths()) {
  validateAboutPageContent(bundle, media);
  return enqueueAboutWrite(async () => {
    const current = await readAboutContent(paths);
    if (aboutPageRevision(current.translations, current.media) !== expectedRevision) {
      throw new AboutContentError("Hakkımızda sayfası başka bir kayıtla değişti.", 409);
    }
    const next = { ...current, translations: bundle, media };
    validateAboutContent(next);
    await validateAboutImages(media, paths);
    await writeAboutAtomically(next, paths);
    return { bundle, media, revision: aboutPageRevision(bundle, media) };
  });
}

export function parseAboutIfMatch(value) {
  return parseIfMatch(value);
}

