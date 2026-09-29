import {NextResponse} from 'next/server';
import {revalidatePath} from 'next/cache';
import {hasValidServiceToken,serviceTokenConfigured} from './azura-service-auth.mjs';
import {parseIfMatch,HomepageContentError,LOCALES} from './azura-homepage-storage.mjs';
import {DynamicPageError} from './azura-pages/validation.mjs';
import {dynamicPageHref} from './azura-pages/routes.mjs';
import {listManagedPages,getManagedPage,createManagedPage,mutateManagedPage} from './azura-dynamic-pages-management.mjs';
import {readJsonRequest,requireEmptyRequest} from './azura-json-request.mjs';
const json=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
function invalidate(before,after){if(JSON.stringify(before?.published)!==JSON.stringify(after?.published)){for(const locale of LOCALES)revalidatePath(`/${locale}`,'layout');}for(const l of LOCALES)for(const slug of new Set([before?.published?.slugs[l],after?.published?.slugs[l]].filter(Boolean))){revalidatePath(dynamicPageHref(l,slug));revalidatePath(`/${l}/${slug}`);}}
export function dynamicPagesHandler(operation){return async(request,context)=>{
 if(!serviceTokenConfigured())return json({error:'Servis tokenı yapılandırılmamış.'},503);
 if(!hasValidServiceToken(request.headers.get('authorization')))return json({error:'Yetkisiz erişim.'},401);
 try{
  const {id,versionId}=context?.params?await context.params:{};
  if(operation==='list')return json(await listManagedPages());
  if(operation==='get'||operation==='history')return json(await getManagedPage(id));
  if(operation==='create')return json(await createManagedPage(await readJsonRequest(request,DynamicPageError)),201);
  const revision=parseIfMatch(request.headers.get('if-match'));let body;
  if(operation==='update'){body=await readJsonRequest(request,DynamicPageError);if(!['save','publish','unpublish'].includes(body?.action))throw new DynamicPageError('PUT yalnız save, publish veya unpublish kabul eder.');}
  else {await requireEmptyRequest(request,DynamicPageError);body=operation==='restore'?{action:'restore',versionId}:{action:'delete'};}
  return json(await mutateManagedPage(id,body,revision,undefined,invalidate));
 }catch(error){
  if(error instanceof DynamicPageError||error instanceof HomepageContentError)return json({error:error.message},error.status);
  console.error('Azura dinamik sayfa API hatası:',error);return json({error:'Dinamik sayfa işlemi başarısız.'},500);
 }
};}
