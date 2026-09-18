import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, open, readFile, realpath, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { inspectHomepageImage } from "./azura-homepage-media.mjs";
import { LOCALES, parseIfMatch, resolveAzuraPaths } from "./azura-homepage-storage.mjs";

export const RESTAURANT_CAROUSEL_KEYS = Object.freeze({
  alacarteCarousel: ["orchestra", "bellaAzura", "ottoman"],
  dessertsCarousel: ["patisserie", "mazurka", "lyric"],
});
const IMAGE_PATH = /^\/uploads\/pages\/restaurants\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.(?:jpg|jpeg|png|webp)$/i;
const SECTION_KEYS = ["hero", "intro", "mainRestaurant", "alacarteCarousel", "reverse", "dessertsCarousel", "discover"];
let restaurantsWriteQueue = Promise.resolve();

export class RestaurantsContentError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "RestaurantsContentError";
    this.status = status;
  }
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) {
    throw new RestaurantsContentError(`${label} beklenen biçimde değil.`);
  }
}

function text(value, label, allowEmpty = false) {
  if (typeof value !== "string" || (!allowEmpty && !value.trim()) || value.length > 4000 ||
      /[\u0000-\u001f\u007f]/.test(value)) {
    throw new RestaurantsContentError(`${label} geçersiz veya çok uzun.`);
  }
}

function fields(value, keys, label, empty = []) {
  exactKeys(value, keys, label);
  for (const key of keys) text(value[key], `${label}.${key}`, empty.includes(key));
}

function carousel(value, key, label) {
  exactKeys(value, ["subtitle", "title", "text", "cards"], label);
  for (const field of ["subtitle", "title", "text"]) text(value[field], `${label}.${field}`);
  exactKeys(value.cards, RESTAURANT_CAROUSEL_KEYS[key], `${label}.cards`);
  for (const cardKey of RESTAURANT_CAROUSEL_KEYS[key]) {
    fields(value.cards[cardKey], ["title", "subtitle", "text"], `${label}.cards.${cardKey}`);
  }
}

function image(value, label) {
  exactKeys(value, ["image", "width", "height", "translations"], label);
  if (typeof value.image !== "string" || !IMAGE_PATH.test(value.image) || value.image.includes("..")) {
    throw new RestaurantsContentError(`${label}.image geçersiz.`);
  }
  if (!Number.isInteger(value.width) || !Number.isInteger(value.height) || value.width <= 0 ||
      value.height <= 0 || value.width * value.height > 16_000_000) {
    throw new RestaurantsContentError(`${label} görsel ölçüleri geçersiz.`);
  }
  exactKeys(value.translations, LOCALES, `${label}.translations`);
  for (const locale of LOCALES) {
    fields(value.translations[locale], ["alt"], `${label}.translations.${locale}`);
    if (value.translations[locale].alt.length > 300) {
      throw new RestaurantsContentError(`${label}.translations.${locale}.alt çok uzun.`);
    }
  }
}

export function restaurantsImages(media) {
  return [
    media.hero,
    media.intro.primary, media.intro.secondary,
    media.mainRestaurant,
    ...RESTAURANT_CAROUSEL_KEYS.alacarteCarousel.map((key) => media.alacarteCarousel.cards[key]),
    media.reverse.primary, media.reverse.secondary,
    ...RESTAURANT_CAROUSEL_KEYS.dessertsCarousel.map((key) => media.dessertsCarousel.cards[key]),
    media.discover,
  ];
}

export function validateRestaurantsContent(content) {
  if (!content || typeof content !== "object" || Array.isArray(content) ||
      !["schemaVersion", "pageKey", "translations", "media"].every((key) => Object.hasOwn(content, key))) {
    throw new RestaurantsContentError("restaurants beklenen biçimde değil.");
  }
  if (content.schemaVersion !== 1 || content.pageKey !== "restaurants") {
    throw new RestaurantsContentError("Restoran şema sürümü veya sayfa anahtarı geçersiz.");
  }
  exactKeys(content.translations, LOCALES, "translations");
  for (const locale of LOCALES) {
    const value = content.translations[locale];
    exactKeys(value, SECTION_KEYS, `translations.${locale}`);
    fields(value.hero, ["subtitle", "title", "text"], `translations.${locale}.hero`);
    fields(value.intro, ["subtitle", "title", "text", "span", "list1"],
      `translations.${locale}.intro`, ["subtitle"]);
    fields(value.mainRestaurant, ["subtitle", "title", "text", "span", "list1", "list2", "list3"],
      `translations.${locale}.mainRestaurant`);
    carousel(value.alacarteCarousel, "alacarteCarousel", `translations.${locale}.alacarteCarousel`);
    fields(value.reverse, ["span", "title", "text", "text2"], `translations.${locale}.reverse`, ["span"]);
    carousel(value.dessertsCarousel, "dessertsCarousel", `translations.${locale}.dessertsCarousel`);
    fields(value.discover, ["subtitle", "title", "text"], `translations.${locale}.discover`);
  }
  exactKeys(content.media, SECTION_KEYS, "media");
  image(content.media.hero, "media.hero");
  exactKeys(content.media.intro, ["primary", "secondary"], "media.intro");
  image(content.media.intro.primary, "media.intro.primary");
  image(content.media.intro.secondary, "media.intro.secondary");
  image(content.media.mainRestaurant, "media.mainRestaurant");
  for (const key of Object.keys(RESTAURANT_CAROUSEL_KEYS)) {
    exactKeys(content.media[key], ["cards"], `media.${key}`);
    exactKeys(content.media[key].cards, RESTAURANT_CAROUSEL_KEYS[key], `media.${key}.cards`);
    for (const cardKey of RESTAURANT_CAROUSEL_KEYS[key]) {
      image(content.media[key].cards[cardKey], `media.${key}.cards.${cardKey}`);
    }
  }
  exactKeys(content.media.reverse, ["primary", "secondary"], "media.reverse");
  image(content.media.reverse.primary, "media.reverse.primary");
  image(content.media.reverse.secondary, "media.reverse.secondary");
  image(content.media.discover, "media.discover");
  return content;
}

