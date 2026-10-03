// One process-wide file budget, shared by every scope and request.
export const MEDIA_SCAN_CONCURRENCY=3;
export function createMediaScanCoordinator(limit=MEDIA_SCAN_CONCURRENCY){
 const flights=new Map(),waiters=[];
 let active=0,peak=0,scans=0;
 async function file(work){
  if(active>=limit)await new Promise(resolve=>waiters.push(resolve));else active++;
  peak=Math.max(peak,active);
  try{return await work();}finally{const next=waiters.shift();if(next)next();else active--;}
 }
 async function scan(key,work){
  if(flights.has(key))return structuredClone(await flights.get(key));
  scans++;
  const pending=Promise.resolve().then(work);flights.set(key,pending);
  try{return structuredClone(await pending);}finally{if(flights.get(key)===pending)flights.delete(key);}
 }
 async function map(entries,work){
  let cursor=0,failure;
  const workers=Array.from({length:Math.min(limit,entries.length)},async()=>{
   while(cursor<entries.length&&!failure){const entry=entries[cursor++];try{await file(()=>work(entry));}catch(error){failure=error;}}
  });
  await Promise.all(workers);if(failure)throw failure;
 }
 return {scan,map,stats:()=>({active,peak,scans,pending:flights.size})};
}
export const mediaScanCoordinator=createMediaScanCoordinator();
