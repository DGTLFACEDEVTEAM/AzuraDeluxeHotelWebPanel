import { createHash } from "node:crypto";
import { canonicalJson, enqueuePageWrite, writePageAtomically } from "./azura-page-storage.mjs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { LOCALES, resolveAzuraPaths } from "./azura-homepage-storage.mjs";
import { createPageValidators, validatePageImageFiles } from "./azura-page-content-validation.mjs";
export const BEACH_ACTIVITY_IDS = Object.freeze(["activity1", "activity2", "activity3", "activity4"]);
export const BEACH_POOL_IDS = Object.freeze(["main", "indoor", "kids", "aqua", "indoorKids"]);
const GROUP = ["subtitle", "title", "text"];
export class BeachPoolsContentError extends Error {
  constructor(message, status = 400) { super(message); this.name = "BeachPoolsContentError"; this.status = status; }
}
const { keys, texts, image } = createPageValidators("beachpools", BeachPoolsContentError);
function identity(record, id, order) {
  if (record.id !== id || record.order !== order) throw new BeachPoolsContentError(`Geçersiz kart kimliği/sırası: ${id}`);
}
export function validateBeachPoolsContent(content) {
  if (!content || content.schemaVersion !== 1 || content.pageKey !== "beachpools") throw new BeachPoolsContentError("Geçersiz Beach & Pools kimliği.");
  keys(content.translations, LOCALES, "translations");
  for (const locale of LOCALES) {
    const t = content.translations[locale];
    keys(t, ["hero", "info", "activities", "video", "pools"], locale);
    texts(t.hero, GROUP, `${locale}.hero`);
    texts(t.info, [...GROUP, "span", "list1", "list2", "list3"], `${locale}.info`);
    texts(t.video, GROUP, `${locale}.video`);
    for (const [section, ids, fields] of [["activities", BEACH_ACTIVITY_IDS, ["title", "span"]], ["pools", BEACH_POOL_IDS, [...GROUP, "outdoor", "area", "depth"]]]) {
      keys(t[section], [...GROUP, "cards"], `${locale}.${section}`);
      texts(Object.fromEntries(GROUP.map(k => [k, t[section][k]])), GROUP, `${locale}.${section}`);
      keys(t[section].cards, ids, `${locale}.${section}.cards`);
      for (const id of ids) texts(t[section].cards[id], fields, `${locale}.${section}.${id}`);
    }
  }
  const m = content.media;
  keys(m, ["hero", "info", "activities", "pools"], "media");
  keys(m.hero, ["desktopBackground"], "media.hero");
  image(m.hero.desktopBackground, "hero.desktopBackground", false, false);
  keys(m.info, ["primary", "secondary"], "media.info");
  for (const k of ["primary", "secondary"]) image(m.info[k], `info.${k}`);
  keys(m.activities, BEACH_ACTIVITY_IDS, "activities");
  BEACH_ACTIVITY_IDS.forEach((id, i) => { image(m.activities[id], id, true); identity(m.activities[id], id, i); });
  keys(m.pools, BEACH_POOL_IDS, "pools");
  BEACH_POOL_IDS.forEach((id, i) => {
    const record = m.pools[id]; keys(record, ["id", "order", "image", "hover"], id); identity(record, id, i);
    image(record.image, `${id}.image`); image(record.hover, `${id}.hover`, false, false);
  });
  return content;
}
export function beachPoolsImages(m) {
  return [m.hero.desktopBackground, m.info.primary, m.info.secondary, ...BEACH_ACTIVITY_IDS.map(id => m.activities[id]), ...BEACH_POOL_IDS.flatMap(id => [m.pools[id].image, m.pools[id].hover])];
}
export function beachPoolsFile(paths = resolveAzuraPaths()) { return path.join(paths.contentRoot, "site-pages/beachpools.json"); }
export async function readBeachPoolsContent(paths = resolveAzuraPaths()) {
  let c;
  try { c = JSON.parse(await readFile(beachPoolsFile(paths), "utf8")); }
  catch (e) { throw new BeachPoolsContentError(`Beach & Pools okunamadı: ${beachPoolsFile(paths)} (${e.message})`); }
  validateBeachPoolsContent(c);
  await validatePageImageFiles(beachPoolsImages(c.media), "beachpools", paths, BeachPoolsContentError);
  return c;
}
export async function readBeachPoolsPageLocale(locale, paths = resolveAzuraPaths()) {
  if (!LOCALES.includes(locale)) throw new BeachPoolsContentError("Geçersiz dil.");
  const c = await readBeachPoolsContent(paths), t = c.translations[locale], m = c.media;
  const localize = r => ({ src: r.image, width: r.width, height: r.height, ...(r.translations ? { alt: r.translations[locale].alt } : {}) });
  return { texts: t, images: { hero: localize(m.hero.desktopBackground), info: { primary: localize(m.info.primary), secondary: localize(m.info.secondary) } },
    slides: BEACH_ACTIVITY_IDS.map(id => ({ id, src: localize(m.activities[id]), alt: m.activities[id].translations[locale].alt, ...t.activities.cards[id] })),
    poolItems: BEACH_POOL_IDS.map(id => { const r = t.pools.cards[id]; return { id, src: localize(m.pools[id].image), hoverSrc: localize(m.pools[id].hover), alt: m.pools[id].image.translations[locale].alt, subtitle: r.subtitle, title: r.title, description: r.text, icontext: r.outdoor, icontext2: r.area, icontext3: r.depth }; }),
  };
}

export function beachPoolsPageRevision(bundle, media) {
  validateBeachPoolsContent({ schemaVersion: 1, pageKey: "beachpools", translations: bundle, media });
  return createHash("sha256").update(canonicalJson({ bundle, media })).digest("hex");
}
export async function readBeachPoolsPageContent(paths = resolveAzuraPaths()) {
  const content = await readBeachPoolsContent(paths);
  return { bundle: content.translations, media: content.media, revision: beachPoolsPageRevision(content.translations, content.media) };
}
export async function writeBeachPoolsPageContent(bundle, media, expectedRevision, paths = resolveAzuraPaths()) {
  // Validate incoming shape before acquiring the queue; current JSON is read only inside it.
  const revision = beachPoolsPageRevision(bundle, media);
  return enqueuePageWrite(beachPoolsFile(paths), async () => {
    const current = await readBeachPoolsContent(paths);
    if (beachPoolsPageRevision(current.translations, current.media) !== expectedRevision) {
      throw new BeachPoolsContentError("BeachPools sayfası başka bir kayıtla değişti.", 409);
    }
    const next = { ...current, translations: bundle, media };
    validateBeachPoolsContent(next);
    await validatePageImageFiles(beachPoolsImages(media), "beachpools", paths, BeachPoolsContentError);
    await writePageAtomically(next, beachPoolsFile(paths));
    return { bundle, media, revision };
  });
}
