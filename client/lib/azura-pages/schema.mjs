import {
  BLOCK_TYPES,
  validateBlock,
} from "./block-definitions.mjs";

export const PAGE_SCHEMA_VERSION = 1;
export const PAGE_TEMPLATE = "standard";
export const PAGE_LOCALES = ["tr", "en", "de", "ru"];
export const PAGE_STATUSES = ["draft", "published"];
export const PAGE_SECTION_TYPES = BLOCK_TYPES;

const SLUG_PATTERN = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;

function createId(prefix) {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createLocalizedValue(factory) {
  return PAGE_LOCALES.reduce((localized, locale) => {
    localized[locale] = factory(locale);
    return localized;
  }, {});
}

function createHeroTranslations() {
  return createLocalizedValue(() => ({
    eyebrow: "",
    title: "",
    imageAlt: "",
  }));
}

function createIntroSection(idFactory) {
  return {
    id: idFactory("intro"),
    type: "intro",
    enabled: true,
    translations: createLocalizedValue(() => ({
      eyebrow: "",
      title: "",
      text: "",
    })),
  };
}

function createImageTextSection(idFactory, imagePosition) {
  return {
    id: idFactory("image-text"),
    type: "imageText",
    enabled: true,
    image: "",
    imagePosition,
    translations: createLocalizedValue(() => ({
      eyebrow: "",
      title: "",
      text: "",
      imageAlt: "",
      buttonText: "",
      buttonHref: "",
    })),
  };
}

function createTwoAnimationImageSection(idFactory) {
  return {
    id: idFactory("two-animation-image"),
    type: "twoAnimationImage",
    enabled: true,
    backgroundImage: "",
    foregroundImage: "",
    translations: createLocalizedValue(() => ({
      eyebrow: "",
      title: "",
      text: "",
      text2: "",
      backgroundImageAlt: "",
      foregroundImageAlt: "",
      buttonText: "",
      buttonHref: "",
    })),
  };
}

function createOtherOptionsSection(idFactory) {
  return {
    id: idFactory("other-options"),
    type: "otherOptions",
    enabled: true,
    options: [],
    translations: createLocalizedValue(() => ({
      eyebrow: "",
      title: "",
      buttonText: "",
    })),
  };
}

function createSpaInfoSection(idFactory) {
  return {
    id: idFactory("spa-info"),
    type: "spaInfo",
    enabled: true,
    leftImage: "",
    rightImage: "",
    translations: createLocalizedValue(() => ({
      eyebrow: "",
      title: "",
      text: "",
      leftEyebrow: "",
      leftTitle: "",
      leftText: "",
      leftImageAlt: "",
      rightEyebrow: "",
      rightTitle: "",
      rightText: "",
      rightItems: "",
      rightImageAlt: "",
    })),
  };
}

function createGallerySection(idFactory) {
  return {
    id: idFactory("gallery"),
    type: "gallery",
    enabled: true,
    images: [],
    translations: createLocalizedValue(() => ({
      eyebrow: "",
      title: "",
      text: "",
    })),
  };
}

function createCarouselSection(idFactory) {
  return {
    id: idFactory("carousel"),
    type: "carousel",
    enabled: true,
    images: [],
    translations: createLocalizedValue(() => ({
      eyebrow: "",
      title: "",
      text: "",
    })),
  };
}

function createCallToActionSection(idFactory) {
  return {
    id: idFactory("call-to-action"),
    type: "callToAction",
    enabled: true,
    image: "",
    overlay: true,
    translations: createLocalizedValue(() => ({
      eyebrow: "",
      title: "",
      text: "",
      imageAlt: "",
      buttonText: "",
      buttonHref: "",
    })),
  };
}

function createCardCollectionSection(idFactory) {
  return {
    id: idFactory("card-collection"),
    type: "cardCollection",
    enabled: true,
    displayMode: "grid",
    cards: [],
    translations: createLocalizedValue(() => ({
      eyebrow: "",
      title: "",
      text: "",
    })),
  };
}

export function createPageGalleryImage(src = "", { idFactory = createId } = {}) {
  return {
    id: idFactory("gallery-image"),
    src,
    order: 0,
    translations: createLocalizedValue(() => ({ imageAlt: "" })),
  };
}

export function createPageCard(image = "", { idFactory = createId } = {}) {
  return {
    id: idFactory("card"),
    image,
    order: 0,
    translations: createLocalizedValue(() => ({
      title: "",
      text: "",
      imageAlt: "",
      buttonText: "",
      buttonHref: "",
    })),
  };
}

export function createPageOtherOption(image = "", { idFactory = createId } = {}) {
  return {
    id: idFactory("other-option"),
    image,
    order: 0,
    translations: createLocalizedValue(() => ({
      eyebrow: "",
      title: "",
      size: "",
      capacity: "",
      text: "",
      imageAlt: "",
      buttonHref: "",
    })),
  };
}

export function createPageSection(
  type,
  { idFactory = createId, imagePosition = "left" } = {}
) {
  if (type === "intro") {
    return createIntroSection(idFactory);
  }

  if (type === "imageText") {
    return createImageTextSection(idFactory, imagePosition);
  }

  if (type === "twoAnimationImage") {
    return createTwoAnimationImageSection(idFactory);
  }

  if (type === "spaInfo") {
    return createSpaInfoSection(idFactory);
  }

  if (type === "otherOptions") {
    return createOtherOptionsSection(idFactory);
  }

  if (type === "gallery") {
    return createGallerySection(idFactory);
  }

  if (type === "carousel") {
    return createCarouselSection(idFactory);
  }

  if (type === "callToAction") {
    return createCallToActionSection(idFactory);
  }

  if (type === "cardCollection") {
    return createCardCollectionSection(idFactory);
  }

  throw new Error(`Desteklenmeyen component tipi: ${type}.`);
}

export function createStandardPageDraft({ slugs = {}, idFactory = createId } = {}) {
  return {
    schemaVersion: PAGE_SCHEMA_VERSION,
    template: PAGE_TEMPLATE,
    slugs: createLocalizedValue((locale) => slugs[locale] || ""),
    status: "draft",
    showContactSection: true,
    hero: {
      image: "",
      overlay: true,
      translations: createHeroTranslations(),
    },
    navigation: {
      visible: true,
      order: 100,
      translations: createLocalizedValue(() => ({ label: "" })),
    },
    seo: createLocalizedValue(() => ({
      title: "",
      description: "",
    })),
    sections: [
      createPageSection("intro", { idFactory }),
      createPageSection("imageText", { idFactory, imagePosition: "left" }),
      createPageSection("imageText", { idFactory, imagePosition: "right" }),
    ],
    createdAt: null,
    updatedAt: null,
  };
}

export function getLocalizedContent(translations, locale, fallbackLocale = "tr") {
  if (!translations || typeof translations !== "object") {
    return {};
  }

  return translations[locale] || translations[fallbackLocale] || {};
}

export function validatePageDocument(page, { allowEmptySlugs = false } = {}) {
  const errors = [];

  if (!page || typeof page !== "object" || Array.isArray(page)) {
    return ["Sayfa verisi bir nesne olmalıdır."];
  }

  if (page.schemaVersion !== PAGE_SCHEMA_VERSION) {
    errors.push(`Desteklenmeyen şema sürümü: ${page.schemaVersion ?? "boş"}.`);
  }

  if (page.template !== PAGE_TEMPLATE) {
    errors.push(`Desteklenmeyen sayfa şablonu: ${page.template ?? "boş"}.`);
  }

  if (!page.slugs || typeof page.slugs !== "object" || Array.isArray(page.slugs)) {
    errors.push("Dört dilli slug verisi zorunludur.");
  } else {
    PAGE_LOCALES.forEach((locale) => {
      const slug = page.slugs[locale];

      const isLowercase =
        typeof slug === "string" && slug === slug.toLocaleLowerCase(locale);

      if (
        (!allowEmptySlugs || slug) &&
        (typeof slug !== "string" || !SLUG_PATTERN.test(slug) || !isLowercase)
      ) {
        errors.push(
          `${locale.toUpperCase()} slug yalnızca küçük harf, rakam ve tek tire ayırıcıları içermelidir.`
        );
      }
    });
  }

  if (!PAGE_STATUSES.includes(page.status)) {
    errors.push(`Geçersiz yayın durumu: ${page.status ?? "boş"}.`);
  }

  if (!Array.isArray(page.sections)) {
    errors.push("Sayfa bölümleri bir dizi olmalıdır.");
    return errors;
  }

  const sectionIds = new Set();

  page.sections.forEach((section, index) => {
    const label = `Bölüm ${index + 1}`;

    if (!section || typeof section !== "object") {
      errors.push(`${label} geçerli bir nesne olmalıdır.`);
      return;
    }

    if (!section.id || typeof section.id !== "string") {
      errors.push(`${label} için id zorunludur.`);
    } else if (sectionIds.has(section.id)) {
      errors.push(`${label} için tekrarlanan id kullanılmıştır: ${section.id}.`);
    } else {
      sectionIds.add(section.id);
    }

    validateBlock(section, page.template).forEach((error) => {
      errors.push(`${label} ${error}`);
    });
  });

  return errors;
}

export function findLocalizedSlugConflicts(pages, candidate, ignorePageId = null) {
  const conflicts = [];

  for (const locale of PAGE_LOCALES) {
    const candidateSlug = candidate?.slugs?.[locale];

    if (!candidateSlug) {
      continue;
    }

    const conflictingPage = pages.find(
      (page) => page.id !== ignorePageId && page?.slugs?.[locale] === candidateSlug
    );

    if (conflictingPage) {
      conflicts.push({
        locale,
        slug: candidateSlug,
        pageId: conflictingPage.id,
      });
    }
  }

  return conflicts;
}
