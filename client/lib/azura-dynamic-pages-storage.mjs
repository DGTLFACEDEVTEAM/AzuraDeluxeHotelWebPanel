import {constants} from 'node:fs';
import {realpath,lstat,readdir,open} from 'node:fs/promises';
import path from 'node:path';
import {resolveAzuraPaths,LOCALES} from './azura-homepage-storage.mjs';
import {readDynamicPageImage} from './azura-homepage-media.mjs';
import {validateDynamicRecord,validatePageId,dynamicImages,DynamicPageError} from './azura-pages/validation.mjs';
import {normalizePageSlug,dynamicPageHref} from './azura-pages/routes.mjs';
import {getLocalizedContent} from './azura-pages/schema.mjs';
export async function readDynamicRecords(paths=resolveAzuraPaths()){
 let dir;try{const root=await realpath(paths.contentRoot);dir=path.join(root,'pages');if((await lstat(dir)).isSymbolicLink()||await realpath(dir)!==dir)throw new DynamicPageError('Güvensiz pages dizini.');}catch(e){if(e.code==='ENOENT')return [];throw e;}
 const records=[],ids=new Set();
 for(const name of (await readdir(dir)).sort()){
  if(!name.endsWith('.json'))continue;const id=name.slice(0,-5);validatePageId(id);if(ids.has(id.toLowerCase()))throw new DynamicPageError('Tekrarlanan sayfa kimliği.');ids.add(id.toLowerCase());
  const file=await open(path.join(dir,name),constants.O_RDONLY|constants.O_NOFOLLOW);let record;
  try{const stat=await file.stat();if(!stat.isFile()||stat.size>4*1024*1024)throw new DynamicPageError('Sayfa dosyası 4 MiB sınırını aşıyor veya geçersiz.');const bytes=await file.readFile();if(bytes.length>4*1024*1024)throw new DynamicPageError('Sayfa dosyası çok büyük.');record=validateDynamicRecord(JSON.parse(bytes.toString('utf8')),id);}catch(e){throw new DynamicPageError(`Dinamik sayfa okunamadı (${id}): ${e.message}`);}finally{await file.close();}
  records.push(record);
 }
 return records;
}
export async function readDynamicPages(paths=resolveAzuraPaths()){
 const published=[],routes=new Set();
 for(const record of await readDynamicRecords(paths))if(record.published){
  for(const l of LOCALES){const key=`${l}/${record.published.slugs[l]}`;if(routes.has(key))throw new DynamicPageError(`Yayımlanmış slug çakışması: ${key}`);routes.add(key);}
  published.push(record.published);
 }
 return published;
}
export async function readPublishedDynamicPage(locale,slug,paths=resolveAzuraPaths()){
 let normalized;try{normalized=normalizePageSlug(slug,locale);}catch{return null;}
 const page=(await readDynamicPages(paths)).find(p=>p.slugs[locale]===normalized);if(!page)return null;
 for(const src of dynamicImages(page)){try{await readDynamicPageImage(src,paths);}catch(e){throw new DynamicPageError(`Dinamik sayfa görseli geçersiz: ${src} (${e.message})`);}}
 return page;
}
export async function listDynamicPageNavigation(locale,paths=resolveAzuraPaths()){
 if(!LOCALES.includes(locale))throw new DynamicPageError('Geçersiz dil.');
 return (await readDynamicPages(paths)).filter(p=>p.navigation.visible).map(p=>({id:p.id,label:getLocalizedContent(p.navigation.translations,locale).label||getLocalizedContent(p.hero.translations,locale).title||p.slugs[locale],href:dynamicPageHref(locale,p.slugs[locale]),order:p.navigation.order})).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
}
