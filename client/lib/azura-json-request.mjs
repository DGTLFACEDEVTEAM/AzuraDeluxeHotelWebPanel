// Shared bounded stream reader. Content-Length is only an early check.
export async function readJsonRequest(request,ErrorType,limit=128*1024){
 if(!/^application\/json(?:\s*;|\s*$)/i.test(request.headers.get('content-type')||''))throw new ErrorType('Content-Type application/json olmalı.',415);
 if(Number(request.headers.get('content-length'))>limit)throw new ErrorType('JSON istek boyutu sınırı aşıldı.',413);
 const reader=request.body?.getReader(),chunks=[];let length=0;
 if(reader)while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>limit){await reader.cancel();throw new ErrorType('JSON istek boyutu sınırı aşıldı.',413);}chunks.push(value);}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new ErrorType('Geçersiz JSON.');}
}
export async function requireEmptyRequest(request,ErrorType){const reader=request.body?.getReader();if(reader)while(true){const {done,value}=await reader.read();if(done)break;if(value.byteLength){await reader.cancel();throw new ErrorType('İstek gövdesiz olmalı.');}}}
