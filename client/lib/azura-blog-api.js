import {NextResponse} from 'next/server';
import {revalidatePath} from 'next/cache';
import {hasValidServiceToken,serviceTokenConfigured} from './azura-service-auth.mjs';
import {parseIfMatch,HomepageContentError,LOCALES} from './azura-homepage-storage.mjs';
import {BlogContentError} from './azura-blog-storage.mjs';
import {listBlogPosts,getBlogPost,createBlogPost,mutateBlogPost,deleteBlogPost} from './azura-blog-management.mjs';
const LIMIT=128*1024;
const json=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function body(request){
 if(!/^application\/json(?:\s*;|\s*$)/i.test(request.headers.get('content-type')||''))throw new BlogContentError('Content-Type application/json olmalı.',415);
 if(Number(request.headers.get('content-length'))>LIMIT)throw new BlogContentError('İstek 128 KiB sınırını aşıyor.',413);
 const reader=request.body?.getReader(),chunks=[];let length=0;
 if(reader)while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>LIMIT){await reader.cancel();throw new BlogContentError('İstek 128 KiB sınırını aşıyor.',413);}chunks.push(value);}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new BlogContentError('Geçersiz JSON.');}
}
function invalidate(slug){for(const locale of LOCALES){revalidatePath(`/${locale}/news`);revalidatePath(`/${locale}/news/${slug}`);}}
export function blogHandler(operation){return async(request,context)=>{
 if(!serviceTokenConfigured())return json({error:'Servis tokenı yapılandırılmamış.'},503);
 if(!hasValidServiceToken(request.headers.get('authorization')))return json({error:'Yetkisiz erişim.'},401);
 try{
  const slug=context?.params?(await context.params).slug:undefined;
  if(operation==='list')return json(await listBlogPosts());
  if(operation==='get')return json(await getBlogPost(slug));
  if(operation==='create'){const result=await createBlogPost(await body(request));invalidate(result.record.slug);return json(result,201);}
  const revision=parseIfMatch(request.headers.get('if-match'));
  if(operation==='update'){const result=await mutateBlogPost(slug,await body(request),revision);invalidate(slug);return json(result);}
  // DELETE has no JSON body; reject unexpected data instead of silently ignoring it.
  if(request.body){const reader=request.body.getReader();let chunk;do{chunk=await reader.read();if(chunk.value?.byteLength){await reader.cancel();throw new BlogContentError('DELETE gövdesiz olmalı.');}}while(!chunk.done);}
  const result=await deleteBlogPost(slug,revision);invalidate(slug);return json(result);
 }catch(error){
  if(error instanceof BlogContentError||error instanceof HomepageContentError)return json({error:error.message},error.status);
  if(error.code==='ENOENT')return json({error:operation==='create'?'Blog dizinleri hazır değil; seed:blog çalıştırın.':'Yazı bulunamadı.'},operation==='create'?503:404);
  console.error('Azura blog API işlemi başarısız:',error);return json({error:'Blog işlemi başarısız.'},500);
 }
};}
