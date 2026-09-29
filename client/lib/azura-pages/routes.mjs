// Snapshot of actual app/[locale] static first segments. Tests detect route drift.
export const STATIC_SEGMENTS = Object.freeze(['about','bars','beachpools','certificates','connect','covid-19','entertainment','gallery','kidsclub','kvkk','news','ourpolicies','restaurants','rooms','spawellness','special','spor','sustainability','terms-of-use']);
export const RESERVED_SEGMENTS = Object.freeze(['panel','api','uploads','_next','_vercel','trpc','admin','tr','en','de','ru','iletisim','contact','kontakt','kontakti','beach-pool','strand-pool','plaj-havuz','plaj-basseyn','zimmer','odalar','nomera']);
export function normalizePageSlug(value,locale) {
 if(typeof value!=='string'||!['tr','en','de','ru'].includes(locale))throw new Error('Geçersiz slug/dil.');
 // Stored slugs are plain NFC text, never percent-encoded.
 const normalized=value.normalize('NFC').toLocaleLowerCase(locale);
 if(normalized.length>160||!/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u.test(normalized))throw new Error('Geçersiz tek segmentli slug.');
 return normalized;
}
export function reservedPageSlug(value,locale){const slug=normalizePageSlug(value,locale);return [...STATIC_SEGMENTS,...RESERVED_SEGMENTS].some(s=>s.toLocaleLowerCase(locale)===slug);}
export function dynamicPageHref(locale,slug){return `/${locale}/${encodeURIComponent(normalizePageSlug(slug,locale))}`;}
export function dynamicLocaleHref(state,pathname,locale){return state?.pathname===pathname&&state.slugs?.[locale]?dynamicPageHref(locale,state.slugs[locale]):null;}

// next-intl rewrites can leave an encoded Unicode segment in Next params.
export function decodeDynamicRouteSlug(value,locale){return normalizePageSlug(decodeURIComponent(value),locale);}
