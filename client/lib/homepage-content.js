import "server-only";

import { LOCALES, readHomepageContent } from "./azura-homepage-storage.mjs";
import { contactEmailHref, contactPhoneHref, readSharedContactDetails } from "./azura-shared-contact-storage.mjs";

const CAROUSEL_LINKS = Object.freeze({
  accommodation: "/rooms",
  restaurants: "/restaurants",
  beachPools: "/beachpools",
  experiences: "/entertainment",
  kids: "/kidsclub",
});
const ACCOMMODATION_LINKS = Object.freeze({
  deluxe: "/rooms/deluxeroom",
  fantasy: "/rooms/fantasyroom",
  family: "/rooms/familyroom",
});

export async function readHomepageExperience(locale) {
  if (!LOCALES.includes(locale)) {
    throw new Error(`Azura homepage için desteklenmeyen dil: ${locale}`);
  }

  const [{ experience, experienceText, welcomeText, sections }, { details }] = await Promise.all([
    readHomepageContent(), readSharedContactDetails(),
  ]);
  if (!experienceText) {
    throw new Error("Azura homepage experienceText alanı kalıcı JSON'da eksik.");
  }
  if (!welcomeText) {
    throw new Error("Azura homepage welcomeText alanı kalıcı JSON'da eksik.");
  }
  if (!sections?.essentials) {
    throw new Error("Azura homepage sections.essentials alanı kalıcı JSON'da eksik.");
  }
  if (!sections?.carousel) {
    throw new Error("Azura homepage sections.carousel alanı kalıcı JSON'da eksik.");
  }
  if (!sections?.accommodation) {
    throw new Error("Azura homepage sections.accommodation alanı kalıcı JSON'da eksik.");
  }
  if (!sections?.background) {
    throw new Error("Azura homepage sections.background alanı kalıcı JSON'da eksik.");
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
    welcomeText: welcomeText[locale],
    essentials: sections.essentials[locale],
    carouselSlides: sections.carousel.slides.map((slide) => ({
      src: slide.image,
      title: slide.translations[locale].title,
      alt: slide.translations[locale].alt,
      link: CAROUSEL_LINKS[slide.key],
    })),
    accommodation: {
      ...sections.accommodation.translations[locale],
      cards: sections.accommodation.cards.map((card) => ({
        src: card.image,
        title: card.translations[locale].title,
        desc: card.translations[locale].description,
        area: card.translations[locale].area,
        span: card.translations[locale].view,
        alt: card.translations[locale].alt,
        link: ACCOMMODATION_LINKS[card.key],
      })),
    },
    background: {
      image: sections.background.image,
      ...sections.background.translations[locale],
    },
    contact: {
      username: details.username,
      phone: details.phone,
      phoneHref: contactPhoneHref(details.phone),
      callCenter: details.callCenter,
      callCenterHref: contactPhoneHref(details.callCenter),
      email: details.email,
      emailHref: contactEmailHref(details.email),
      instagramUrl: details.instagramUrl,
      facebookUrl: details.facebookUrl,
      youtubeUrl: details.youtubeUrl,
      reservationUrl: details.reservationUrl,
      ...details.translations[locale],
    },
  };
}