export function validateRestaurantsPageContent(bundle, media) {
  validateRestaurantsContent({ schemaVersion: 1, pageKey: "restaurants", translations: bundle, media });
  return { bundle, media };
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function restaurantsPageRevision(bundle, media) {
  validateRestaurantsPageContent(bundle, media);
  return createHash("sha256").update(canonicalJson({ bundle, media })).digest("hex");
}

export function restaurantsFile(paths = resolveAzuraPaths()) {
  return path.join(paths.contentRoot, "site-pages", "restaurants.json");
}

async function inspectImage(record, paths, root) {
  const file = path.join(paths.uploadsRoot, record.image.slice("/uploads/".length));
  try {
    if (await realpath(path.dirname(file)) !== path.join(root, "pages", "restaurants")) {
      throw new Error("outside restaurants uploads");
    }
  } catch {
    throw new RestaurantsContentError(`Restoran görsel dizini bulunamadı veya güvenli değil: ${record.image}`);
  }
  const extension = path.extname(file).toLowerCase();
  const mimeType = extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" :
    extension === ".png" ? "image/png" : "image/webp";
  let handle;
  let actual;
  try {
    handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
    if (!(await handle.stat()).isFile()) throw new Error("not a file");
    actual = await inspectHomepageImage(await handle.readFile(), mimeType);
  } catch {
    throw new RestaurantsContentError(`Restoran görseli eksik, sahte veya bozuk: ${record.image}`);
  } finally {
    if (handle) await handle.close();
  }
  if (actual.width !== record.width || actual.height !== record.height) {
    throw new RestaurantsContentError(`Restoran görselinin gerçek ölçüleri JSON ile eşleşmiyor: ${record.image}`);
  }
}

export async function readRestaurantsContent(paths = resolveAzuraPaths()) {
  let content;
  try {
    content = JSON.parse(await readFile(restaurantsFile(paths), "utf8"));
  } catch (error) {
    throw new RestaurantsContentError(`Azura restaurants verisi okunamadı: ${restaurantsFile(paths)} (${error.message})`);
  }
  validateRestaurantsContent(content);
  let root;
  try {
    root = await realpath(paths.uploadsRoot);
  } catch (error) {
    throw new RestaurantsContentError(`Azura restoran görsel kökü okunamadı: ${paths.uploadsRoot} (${error.message})`);
  }
  for (const record of restaurantsImages(content.media)) await inspectImage(record, paths, root);
  return content;
}

export async function readRestaurantsPageContent(paths = resolveAzuraPaths()) {
  const content = await readRestaurantsContent(paths);
  const bundle = content.translations;
  const { media } = content;
  return { bundle, media, revision: restaurantsPageRevision(bundle, media) };
}

async function writeRestaurantsAtomically(content, paths) {
  const target = restaurantsFile(paths);
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

function enqueueRestaurantsWrite(operation) {
  const result = restaurantsWriteQueue.then(operation, operation);
  restaurantsWriteQueue = result.then(() => undefined, () => undefined);
  return result;
}

export async function writeRestaurantsPageContent(bundle, media, expectedRevision, paths = resolveAzuraPaths()) {
  validateRestaurantsPageContent(bundle, media);
  return enqueueRestaurantsWrite(async () => {
    const current = await readRestaurantsContent(paths);
    if (restaurantsPageRevision(current.translations, current.media) !== expectedRevision) {
      throw new RestaurantsContentError("Restoran sayfası başka bir kayıtla değişti.", 409);
    }
    const next = { ...current, translations: bundle, media };
    validateRestaurantsContent(next);
    const root = await realpath(paths.uploadsRoot);
    for (const record of restaurantsImages(media)) await inspectImage(record, paths, root);
    await writeRestaurantsAtomically(next, paths);
    return { bundle, media, revision: restaurantsPageRevision(bundle, media) };
  });
}

export function parseRestaurantsIfMatch(value) {
  return parseIfMatch(value);
}

export async function readRestaurantsPageLocale(locale, paths = resolveAzuraPaths()) {
  if (!LOCALES.includes(locale)) throw new RestaurantsContentError(`Desteklenmeyen restoran dili: ${locale}`);
  const content = await readRestaurantsContent(paths);
  const localize = (record) => ({
    src: record.image, width: record.width, height: record.height,
    alt: record.translations[locale].alt,
  });
  const media = content.media;
  return {
    texts: content.translations[locale],
    images: {
      hero: localize(media.hero),
      intro: { primary: localize(media.intro.primary), secondary: localize(media.intro.secondary) },
      mainRestaurant: localize(media.mainRestaurant),
      alacarteCarousel: { cards: Object.fromEntries(RESTAURANT_CAROUSEL_KEYS.alacarteCarousel.map((key) =>
        [key, localize(media.alacarteCarousel.cards[key])])) },
      reverse: { primary: localize(media.reverse.primary), secondary: localize(media.reverse.secondary) },
      dessertsCarousel: { cards: Object.fromEntries(RESTAURANT_CAROUSEL_KEYS.dessertsCarousel.map((key) =>
        [key, localize(media.dessertsCarousel.cards[key])])) },
      discover: localize(media.discover),
    },
  };
}
