import {mkdir,lstat,realpath} from 'node:fs/promises';
import path from 'node:path';
import {resolveAzuraPaths} from '../lib/azura-homepage-storage.mjs';
const paths=resolveAzuraPaths({appRoot:process.cwd(),production:true});
// Directory-only initialization: never create sample posts or rewrite existing files.
for(const [root,parts] of [[paths.contentRoot,['blog','posts']],[paths.uploadsRoot,['blog']]]) {
 await mkdir(root,{recursive:true});let directory=await realpath(root);
 for(const part of parts){directory=path.join(directory,part);await mkdir(directory).catch(e=>{if(e.code!=='EEXIST')throw e;});if((await lstat(directory)).isSymbolicLink()||!(await lstat(directory)).isDirectory()||await realpath(directory)!==directory)throw new Error('Güvenli olmayan blog kurulum dizini.');}
}
console.log('Azura blog dizinleri hazır; mevcut içerik ve görseller değiştirilmedi.');
