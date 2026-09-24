import { createHash } from "node:crypto";
import { canonicalJson, enqueuePageWrite, writePageAtomically } from "./azura-page-storage.mjs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { LOCALES, resolveAzuraPaths } from "./azura-homepage-storage.mjs";
import { createPageValidators, validatePageImageFiles } from "./azura-page-content-validation.mjs";
export const KIDS_ACTIVITY_IDS = Object.freeze(["activity1", "activity2", "activity3", "activity4", "activity5"]);
export const KIDS_POOL_IDS = Object.freeze(["slide", "children", "indoor"]);
export const KIDS_MOMENT_IDS = Object.freeze(["kidsclub-moment-1", "kidsclub-moment-2", "kidsclub-moment-3"]);
export const KIDS_ICON_IDS = Object.freeze(["environment", "activities", "social", "staff"]);
const GROUP = ["subtitle", "title", "text"];
export class KidsClubContentError extends Error {
  constructor(message, status = 400) { super(message); this.name = "KidsClubContentError"; this.status = status; }
}
const { keys, texts, text, image, collection } = createPageValidators("kidsclub", KidsClubContentError);
export function validateKidsClubContent(c) {
  if (!c || c.schemaVersion !== 1 || c.pageKey !== "kidsclub") throw new KidsClubContentError("Geçersiz Kids Club kimliği.");
  keys(c.translations, LOCALES, "translations");
  for (const locale of LOCALES) {
    const t = c.translations[locale];
    keys(t, ["hero", "info", "icons", "activities", "pools", "moments"], locale);
    texts(t.hero, GROUP, `${locale}.hero`); texts(t.info, GROUP, `${locale}.info`);
    texts(t.icons, KIDS_ICON_IDS, `${locale}.icons`); texts(t.moments, ["title"], `${locale}.moments`);
    for (const [section, child, ids] of [["activities", "items", KIDS_ACTIVITY_IDS], ["pools", "cards", KIDS_POOL_IDS]]) {
      keys(t[section], [...GROUP, child], section);
      for (const field of GROUP) text(t[section][field], `${section}.${field}`);
      keys(t[section][child], ids, `${section}.${child}`);
    }
    for (const id of KIDS_POOL_IDS) texts(t.pools.cards[id], GROUP, `pools.${id}`);
    for (const id of KIDS_ACTIVITY_IDS) {
      const item = t.activities.items[id]; keys(item, ["title", "repeatTitle"], id); text(item.title, `${id}.title`);
      // The last two repeated slides were already captionless. Preserve that visible state.
      if (!(item.repeatTitle === "" && ["activity4", "activity5"].includes(id))) text(item.repeatTitle, `${id}.repeatTitle`);
    }
  }
  const m = c.media; keys(m, ["hero", "info", "activities", "pools", "moments"], "media");
  image(m.hero, "hero", false, false);
  keys(m.info, ["primary", "secondary"], "info");
  image(m.info.primary, "info.primary"); image(m.info.secondary, "info.secondary");
  keys(m.activities, ["items"], "activities");
  for (const [records, ids] of [[m.activities.items, KIDS_ACTIVITY_IDS], [m.pools, KIDS_POOL_IDS]]) {
    keys(records, ids, "cards");
    ids.forEach((id, i) => {
      image(records[id], id, true);
      if (records[id].id !== id || records[id].order !== i) throw new KidsClubContentError(`Geçersiz kimlik/sıra: ${id}`);
    });
  }
  collection(m.moments, KIDS_MOMENT_IDS, "moments");
  return c;
}
export function kidsClubImages(m) {
  return [m.hero, m.info.primary, m.info.secondary, ...KIDS_ACTIVITY_IDS.map(id => m.activities.items[id]), ...KIDS_POOL_IDS.map(id => m.pools[id]), ...m.moments.images];
}
export function kidsClubFile(paths = resolveAzuraPaths()) { return path.join(paths.contentRoot, "site-pages/kidsclub.json"); }
export async function readKidsClubContent(paths = resolveAzuraPaths()) {
  let c;
  try { c = JSON.parse(await readFile(kidsClubFile(paths), "utf8")); }
  catch (e) { throw new KidsClubContentError(`Kids Club okunamadı: ${kidsClubFile(paths)} (${e.message})`); }
  validateKidsClubContent(c);
  await validatePageImageFiles(kidsClubImages(c.media), "kidsclub", paths, KidsClubContentError);
  return c;
}
export async function readKidsClubPageLocale(locale, paths = resolveAzuraPaths()) {
  if (!LOCALES.includes(locale)) throw new KidsClubContentError("Geçersiz dil.");
  const c = await readKidsClubContent(paths), t = c.translations[locale], m = c.media;
  const localize = r => ({ src: r.image, width: r.width, height: r.height, ...(r.translations ? { alt: r.translations[locale].alt } : {}) });
  return {
    texts: t, images: { hero: localize(m.hero), info: { primary: localize(m.info.primary), secondary: localize(m.info.secondary) }, moments: m.moments.images.map(localize) },
    activities: KIDS_ACTIVITY_IDS.map(id => ({ id, image: localize(m.activities.items[id]), ...t.activities.items[id] })),
    pools: KIDS_POOL_IDS.map(id => ({ id, img: localize(m.pools[id]), title: t.pools.cards[id].title, description: t.pools.cards[id].subtitle, text: t.pools.cards[id].text })),
  };
}

export function kidsClubPageRevision(bundle, media) {
  validateKidsClubContent({ schemaVersion: 1, pageKey: "kidsclub", translations: bundle, media });
  return createHash("sha256").update(canonicalJson({ bundle, media })).digest("hex");
}
export async function readKidsClubPageContent(paths = resolveAzuraPaths()) {
  const content = await readKidsClubContent(paths);
  return { bundle: content.translations, media: content.media, revision: kidsClubPageRevision(content.translations, content.media) };
}
export async function writeKidsClubPageContent(bundle, media, expectedRevision, paths = resolveAzuraPaths()) {
  // Validate incoming shape before acquiring the queue; current JSON is read only inside it.
  const revision = kidsClubPageRevision(bundle, media);
  return enqueuePageWrite(kidsClubFile(paths), async () => {
    const current = await readKidsClubContent(paths);
    if (kidsClubPageRevision(current.translations, current.media) !== expectedRevision) {
      throw new KidsClubContentError("KidsClub sayfası başka bir kayıtla değişti.", 409);
    }
    const next = { ...current, translations: bundle, media };
    validateKidsClubContent(next);
    await validatePageImageFiles(kidsClubImages(media), "kidsclub", paths, KidsClubContentError);
    await writePageAtomically(next, kidsClubFile(paths));
    return { bundle, media, revision };
  });
}
