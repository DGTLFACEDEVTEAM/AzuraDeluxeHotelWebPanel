// Client-safe published-address helper. The bridge supplies only these four slugs.
export function blogLocaleHref(page, pathname, locale) {
  if (!page || page.pathname !== pathname || !['tr','en','de','ru'].includes(locale)) return null;
  const slug=page.slugs?.[locale];
  return typeof slug==='string' && slug.length<=120 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    ? `/${locale}/news/${slug}` : null;
}
