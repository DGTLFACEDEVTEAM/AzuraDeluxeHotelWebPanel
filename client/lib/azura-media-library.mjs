import {createHash} from 'node:crypto';
import {resolveAzuraPaths} from './azura-homepage-storage.mjs';
import {enqueuePageWrite} from './azura-page-storage.mjs';
import {MEDIA_LIBRARY_SCOPES,requireLibraryScope,libraryPrefix,listLibraryScope,readLibraryImage,saveLibraryImage,HomepageMediaError} from './azura-homepage-media.mjs';
const fail=message=>{throw new HomepageMediaError(message);};
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function listMediaLibrary(query=new URLSearchParams(),paths=resolveAzuraPaths()){
 for(const key of query.keys())if(!['scope','q','limit','offset'].includes(key)||query.getAll(key).length!==1)fail('Geçersiz sorgu alanı.');
 const scope=query.get('scope'),q=query.get('q')??'';
 if(scope!==null)requireLibraryScope(scope);
 if(q.length>100)fail('Arama en fazla 100 karakter olabilir.');
 const number=(key,fallback,max)=>{const value=query.get(key);if(value===null)return fallback;if(!/^(0|[1-9]\d*)$/.test(value)||Number(value)>max)fail('Geçersiz sayfalama.');return Number(value);};
 const limit=number('limit',50,100),offset=number('offset',0,1000000);if(!limit)fail('Limit pozitif olmalı.');
 const records=[];
 for(const key of scope?[scope]:MEDIA_LIBRARY_SCOPES){
  for(const item of await listLibraryScope(key,paths)){
   const name=item.image.slice(libraryPrefix(key).length),folder=libraryPrefix(key).slice('/uploads/'.length,-1);
   if(`${name} ${folder}`.toLowerCase().includes(q.toLowerCase()))records.push({...item,name,scope:key,folder});
  }
 }
 records.sort((a,b)=>a.image<b.image?-1:a.image>b.image?1:0);
 return {images:records.slice(offset,offset+limit),total:records.length,limit,offset,nextOffset:offset+limit<records.length?offset+limit:null};
}
export async function reuseLibraryImage(body,paths=resolveAzuraPaths()){
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==2||!Object.hasOwn(body,'image')||!Object.hasOwn(body,'targetScope'))fail('Yalnız image ve targetScope gerekli.');
 const {image,targetScope}=body;requireLibraryScope(targetScope,true);
 const sourceScope=MEDIA_LIBRARY_SCOPES.find(scope=>typeof image==='string'&&image.startsWith(libraryPrefix(scope)));
 if(!sourceScope)fail('Kaynak izinli yerel uploads görseli olmalı.');
 const source=await readLibraryImage(sourceScope,image,paths);
 const result=src=>({image:src,mimeType:source.info.mimeType,size:source.info.size,width:source.info.width,height:source.info.height});
 if(sourceScope===targetScope)return {status:200,body:result(image)};
 return enqueuePageWrite(`${paths.uploadsRoot}:media-library:${targetScope}`,async()=>{
  const hash=digest(source.bytes);
  for(const candidate of await listLibraryScope(targetScope,paths)){
   const existing=await readLibraryImage(targetScope,candidate.image,paths);
   if(existing.bytes.equals(source.bytes))return {status:200,body:result(candidate.image)};
  }
  // Content-addressed names plus exclusive hard-link publication protect cross-process races.
  try{return {status:201,body:await saveLibraryImage(targetScope,source.bytes,source.info.mimeType,paths,hash)};}
  catch(error){
   if(error.status!==409)throw error;
   const destination=`${libraryPrefix(targetScope)}${targetScope}-${hash}.${source.info.extension}`;
   const existing=await readLibraryImage(targetScope,destination,paths);
   if(!existing.bytes.equals(source.bytes))throw error;
   return {status:200,body:result(destination)};
  }
 });
}
