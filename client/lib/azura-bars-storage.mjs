import { createHash } from "node:crypto";
import { canonicalJson, enqueuePageWrite, writePageAtomically } from "./azura-page-storage.mjs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { LOCALES, resolveAzuraPaths } from "./azura-homepage-storage.mjs";
import { createPageValidators, validatePageImageFiles } from "./azura-page-content-validation.mjs";
export const BAR_IDS = Object.freeze(["lobbyPiano", "chacha", "pier", "lyricSnack"]);
// Preserve existing, currently unrendered destinations; no editable URL fields.
export const BAR_LINKS = Object.freeze({ lobbyPiano: "/bars/lobby-piano-bar", chacha: "/bars/chacha-pool-bar", pier: "/bars/pier-bar", lyricSnack: "/bars/pier-bar" });
const GROUP = ["subtitle", "title", "text"];
export class BarsContentError extends Error {
  constructor(message, status = 400) { super(message); this.name = "BarsContentError"; this.status = status; }
}
const { keys, texts, text, image } = createPageValidators("bars", BarsContentError);
export function validateBarsContent(c) {
  if (!c || c.schemaVersion !== 1 || c.pageKey !== "bars") throw new BarsContentError("Geçersiz Barlar kimliği.");
  keys(c.translations, LOCALES, "translations");
  for (const locale of LOCALES) {
    const t = c.translations[locale];
    keys(t, ["hero", "culinaryInfo", "featureBackgrounds", "bars", "discover"], locale);
    for (const section of ["hero", "culinaryInfo", "discover"]) texts(t[section], GROUP, `${locale}.${section}`);
    keys(t.featureBackgrounds, ["bars"], "featureBackgrounds"); texts(t.featureBackgrounds.bars, GROUP, "featureBackgrounds.bars");
    keys(t.bars, [...GROUP, "cards"], "bars"); for (const field of GROUP) text(t.bars[field], `bars.${field}`);
    keys(t.bars.cards, BAR_IDS, "bars.cards"); for (const id of BAR_IDS) texts(t.bars.cards[id], GROUP, `bars.cards.${id}`);
  }
  const m = c.media; keys(m, ["hero", "culinaryInfo", "featureBackgrounds", "bars", "discover"], "media");
  image(m.hero, "hero", false, false); image(m.discover, "discover", false, false);
  keys(m.featureBackgrounds, ["bars"], "featureBackgrounds"); image(m.featureBackgrounds.bars, "featureBackgrounds.bars", false, false);
  keys(m.culinaryInfo, ["primary", "secondary"], "culinaryInfo");
  image(m.culinaryInfo.primary, "culinaryInfo.primary"); image(m.culinaryInfo.secondary, "culinaryInfo.secondary");
  keys(m.bars, BAR_IDS, "bars");
  BAR_IDS.forEach((id, i) => { image(m.bars[id], id, true); if (m.bars[id].id !== id || m.bars[id].order !== i) throw new BarsContentError(`Geçersiz kart kimliği/sırası: ${id}`); });
  return c;
}
export function barsImages(m) { return [m.hero, m.culinaryInfo.primary, m.culinaryInfo.secondary, m.featureBackgrounds.bars, ...BAR_IDS.map(id => m.bars[id]), m.discover]; }
export function barsFile(paths = resolveAzuraPaths()) { return path.join(paths.contentRoot, "site-pages/bars.json"); }
export async function readBarsContent(paths = resolveAzuraPaths()) {
  let c;
  try { c = JSON.parse(await readFile(barsFile(paths), "utf8")); }
  catch (e) { throw new BarsContentError(`Barlar okunamadı: ${barsFile(paths)} (${e.message})`); }
  validateBarsContent(c); await validatePageImageFiles(barsImages(c.media), "bars", paths, BarsContentError); return c;
}
export async function readBarsPageLocale(locale, paths = resolveAzuraPaths()) {
  if (!LOCALES.includes(locale)) throw new BarsContentError("Geçersiz dil.");
  const c = await readBarsContent(paths), t = c.translations[locale], m = c.media;
  const localize = r => ({ src: r.image, width: r.width, height: r.height, ...(r.translations ? { alt: r.translations[locale].alt } : {}) });
  return { texts: t, images: { hero: localize(m.hero), primary: localize(m.culinaryInfo.primary), secondary: localize(m.culinaryInfo.secondary), background: localize(m.featureBackgrounds.bars), discover: localize(m.discover) },
    cards: BAR_IDS.map(id => ({ id, img: localize(m.bars[id]), title: t.bars.cards[id].title, description: t.bars.cards[id].subtitle, text: t.bars.cards[id].text, link: BAR_LINKS[id] })),
  };
}

export function barsPageRevision(bundle, media) {
  validateBarsContent({ schemaVersion: 1, pageKey: "bars", translations: bundle, media });
  return createHash("sha256").update(canonicalJson({ bundle, media })).digest("hex");
}
export async function readBarsPageContent(paths = resolveAzuraPaths()) {
  const content = await readBarsContent(paths);
  return { bundle: content.translations, media: content.media, revision: barsPageRevision(content.translations, content.media) };
}
export async function writeBarsPageContent(bundle, media, expectedRevision, paths = resolveAzuraPaths()) {
  // Validate incoming shape before acquiring the queue; current JSON is read only inside it.
  const revision = barsPageRevision(bundle, media);
  return enqueuePageWrite(barsFile(paths), async () => {
    const current = await readBarsContent(paths);
    if (barsPageRevision(current.translations, current.media) !== expectedRevision) {
      throw new BarsContentError("Bars sayfası başka bir kayıtla değişti.", 409);
    }
    const next = { ...current, translations: bundle, media };
    validateBarsContent(next);
    await validatePageImageFiles(barsImages(media), "bars", paths, BarsContentError);
    await writePageAtomically(next, barsFile(paths));
    return { bundle, media, revision };
  });
}
