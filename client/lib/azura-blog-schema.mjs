import {LOCALES} from './azura-homepage-storage.mjs';
import {createPageValidators} from './azura-page-content-validation.mjs';
export class BlogContentError extends Error {
 constructor(message,status=400){super(message);this.name="BlogContentError";this.status=status;}
}
const {keys}=createPageValidators('blog',BlogContentError);
export const MAX_BLOG_JSON_BYTES=2*1024*1024;
export function validBlogSlug(slug) { return typeof slug==='string' && slug.length<=120 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug); }
function string(value,label,max) { if(typeof value!=='string'||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))throw new BlogContentError(`Geçersiz blog metni: ${label}`); }
function date(value,label) { if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString()!==value)throw new BlogContentError(`Geçersiz blog tarihi: ${label}`); }
function image(value) { if(typeof value!=='string'||(value!==''&&(!/^\/uploads\/blog\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.(jpg|jpeg|png|webp)$/i.test(value)||value.includes('..'))))throw new BlogContentError('Geçersiz blog görsel yolu.'); }
function post(value,slug,status) {
 keys(value,['slug','status','coverImage','publishedAt','updatedAt','translations','contentBlocks'],'post');
 if(value.slug!==slug||value.status!==status)throw new BlogContentError('Blog kimliği/yayın durumu eşleşmiyor.');
 date(value.publishedAt,'publishedAt');date(value.updatedAt,'updatedAt');image(value.coverImage);
 keys(value.translations,LOCALES,'translations');
 for(const locale of LOCALES){const t=value.translations[locale];keys(t,['title','excerpt','content','seoTitle','seoDescription'],locale);for(const key of Object.keys(t))string(t[key],`${locale}.${key}`,key==='content'?100000:key==='title'||key==='seoTitle'?500:4000);}
 if(!LOCALES.some(l=>value.translations[l].title.trim()))throw new BlogContentError('En az bir dilde başlık gerekli.');
 if(!Array.isArray(value.contentBlocks))throw new BlogContentError('Geçersiz blog blokları.');
 const ids=new Set();for(const b of value.contentBlocks){keys(b,['id','headingLevel','image','translations'],'block');if(typeof b.id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(b.id)||ids.has(b.id)||!['h2','h3'].includes(b.headingLevel))throw new BlogContentError('Geçersiz/tekrarlı blok kimliği veya başlık seviyesi.');ids.add(b.id);image(b.image);keys(b.translations,LOCALES,'block.translations');for(const l of LOCALES){keys(b.translations[l],['heading','content'],l);string(b.translations[l].heading,'heading',500);string(b.translations[l].content,'content',100000);}}
}
export function validateBlogRecord(record,slug) {
 if(!validBlogSlug(slug))throw new BlogContentError('Geçersiz blog slug.');
 keys(record,['storageVersion','slug','createdAt','updatedAt','publicationUpdatedAt','draft','published'],'record');
 if(record.storageVersion!==2||record.slug!==slug)throw new BlogContentError('Geçersiz blog storageVersion/slug.');
 date(record.createdAt,'createdAt');date(record.updatedAt,'updatedAt');
 post(record.draft,slug,'draft');
 if(record.published!==null){date(record.publicationUpdatedAt,'publicationUpdatedAt');post(record.published,slug,'published');}
 else if(record.publicationUpdatedAt!==null)throw new BlogContentError('Yayımsız kaydın publicationUpdatedAt alanı null olmalı.');
 return record;
}
