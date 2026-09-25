import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  canonicalJson,
  enqueuePageWrite,
  writePageAtomically,
} from "./azura-page-storage.mjs";

import {
  LOCALES,
  resolveAzuraPaths,
} from "./azura-homepage-storage.mjs";

import {
  createPageValidators,
  validatePageImageFiles,
} from "./azura-page-content-validation.mjs";


export const ENTERTAINMENT_ACTIVITY_IDS = Object.freeze([
  "daytime",
  "nighttime",
]);

export const ENTERTAINMENT_GRID_IDS = Object.freeze([
  "sport-fitness",
  "kids-teen-club",
  "water-sports",
  "beach-activities",
  "table-tennis",
  "water-gymnastics",
  "step-aerobics",
  "stage-shows",
  "darts-boccia",
]);


// Mevcut bağlantıları korur.
// URL'ler panelden düzenlenebilir içerik değildir.
export const ENTERTAINMENT_GRID_LINKS = Object.freeze({
  "sport-fitness": "/spor",
  "kids-teen-club": "/kidsclub",
  "water-sports": "/beachpools",
  "beach-activities": "/beachpools",
  "table-tennis": "/spor",
  "water-gymnastics": "/beachpools",
  "step-aerobics": "/spor",
  "stage-shows": "/entertainment",
  "darts-boccia": "/spor",
});


export const ENTERTAINMENT_GRID_CATEGORY_KEYS = Object.freeze({
  "sport-fitness": "daytime",
  "kids-teen-club": "daytime",
  "water-sports": "daytime",
  "beach-activities": "daytime",
  "table-tennis": "daytime",
  "water-gymnastics": "daytime",
  "step-aerobics": "nighttime",
  "stage-shows": "nighttime",
  "darts-boccia": "daytime",
});


const ACTIVITIES_KEYS = Object.freeze([
  "subtitle",
  "title",
  "text",
  "span1",
  "span2",
  "daytime",
  "nighttime",
]);


const GRID_KEYS = Object.freeze([
  "subtitle",
  "title",
  "text",

  "title1",
  "text1",

  "title2",
  "text2",

  "title3",
  "text3",

  "title4",
  "text4",

  "title5",
  "text5",

  "title6",
  "text6",

  "title7",
  "text7",

  "title8",
  "text8",

  "title9",
  "text9",

  "daytime",
  "nighttime",
]);


export class EntertainmentContentError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "EntertainmentContentError";
    this.status = status;
  }
}


const {
  keys,
  texts,
  image,
} = createPageValidators(
  "entertainment",
  EntertainmentContentError
);


/**
 * entertainment.json sözleşmesini doğrular.
 */
export function validateEntertainmentContent(content) {
  // Root metadata is preserved; managed translations/media retain exact schemas.
  if (
    !content ||
    content.schemaVersion !== 1 ||
    content.pageKey !== "entertainment"
  ) {
    throw new EntertainmentContentError(
      "Geçersiz Entertainment sayfası kimliği."
    );
  }


  /*
   * TRANSLATIONS
   */
  keys(
    content.translations,
    LOCALES,
    "translations"
  );

  for (const locale of LOCALES) {
    const translation = content.translations[locale];

    keys(
      translation,
      ["activities", "gridSection"],
      locale
    );

    texts(
      translation.activities,
      ACTIVITIES_KEYS,
      `${locale}.activities`
    );

    texts(
      translation.gridSection,
      GRID_KEYS,
      `${locale}.gridSection`
    );
  }


  /*
   * MEDIA
   */
  const media = content.media;

  keys(
    media,
    [
      "hero",
      "activities",
      "gridSection",
    ],
    "media"
  );


  /*
   * Hero CSS background.
   *
   * Alt text kullanılmadığı için translations beklenmez.
   * id/order da yoktur.
   */
  image(
    media.hero,
    "hero",
    false,
    false
  );


  /*
   * Activities:
   * daytime → 0
   * nighttime → 1
   */
  if (
    !Array.isArray(media.activities) ||
    media.activities.length !==
      ENTERTAINMENT_ACTIVITY_IDS.length
  ) {
    throw new EntertainmentContentError(
      "Entertainment activities medya listesi geçersiz."
    );
  }

  ENTERTAINMENT_ACTIVITY_IDS.forEach(
    (id, index) => {
      const record = media.activities[index];

      image(
        record,
        `activities.${id}`,
        true
      );

      if (
        record.id !== id ||
        record.order !== index
      ) {
        throw new EntertainmentContentError(
          `Geçersiz Entertainment activity kimliği/sırası: ${id}`
        );
      }
    }
  );


  /*
   * Grid:
   * 9 sabit kart, order 0 → 8.
   */
  if (
    !Array.isArray(media.gridSection) ||
    media.gridSection.length !==
      ENTERTAINMENT_GRID_IDS.length
  ) {
    throw new EntertainmentContentError(
      "Entertainment grid medya listesi geçersiz."
    );
  }

  ENTERTAINMENT_GRID_IDS.forEach(
    (id, index) => {
      const record = media.gridSection[index];

      image(
        record,
        `gridSection.${id}`,
        true
      );

      if (
        record.id !== id ||
        record.order !== index
      ) {
        throw new EntertainmentContentError(
          `Geçersiz Entertainment grid kimliği/sırası: ${id}`
        );
      }
    }
  );


  return content;
}


