import {createHash} from "node:crypto";
import {canonicalJson,enqueuePageWrite,writePageAtomically} from "./azura-page-storage.mjs";
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {LOCALES,resolveAzuraPaths} from './azura-homepage-storage.mjs';
import {createPageValidators,validatePageImageFiles} from './azura-page-content-validation.mjs';
export class CertificatesContentError extends Error {constructor(message,status=400){super(message);this.status=status;}}
export const CERTIFICATE_IDS=Object.freeze(['certificate-tr','certificate-en','certificate-2','iso-9001','iso-10002','iso-14001']);
const {keys,text,texts,image}=createPageValidators('certificates',CertificatesContentError);
const optionalText=(v,label)=>{if(v!=='')text(v,label);};
export function validateCertificatesContent(c){
 if(!c||typeof c!=='object'||Array.isArray(c))throw new CertificatesContentError('Geçersiz sertifika verisi.');if(c.schemaVersion!==1||c.pageKey!=='certificates')throw new CertificatesContentError('Geçersiz sertifika sayfası kimliği.');
 keys(c.translations,LOCALES,'translations');for(const l of LOCALES){const t=c.translations[l];keys(t,['hero','feature','gallery'],l);keys(t.hero,['eyebrow','title'],'hero');optionalText(t.hero.eyebrow,'hero.eyebrow');text(t.hero.title,'hero.title');keys(t.feature,['eyebrow','title','text'],'feature');text(t.feature.eyebrow,'feature.eyebrow');text(t.feature.title,'feature.title');optionalText(t.feature.text,'feature.text');texts(t.gallery,['title','modalAlt'],'gallery');}
 keys(c.media,['hero','feature','gallery'],'media');image(c.media.hero,'hero',false,false);image(c.media.feature,'feature');keys(c.media.gallery,['images'],'gallery');if(!Array.isArray(c.media.gallery.images))throw new CertificatesContentError('Galeri dizi olmalı.');const ids=new Set();for(const [i,r] of c.media.gallery.images.entries()){keys(r,['id','src','order','width','height','translations'],'gallery image');if(typeof r.id!=='string'||!/^[a-z0-9][a-z0-9-]{0,79}$/.test(r.id)||ids.has(r.id)||r.order!==i)throw new CertificatesContentError('Geçersiz galeri kimliği/sırası.');ids.add(r.id);const {src,...rest}=r;image({...rest,image:src},r.id,true);}
 return c;
}
export const certificatesFile=(paths=resolveAzuraPaths())=>path.join(paths.contentRoot,'site-pages/certificates.json');
export const certificatesImages=c=>[c.media.hero,c.media.feature,...c.media.gallery.images.map(({src,...r})=>({...r,image:src}))];
export async function readCertificatesContent(paths=resolveAzuraPaths()){
 let c;try{c=JSON.parse(await readFile(certificatesFile(paths),'utf8'));}catch(e){throw new CertificatesContentError(`Sertifikalar okunamadı: ${e.message}`);}validateCertificatesContent(c);await validatePageImageFiles(certificatesImages(c),'certificates',paths,CertificatesContentError);return c;
}
export async function readCertificatesLocale(locale,paths=resolveAzuraPaths()){
 if(!LOCALES.includes(locale))throw new CertificatesContentError('Geçersiz dil.');const c=await readCertificatesContent(paths);const localize=r=>({src:r.image??r.src,width:r.width,height:r.height,...(r.id?{id:r.id}:{}),...(r.translations?{alt:r.translations[locale].alt}:{})});return {texts:c.translations[locale],hero:localize(c.media.hero),feature:localize(c.media.feature),images:c.media.gallery.images.map(localize)};
}

export function certificatesRevision(bundle,media){
 validateCertificatesContent({schemaVersion:1,pageKey:'certificates',translations:bundle,media});
 return createHash('sha256').update(canonicalJson({bundle,media})).digest('hex');
}
export async function readCertificatesPageContent(paths=resolveAzuraPaths()){
 const c=await readCertificatesContent(paths);return {bundle:c.translations,media:c.media,revision:certificatesRevision(c.translations,c.media)};
}
export async function writeCertificatesPageContent(bundle,media,expectedRevision,paths=resolveAzuraPaths()){
 const input=structuredClone({bundle,media});const revision=certificatesRevision(input.bundle,input.media);
 if(input.media.gallery.images.length!==CERTIFICATE_IDS.length||input.media.gallery.images.some((r,i)=>r.id!==CERTIFICATE_IDS[i]||r.order!==i))throw new CertificatesContentError('Altı sertifikanın mevcut kimlik ve sırası korunmalı.');
 return enqueuePageWrite(certificatesFile(paths),async()=>{
  const current=await readCertificatesContent(paths);if(certificatesRevision(current.translations,current.media)!==expectedRevision)throw new CertificatesContentError('Sertifikalar başka bir kayıtla değişti.',409);
  const next={...current,translations:input.bundle,media:input.media};validateCertificatesContent(next);await validatePageImageFiles(certificatesImages(next),'certificates',paths,CertificatesContentError);await writePageAtomically(next,certificatesFile(paths));return {...input,revision};
 });
}
