import { LOCALES, resolveAzuraPaths } from "./azura-homepage-storage.mjs";
import {
  enqueueRoomsWrite, inspectRoomImagePath, readRoomsContent, roomsRevisionFor,
  RoomsContentError, writeRoomsAtomically,
} from "./azura-rooms-storage.mjs";

const INTRO_LIMITS = Object.freeze({
  header: 250, buttonText1: 120, buttonText2: 120, buttonText3: 120,
  subtitle: 200, title: 250, text: 2000, checkin: 120, checkout: 120,
});
const CARD_LIMITS = Object.freeze({ title: 250, subtitle: 2000, m: 120, view: 200, buttonText: 120 });
const PARALLAX_LIMITS = Object.freeze({
  subtitle: 200, title: 250, text: 2000,
  feature1: 250, desc1: 2000, feature2: 250, desc2: 2000,
  feature3: 250, desc3: 2000, feature4: 250, desc4: 2000,
});
const PARALLAX_STORE_KEYS = Object.freeze({
  feature1: "span1", desc1: "text1", feature2: "span2", desc2: "text2",
  feature3: "span3", desc3: "text3", feature4: "span4", desc4: "text4",
});
const CARD_KEYS = Object.freeze(["deluxe", "family", "fantasy"]);

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) {
    throw new RoomsContentError(`${label} beklenen biçimde değil.`);
  }
}

function validateTextFields(value, limits, label) {
  exactKeys(value, Object.keys(limits), label);
  for (const [field, limit] of Object.entries(limits)) {
    const text = value[field];
    if (typeof text !== "string" || !text.trim() || text.length > limit || /[\u0000-\u001f\u007f]/.test(text)) {
      throw new RoomsContentError(`${label}.${field} geçersiz veya çok uzun.`);
    }
  }
}

function validateAltImage(value, label) {
  exactKeys(value, ["image", "translations"], label);
  exactKeys(value.translations, LOCALES, `${label}.translations`);
  for (const locale of LOCALES) {
    validateTextFields(value.translations[locale], { alt: 300 }, `${label}.translations.${locale}`);
  }
  if (typeof value.image !== "string") throw new RoomsContentError(`${label}.image geçersiz.`);
}

function validateStoredPageFields(content) {
  if (!content.hero || !content.intro || !content.parallax) {
    throw new RoomsContentError("Kalıcı rooms JSON'unda hero, intro veya parallax eksik; seed komutunu çalıştırın.", 503);
  }
  validateAltImage(content.hero, "hero");
  exactKeys(content.intro, LOCALES, "intro");
  for (const locale of LOCALES) validateTextFields(content.intro[locale], INTRO_LIMITS, `intro.${locale}`);
  exactKeys(content.parallax, ["image", "translations", "content"], "parallax");
  validateAltImage({ image: content.parallax.image, translations: content.parallax.translations }, "parallax");
  exactKeys(content.parallax.content, LOCALES, "parallax.content");
  const storedLimits = Object.fromEntries(Object.entries(PARALLAX_LIMITS).map(([key, limit]) =>
    [PARALLAX_STORE_KEYS[key] ?? key, limit]));
  for (const locale of LOCALES) {
    validateTextFields(content.parallax.content[locale], storedLimits, `parallax.content.${locale}`);
  }
}

function storedToBundle(content) {
  return Object.fromEntries(LOCALES.map((locale) => {
    const fields = { ...content.intro[locale] };
    content.cards.forEach((card, index) => {
      const text = card.translations[locale];
      fields[`RoomSection${index + 1}`] = {
        title: text.title, subtitle: text.text, m: text.area,
        view: text.view, buttonText: text.buttonText,
      };
    });
    fields.RoomsParallax = Object.fromEntries(Object.keys(PARALLAX_LIMITS).map((key) =>
      [key, content.parallax.content[locale][PARALLAX_STORE_KEYS[key] ?? key]]));
    return [locale, fields];
  }));
}

function storedToMedia(content) {
  return {
    hero: content.hero,
    cards: Object.fromEntries(content.cards.map((card) => [card.key, {
      primary: { image: card.primary.src, translations: card.primary.translations },
      secondary: { image: card.secondary.src, translations: card.secondary.translations },
    }])),
    parallax: { image: content.parallax.image, translations: content.parallax.translations },
  };
}

export function validateRoomsPagePayload(bundle, media) {
  exactKeys(bundle, LOCALES, "bundle");
  for (const locale of LOCALES) {
    const value = bundle[locale];
    exactKeys(value, [...Object.keys(INTRO_LIMITS), "RoomSection1", "RoomSection2", "RoomSection3", "RoomsParallax"],
      `bundle.${locale}`);
    validateTextFields(Object.fromEntries(Object.keys(INTRO_LIMITS).map((key) => [key, value[key]])),
      INTRO_LIMITS, `bundle.${locale}`);
    for (let index = 1; index <= 3; index++) {
      validateTextFields(value[`RoomSection${index}`], CARD_LIMITS, `bundle.${locale}.RoomSection${index}`);
    }
    validateTextFields(value.RoomsParallax, PARALLAX_LIMITS, `bundle.${locale}.RoomsParallax`);
  }
  exactKeys(media, ["hero", "cards", "parallax"], "media");
  validateAltImage(media.hero, "media.hero");
  validateAltImage(media.parallax, "media.parallax");
  exactKeys(media.cards, CARD_KEYS, "media.cards");
  for (const key of CARD_KEYS) {
    exactKeys(media.cards[key], ["primary", "secondary"], `media.cards.${key}`);
    validateAltImage(media.cards[key].primary, `media.cards.${key}.primary`);
    validateAltImage(media.cards[key].secondary, `media.cards.${key}.secondary`);
  }
  return { bundle, media };
}