/**
 * Sayfada kullanılan bütün medya kayıtlarını tek liste halinde döndürür.
 *
 * 1 hero
 * 2 activities
 * 9 grid
 *
 * Toplam: 12 medya kullanımı.
 */
export function entertainmentImages(media) {
  return [
    media.hero,
    ...media.activities,
    ...media.gridSection,
  ];
}


/**
 * Kalıcı JSON dosyasının fiziksel yolu.
 */
export function entertainmentFile(
  paths = resolveAzuraPaths()
) {
  return path.join(
    paths.contentRoot,
    "site-pages/entertainment.json"
  );
}


/**
 * JSON dosyasını okur, şemayı ve fiziksel medya dosyalarını doğrular.
 */
export async function readEntertainmentContent(
  paths = resolveAzuraPaths()
) {
  let content;

  try {
    content = JSON.parse(
      await readFile(
        entertainmentFile(paths),
        "utf8"
      )
    );
  } catch (error) {
    throw new EntertainmentContentError(
      `Entertainment okunamadı: ${entertainmentFile(paths)} (${error.message})`
    );
  }

  validateEntertainmentContent(content);

  await validatePageImageFiles(
    entertainmentImages(content.media),
    "entertainment",
    paths,
    EntertainmentContentError
  );

  return content;
}


/**
 * Gerçek /entertainment sayfasının kullanacağı locale bazlı veri.
 */
export async function readEntertainmentPageLocale(
  locale,
  paths = resolveAzuraPaths()
) {
  if (!LOCALES.includes(locale)) {
    throw new EntertainmentContentError(
      "Geçersiz dil."
    );
  }

  const content =
    await readEntertainmentContent(paths);

  const translation =
    content.translations[locale];

  const media =
    content.media;


  const localize = (record) => ({
    src: record.image,
    width: record.width,
    height: record.height,

    ...(record.translations
      ? {
          alt:
            record.translations[locale].alt,
        }
      : {}),
  });


  const activities =
    ENTERTAINMENT_ACTIVITY_IDS.map(
      (id, index) => {
        const mediaItem =
          media.activities[index];

        const isDaytime =
          id === "daytime";

        return {
          id,
          order: index,

          img: localize(mediaItem),

          span: isDaytime
            ? translation.activities.span1
            : translation.activities.span2,

          title:
            translation.activities[id],
        };
      }
    );


  const cards =
    ENTERTAINMENT_GRID_IDS.map(
      (id, index) => {
        const number = index + 1;

        return {
          id,
          order: index,

          img: localize(
            media.gridSection[index]
          ),

          title:
            translation.gridSection[
              `title${number}`
            ],

          description:
            translation.gridSection[
              `text${number}`
            ],

          category:
            translation.gridSection[
              ENTERTAINMENT_GRID_CATEGORY_KEYS[
                id
              ]
            ],

          link:
            ENTERTAINMENT_GRID_LINKS[id],
        };
      }
    );


  return {
    texts: translation,

    images: {
      hero: localize(media.hero),
    },

    activities,

    cards,
  };
}


/**
 * Panel concurrency kontrolü için revision.
 *
 * Revision JSON'a yazılmaz.
 * Sadece doğrulanmış bundle + media üzerinden üretilir.
 */
export function entertainmentPageRevision(
  bundle,
  media
) {
  validateEntertainmentContent({
    schemaVersion: 1,
    pageKey: "entertainment",
    translations: bundle,
    media,
  });

  return createHash("sha256")
    .update(
      canonicalJson({
        bundle,
        media,
      })
    )
    .digest("hex");
}


/**
 * Yönetim API'sindeki GET için.
 */
export async function readEntertainmentPageContent(
  paths = resolveAzuraPaths()
) {
  const content =
    await readEntertainmentContent(paths);

  return {
    bundle: content.translations,
    media: content.media,
    revision: entertainmentPageRevision(
      content.translations,
      content.media
    ),
  };
}


/**
 * Yönetim API'sindeki PUT için.
 *
 * API route henüz eklenmese bile storage sözleşmesi hazır olur.
 */
export async function writeEntertainmentPageContent(
  bundle,
  media,
  expectedRevision,
  paths = resolveAzuraPaths()
) {
  /*
   * Incoming payload queue alınmadan önce doğrulanır.
   */
  const revision =
    entertainmentPageRevision(
      bundle,
      media
    );


  return enqueuePageWrite(
    entertainmentFile(paths),

    async () => {
      /*
       * Kuyruk içerisindeyken mevcut dosya yeniden okunur.
       */
      const current =
        await readEntertainmentContent(paths);


      const currentRevision =
        entertainmentPageRevision(
          current.translations,
          current.media
        );


      if (
        currentRevision !==
        expectedRevision
      ) {
        throw new EntertainmentContentError(
          "Entertainment sayfası başka bir kayıtla değişti.",
          409
        );
      }


      /*
       * Sadece translations ve media değiştirilir.
       * schemaVersion/pageKey ve ileride eklenebilecek diğer
       * root alanları korunur.
       */
      const next = {
        ...current,
        translations: bundle,
        media,
      };


      validateEntertainmentContent(next);


      await validatePageImageFiles(
        entertainmentImages(media),
        "entertainment",
        paths,
        EntertainmentContentError
      );


      await writePageAtomically(
        next,
        entertainmentFile(paths)
      );


      return {
        bundle,
        media,
        revision,
      };
    }
  );
}