import { createHash } from "node:crypto";
import { canonicalJson, enqueuePageWrite, writePageAtomically } from "./azura-page-storage.mjs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { LOCALES, resolveAzuraPaths } from "./azura-homepage-storage.mjs";
import { createPageValidators, validatePageImageFiles } from "./azura-page-content-validation.mjs";

export const SPOR_GALLERY_IDS = Object.freeze(["spor-gallery-1", "spor-gallery-2", "spor-gallery-3"]);
export const SPOR_LIST_FIELDS = Object.freeze(["list1", "list2", "list3", "list4"]);
const GROUP_FIELDS = ["subtitle", "title", "text"];
const TYPE_FIELDS = { fitness: GROUP_FIELDS, personalTrainer: ["title", "text"] };
export class SporContentError extends Error {
  constructor(message, status = 400) { super(message); this.name = "SporContentError"; this.status = status; }
}
const { keys, texts, image, collection } = createPageValidators("spor", SporContentError);

export function validateSporContent(content) {
  if (!content || content.schemaVersion !== 1 || content.pageKey !== "spor") throw new SporContentError("Geçersiz Spor sayfa kimliği veya şeması.");
  keys(content.translations, LOCALES, "translations");
  for (const locale of LOCALES) {
    const t = content.translations[locale];
    keys(t, ["hero", "info", "gallery", "types"], locale);
    texts(t.hero, GROUP_FIELDS, `${locale}.hero`);
    keys(t.info, ["intro", "wellness", "sauna"], `${locale}.info`);
    texts(t.info.intro, GROUP_FIELDS, `${locale}.info.intro`);
    texts(t.info.sauna, GROUP_FIELDS, `${locale}.info.sauna`);
    texts(t.info.wellness, [...GROUP_FIELDS, ...SPOR_LIST_FIELDS], `${locale}.info.wellness`);
    texts(t.gallery, GROUP_FIELDS, `${locale}.gallery`);
    keys(t.types, Object.keys(TYPE_FIELDS), `${locale}.types`);
    for (const [key, fields] of Object.entries(TYPE_FIELDS)) texts(t.types[key], fields, `${locale}.types.${key}`);
  }
  const m = content.media;
  keys(m, ["hero", "info", "gallery", "types"], "media");
  image(m.hero, "media.hero");
  keys(m.info, ["wellness", "sauna"], "media.info");
  for (const key of ["wellness", "sauna"]) image(m.info[key], `media.info.${key}`);
  collection(m.gallery, SPOR_GALLERY_IDS, "media.gallery");
  keys(m.types, Object.keys(TYPE_FIELDS), "media.types");
  for (const key of Object.keys(TYPE_FIELDS)) image(m.types[key], `media.types.${key}`);
  return content;
}
export function sporImages(media) {
  return [media.hero, media.info.wellness, media.info.sauna, ...media.gallery.images, media.types.fitness, media.types.personalTrainer];
}
export function sporFile(paths = resolveAzuraPaths()) {
  return path.join(paths.contentRoot, "site-pages", "spor.json");
}
export async function readSporContent(paths = resolveAzuraPaths()) {
  let content;
  try { content = JSON.parse(await readFile(sporFile(paths), "utf8")); }
  catch (error) { throw new SporContentError(`Azura Spor verisi okunamadı: ${sporFile(paths)} (${error.message})`); }
  validateSporContent(content);
  await validatePageImageFiles(sporImages(content.media), "spor", paths, SporContentError);
  return content;
}
export async function readSporPageLocale(locale, paths = resolveAzuraPaths()) {
  if (!LOCALES.includes(locale)) throw new SporContentError(`Desteklenmeyen Spor dili: ${locale}`);
  const content = await readSporContent(paths);
  const localize = r => ({ src: r.image, width: r.width, height: r.height, alt: r.translations[locale].alt });
  const m = content.media;
  return { texts: content.translations[locale], images: {
    hero: localize(m.hero),
    info: { wellness: localize(m.info.wellness), sauna: localize(m.info.sauna) },
    gallery: m.gallery.images.map(r => ({ id: r.id, order: r.order, ...localize(r) })),
    types: { fitness: localize(m.types.fitness), personalTrainer: localize(m.types.personalTrainer) },
  } };
}

export function sporPageRevision(bundle, media) {
  validateSporContent({ schemaVersion: 1, pageKey: "spor", translations: bundle, media });
  return createHash("sha256").update(canonicalJson({ bundle, media })).digest("hex");
}
export async function readSporPageContent(paths = resolveAzuraPaths()) {
  const content = await readSporContent(paths);
  return { bundle: content.translations, media: content.media, revision: sporPageRevision(content.translations, content.media) };
}
export async function writeSporPageContent(bundle, media, expectedRevision, paths = resolveAzuraPaths()) {
  // Validate incoming shape before acquiring the queue; current JSON is read only inside it.
  const revision = sporPageRevision(bundle, media);
  return enqueuePageWrite(sporFile(paths), async () => {
    const current = await readSporContent(paths);
    if (sporPageRevision(current.translations, current.media) !== expectedRevision) {
      throw new SporContentError("Spor sayfası başka bir kayıtla değişti.", 409);
    }
    const next = { ...current, translations: bundle, media };
    validateSporContent(next);
    await validatePageImageFiles(sporImages(media), "spor", paths, SporContentError);
    await writePageAtomically(next, sporFile(paths));
    return { bundle, media, revision };
  });
}