function responseFromContent(content) {
  const bundle = storedToBundle(content);
  const media = storedToMedia(content);
  validateRoomsPagePayload(bundle, media);
  return { bundle, media, revision: roomsRevisionFor({ bundle, media }) };
}

async function validatePageImages(content, paths) {
  await inspectRoomImagePath(content.hero.image, paths);
  await inspectRoomImagePath(content.parallax.image, paths);
}

export async function readRoomsPageContent(paths = resolveAzuraPaths()) {
  const content = await readRoomsContent(paths);
  validateStoredPageFields(content);
  await validatePageImages(content, paths);
  return responseFromContent(content);
}

export async function readRoomsPageLocale(locale, paths = resolveAzuraPaths()) {
  if (!LOCALES.includes(locale)) throw new RoomsContentError(`Desteklenmeyen oda dili: ${locale}`);
  const content = await readRoomsContent(paths);
  validateStoredPageFields(content);
  await validatePageImages(content, paths);
  return {
    hero: { image: content.hero.image, ...content.intro[locale] },
    intro: content.intro[locale],
    parallax: { image: content.parallax.image, translations: content.parallax.content[locale] },
    cards: content.cards.map((card) => ({
      key: card.key,
      primary: { src: card.primary.src, width: card.primary.width, height: card.primary.height,
        alt: card.primary.translations[locale].alt },
      secondary: { src: card.secondary.src, width: card.secondary.width, height: card.secondary.height,
        alt: card.secondary.translations[locale].alt },
      ...card.translations[locale],
    })),
  };
}

export async function writeRoomsPageContent(bundle, media, expectedRevision, paths = resolveAzuraPaths()) {
  validateRoomsPagePayload(bundle, media);
  return enqueueRoomsWrite(async () => {
    const current = await readRoomsContent(paths);
    validateStoredPageFields(current);
    await validatePageImages(current, paths);
    if (responseFromContent(current).revision !== expectedRevision) {
      throw new RoomsContentError("Oda sayfası başka bir kayıtla değişti.", 409);
    }
    const info = {};
    for (const key of CARD_KEYS) {
      info[key] = {};
      for (const slot of ["primary", "secondary"]) {
        info[key][slot] = await inspectRoomImagePath(media.cards[key][slot].image, paths);
      }
    }
    await inspectRoomImagePath(media.hero.image, paths);
    await inspectRoomImagePath(media.parallax.image, paths);
    const next = {
      ...current,
      hero: media.hero,
      intro: Object.fromEntries(LOCALES.map((locale) => [locale,
        Object.fromEntries(Object.keys(INTRO_LIMITS).map((key) => [key, bundle[locale][key]]))])),
      parallax: {
        ...media.parallax,
        content: Object.fromEntries(LOCALES.map((locale) => [locale,
          Object.fromEntries(Object.keys(PARALLAX_LIMITS).map((key) =>
            [PARALLAX_STORE_KEYS[key] ?? key, bundle[locale].RoomsParallax[key]]))])),
      },
      cards: current.cards.map((card, index) => ({
        ...card,
        primary: { src: media.cards[card.key].primary.image,
          width: info[card.key].primary.width, height: info[card.key].primary.height,
          translations: media.cards[card.key].primary.translations },
        secondary: { src: media.cards[card.key].secondary.image,
          width: info[card.key].secondary.width, height: info[card.key].secondary.height,
          translations: media.cards[card.key].secondary.translations },
        translations: Object.fromEntries(LOCALES.map((locale) => [locale, {
          title: bundle[locale][`RoomSection${index + 1}`].title,
          text: bundle[locale][`RoomSection${index + 1}`].subtitle,
          area: bundle[locale][`RoomSection${index + 1}`].m,
          view: bundle[locale][`RoomSection${index + 1}`].view,
          buttonText: bundle[locale][`RoomSection${index + 1}`].buttonText,
        }])),
      })),
    };
    validateStoredPageFields(next);
    await writeRoomsAtomically(next, paths);
    return responseFromContent(next);
  });
}

export async function ensureRoomsPageFields(initial, paths = resolveAzuraPaths()) {
  return enqueueRoomsWrite(async () => {
    const current = await readRoomsContent(paths);
    const missing = ["hero", "intro", "parallax"].filter((key) => current[key] === undefined);
    if (!missing.length) return current;
    const next = { ...current };
    for (const key of missing) next[key] = initial[key];
    validateStoredPageFields(next);
    await validatePageImages(next, paths);
    await writeRoomsAtomically(next, paths);
    return next;
  });
}
