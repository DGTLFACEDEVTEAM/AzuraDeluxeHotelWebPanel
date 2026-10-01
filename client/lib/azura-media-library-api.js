import {NextResponse} from 'next/server';
import {serviceTokenConfigured,hasValidServiceToken} from './azura-service-auth.mjs';
import {HomepageMediaError} from './azura-homepage-media.mjs';
import {readJsonRequest} from './azura-json-request.mjs';
import {listMediaLibrary,reuseLibraryImage} from './azura-media-library.mjs';
const json=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
export function mediaLibraryHandler(reuse=false){return async request=>{
 if(!serviceTokenConfigured())return json({error:'Servis tokenı yapılandırılmamış.'},503);
 if(!hasValidServiceToken(request.headers.get('authorization')))return json({error:'Yetkisiz erişim.'},401);
 try{
  if(!reuse)return json(await listMediaLibrary(new URL(request.url).searchParams));
  if(new URL(request.url).search)throw new HomepageMediaError('Reuse sorgu parametresi kabul etmez.');
  const result=await reuseLibraryImage(await readJsonRequest(request,HomepageMediaError,4096));return json(result.body,result.status);
 }catch(error){
  if(error instanceof HomepageMediaError)return json({error:error.message},error.status);
  if(error.code==='ENOENT')return json({error:'Görsel veya uploads dizini bulunamadı.'},404);
  if(error.code==='ELOOP')return json({error:'Symlink kabul edilmez.'},400);
  console.error('Medya kütüphanesi işlemi başarısız.');return json({error:'Medya kütüphanesi işlemi başarısız.'},500);
 }
};}
