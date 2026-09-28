import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['tr','en','de','ru'],
  defaultLocale: 'tr',
  localeDetection: true,
  localePrefix: 'always',

  pathnames: {
    "/news": "/news",
    "/news/[slug]": "/news/[slug]",
    '/': { tr:'/', en:'/', de:'/', ru:'/' },

    '/contact': { en:'/contact', de:'/kontakt', tr:'/iletisim', ru:'/kontakti' },

    '/beachpools': { en:'/beach-pool', de:'/strand-pool', tr:'/plaj-havuz', ru:'/plaj-basseyn' },

    // Liste sayfası
    '/rooms': { en:'/rooms', de:'/zimmer', tr:'/odalar', ru:'/nomera' },

    // ❗ Alt sayfalar rooms altında olmalı
    '/rooms/deluxeroom': {
      en:'/rooms/deluxeroom',
      de:'/zimmer/deluxezimmer',
      tr:'/odalar/deluxeoda',
      ru:'/nomera/номерделюкс'
    },

    '/rooms/familyroom': {
      en:'/rooms/familyroom',
      de:'/zimmer/familienzimmer',
      tr:'/odalar/aileoda',
      ru:'/nomera/номерсемейный'
    },

    '/rooms/familyswimup': {
      en:'/rooms/familyswimup',
      de:'/zimmer/familienzimmer-schwimmbad', // istersen kısaltırız
      tr:'/odalar/ailehavuz',
      ru:'/nomera/номерсемейныйswimup'
    },

    '/rooms/fantasyroom': {
      en:'/rooms/fantasyroom',
      de:'/zimmer/fantasiezimmer',
      tr:'/odalar/fantazioda',
      ru:'/nomera/номерфэнтези'
    },

    '/rooms/handicaproom': {
      en:'/rooms/handicaproom',
      de:'/zimmer/barrierefreieszimmer',
      tr:'/odalar/engellioda',
      ru:'/nomera/номерделюксдляинвалидов'
    }
  }
});
