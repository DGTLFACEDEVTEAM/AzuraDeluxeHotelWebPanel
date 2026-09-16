import "server-only";

import { LOCALES, readHomepageContent } from "./azura-homepage-storage.mjs";

export async function readHomepageExperience(locale) {
  if (!LOCALES.includes(locale)) {
    throw new Error(`Azura homepage için desteklenmeyen dil: ${locale}`);
  }

  const { experience, experienceText } = await readHomepageContent();
  if (!experienceText) {
    throw new Error("Azura homepage experienceText alanı kalıcı JSON'da eksik.");
  }

  return {
    backgroundImage: {
      src: experience.background.image,
      alt: experience.background.translations[locale].alt,
    },
    foregroundImage: {
      src: experience.foreground.image,
      alt: experience.foreground.translations[locale].alt,
    },
    experienceText: experienceText[locale],
  };
}
