import { canonicalJson, writePageAtomically } from "./azura-page-storage.mjs";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { LOCALES, parseIfMatch, resolveAzuraPaths } from "./azura-homepage-storage.mjs";
import { createPageValidators, validatePageImageFiles } from "./azura-page-content-validation.mjs";

export const SPA_GALLERY_IDS = Object.freeze(Array.from({ length: 5 }, (_, i) => `spa-gallery-${i + 1}`));
export const SPA_MASSAGE_IDS = Object.freeze(["aromatic", "oriental", "classic", "facial"].map(key => `spa-massage-${key}`));
const GROUP_FIELDS = ["subtitle", "title", "text"];
const LIST_FIELDS = Array.from({ length: 7 }, (_, i) => `list${i + 1}`);

export class SpaWellnessContentError extends Error {
  constructor(message, status = 400) { super(message); this.name = "SpaWellnessContentError"; this.status = status; }
}

const { keys, text, texts, image, collection } = createPageValidators("spawellness", SpaWellnessContentError);

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
  await validatePageImageFiles(spaWellnessImages(media), "spawellness", paths, SpaWellnessContentError, "Spa");
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
    await writePageAtomically(next, spaWellnessFile(paths));
    return { bundle, media, revision: spaWellnessPageRevision(bundle, media) };
  });
}

export function parseSpaWellnessIfMatch(value) {
  return parseIfMatch(value);
}

