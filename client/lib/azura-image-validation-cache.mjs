import {lstat} from 'node:fs/promises';

export const IMAGE_CACHE_MAX_ENTRIES = 512;
export const IMAGE_CACHE_TTL_MS = 60_000;
export const IMAGE_CACHE_MAX_PENDING = 128;

function version(stat) {
  if (!stat?.isFile() || ['dev','ino','size','mtimeNs','ctimeNs'].some(k=>typeof stat[k]!=='bigint'||stat[k]<=0n)) return null;
  if(stat.mtimeNs%1_000_000n===0n && stat.ctimeNs%1_000_000n===0n)return null; // Coarse timestamps cannot establish a trustworthy version.
  return ['dev','ino','size','mtimeNs','ctimeNs'].map(k=>stat[k].toString()).join(':');
}
// Only metadata is retained. Caller must validate scope/directories and open O_NOFOLLOW first.
export function createImageValidationCache({maxEntries=IMAGE_CACHE_MAX_ENTRIES,ttlMs=IMAGE_CACHE_TTL_MS,maxPending=IMAGE_CACHE_MAX_PENDING,now=Date.now,statPath=lstat}={}) {
  const cache=new Map(),pending=new Map();
  async function signature(handle){try{return version(await handle.stat({bigint:true}));}catch{return null;}}
  async function stable(handle,file,expected){
    const after=await signature(handle);
    const onDisk=version(await statPath(file,{bigint:true}));
    return after===expected&&onDisk===expected;
  }
  return async function validate({handle,file,namespace,mimeType,inspect,error,initialStat}) {
    if(initialStat?.size===0 || initialStat?.size===0n)return {...await inspect(await handle.readFile(),mimeType)};
    const identity=await signature(handle);
    const key=identity?JSON.stringify([namespace,file,mimeType,identity]):null;
    const time=now();
    for(const [k,v] of cache)if(v.expires<=time)cache.delete(k);
    const cached=key&&cache.get(key);
    if(cached){
      if(!await stable(handle,file,identity)){cache.delete(key);throw error('Görsel doğrulama sırasında değişti.');}
      cache.delete(key);cache.set(key,cached);return {...cached.info};
    }
    if(key&&pending.has(key)){
      const info=await pending.get(key);
      if(!await stable(handle,file,identity))throw error('Görsel doğrulama sırasında değişti.');
      return {...info};
    }
    const work=(async()=>{
      const bytes=await handle.readFile();
      const info=await inspect(bytes,mimeType); // Original decoder enforces actual byte and pixel limits.
      if(key){
        if(!await stable(handle,file,identity))throw error('Görsel doğrulama sırasında değişti.');
        if(BigInt(bytes.length)===BigInt(identity.split(':')[2])){
          while(cache.size>=maxEntries&&cache.size)cache.delete(cache.keys().next().value);
          if(maxEntries>0)cache.set(key,{info:{...info},expires:now()+ttlMs});
        }
      }
      return {...info};
    })();
    const tracked=key&&pending.size<maxPending;
    if(tracked)pending.set(key,work);
    try{return await work;}finally{if(tracked&&pending.get(key)===work)pending.delete(key);}
  };
}
export const validateImageFileMetadata=createImageValidationCache();
