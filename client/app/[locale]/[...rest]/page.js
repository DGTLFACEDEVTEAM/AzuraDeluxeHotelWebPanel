import {notFound} from 'next/navigation';
import {readPublishedDynamicPage} from '@/lib/azura-dynamic-pages-content';
import {getLocalizedContent} from '@/lib/azura-pages/schema.mjs';
import {dynamicPageHref,decodeDynamicRouteSlug} from '@/lib/azura-pages/routes.mjs';
import {DynamicPageLocaleBridge} from '@/DynamicPageLocaleContext';
import StandardPageTemplate from '../_dynamic-page/StandardPageTemplate';
export const dynamic='force-dynamic';
async function read(params){const {locale,rest}=await params;if(!Array.isArray(rest)||rest.length!==1)return null;let slug;try{slug=decodeDynamicRouteSlug(rest[0],locale);}catch{return null;}return readPublishedDynamicPage(locale,slug);}
export async function generateMetadata({params}){const {locale}=await params;const page=await read(params);if(!page)return {};const hero=getLocalizedContent(page.hero.translations,locale),seo=getLocalizedContent(page.seo,locale);return {title:seo.title||hero.title||'Azura Deluxe Hotel',description:seo.description||undefined,alternates:{languages:Object.fromEntries(Object.entries(page.slugs).map(([l,slug])=>[l,dynamicPageHref(l,slug)]))}};}
export default async function DynamicPage({params}){const {locale}=await params;const page=await read(params);if(!page)notFound();return <><DynamicPageLocaleBridge slugs={page.slugs}/><StandardPageTemplate page={page} locale={locale}/></>;}
