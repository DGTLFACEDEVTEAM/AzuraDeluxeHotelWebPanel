// Pure V3 model helpers; selected by the server-only contract setting.
import {BlogContentError, validBlogSlug, validateBlogRecord} from './azura-blog-schema.mjs';
import {LOCALES} from './azura-homepage-storage.mjs';
import {createPageValidators} from './azura-page-content-validation.mjs';
const {keys} = createPageValidators('blog', BlogContentError);
const fail = (message, status = 400) => { throw new BlogContentError(message, status); };
function localeCheck(locale) {
  if (!LOCALES.includes(locale)) fail('Geçersiz blog dili.');
}
function slugCheck(slug) {
  if (!validBlogSlug(slug)) fail('Geçersiz ziyaretçi slug değeri.');
}
export function validateBlogV3(record) {
  keys(record, ['storageVersion','slug','createdAt','updatedAt','publicationUpdatedAt','draft','published','aliases'], 'record');
  if (record.storageVersion !== 3) fail('Blog storageVersion 3 gerekli.');
  keys(record.aliases, LOCALES, 'aliases');
  for (const snapshot of [record.draft, record.published].filter(value => value !== null)) {
    keys(snapshot?.slugs, LOCALES, 'slugs');
    for (const locale of LOCALES) slugCheck(snapshot.slugs[locale]);
  }
  for (const locale of LOCALES) {
    const aliases = record.aliases[locale];
    if (!Array.isArray(aliases) || new Set(aliases).size !== aliases.length) fail('Geçersiz/tekrarlı alias.');
    for (const alias of aliases) {
      slugCheck(alias);
      if (alias === record.published?.slugs[locale]) fail('Güncel yayın adresi alias olamaz.');
    }
  }
  // Reuse every existing content, date, block and image-path rule without relaxing v2.
  const legacy = structuredClone(record);
  legacy.storageVersion = 2;
  delete legacy.aliases;
  for (const snapshot of [legacy.draft, legacy.published]) if (snapshot) delete snapshot.slugs;
  validateBlogRecord(legacy, record.slug);
  return record;
}
export function convertBlogV2ToV3(input) {
  if (input?.storageVersion === 3) return structuredClone(validateBlogV3(input));
  validateBlogRecord(input, input?.slug);
  const record = structuredClone(input);
  record.storageVersion = 3;
  record.aliases = Object.fromEntries(LOCALES.map(locale => [locale, []]));
  for (const snapshot of [record.draft, record.published]) {
    if (snapshot) snapshot.slugs = Object.fromEntries(LOCALES.map(locale => [locale, record.slug]));
  }
  return validateBlogV3(record);
}
function reservations(record) {
  return LOCALES.flatMap(locale => [
    {locale, slug: record.draft.slugs[locale], source: 'draft'},
    ...(record.published ? [{locale, slug: record.published.slugs[locale], source: 'published'}] : []),
    ...record.aliases[locale].map(slug => ({locale, slug, source: 'alias'})),
  ]);
}
export function assertBlogV3AddressAvailability(records) {
  if (!Array.isArray(records)) fail('Blog kayıt listesi gerekli.');
  const ids = new Set(), addresses = new Map();
  for (const record of records) {
    validateBlogV3(record);
    if (ids.has(record.slug)) fail('Tekrarlı teknik blog anahtarı.', 409);
    ids.add(record.slug);
    for (const address of reservations(record)) {
      const key = `${address.locale}:${address.slug}`;
      const owner = addresses.get(key);
      if (owner && owner !== record.slug) fail(`Blog adresi çakışıyor: ${key} (${owner}, ${record.slug}).`, 409);
      addresses.set(key, record.slug);
    }
  }
}
// A dry-run plan in memory, deliberately without filesystem writes or automatic migration.
export function planBlogV3Migration(records) {
  if (!Array.isArray(records)) fail('Blog kayıt listesi gerekli.');
  const converted = records.map(convertBlogV2ToV3);
  assertBlogV3AddressAvailability(converted);
  return converted;
}
export function publishedBlogV3Href(record, locale) {
  localeCheck(locale);
  validateBlogV3(record);
  return record.published ? `/${locale}/news/${record.published.slugs[locale]}` : null;
}
export function resolvePublishedBlogV3(records, locale, slug) {
  localeCheck(locale);
  slugCheck(slug);
  assertBlogV3AddressAvailability(records);
  for (const record of records) {
    if (!record.published) continue;
    const canonical = record.published.slugs[locale] === slug;
    if (canonical || record.aliases[locale].includes(slug)) {
      // Never return the draft or full management record to a public caller.
      return {recordKey: record.slug, published: structuredClone(record.published),
        href: publishedBlogV3Href(record, locale), redirect: !canonical};
    }
  }
  return null;
}
// Future publish planner; caller supplies the time and the complete locked record set.
// It does not persist, invalidate routes, or change the input objects.
export function planBlogV3Publication(records, recordKey, timestamp) {
  assertBlogV3AddressAvailability(records);
  const existing = records.find(record => record.slug === recordKey);
  if (!existing) fail('Blog kaydı bulunamadı.', 404);
  const next = structuredClone(existing);
  for (const locale of LOCALES) {
    const oldSlug = existing.published?.slugs[locale];
    const newSlug = existing.draft.slugs[locale];
    next.aliases[locale] = [...new Set([...existing.aliases[locale], ...(oldSlug ? [oldSlug] : [])])]
      .filter(slug => slug !== newSlug);
  }
  next.published = {...structuredClone(next.draft), status: 'published'};
  next.updatedAt = timestamp;
  next.publicationUpdatedAt = timestamp;
  validateBlogV3(next);
  assertBlogV3AddressAvailability(records.map(record => record.slug === recordKey ? next : record));
  return next;
}
