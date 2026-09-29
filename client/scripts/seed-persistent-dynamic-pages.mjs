import {mkdir,lstat,realpath} from 'node:fs/promises';
import path from 'node:path';
import {resolveAzuraPaths} from '../lib/azura-homepage-storage.mjs';
const paths=resolveAzuraPaths({appRoot:process.cwd(),production:!process.argv.includes('--local')});
for(const [root,name] of [[paths.contentRoot,'pages'],[paths.uploadsRoot,'dynamic-pages']]){await mkdir(root,{recursive:true});const dir=path.join(await realpath(root),name);await mkdir(dir).catch(e=>{if(e.code!=='EEXIST')throw e;});if((await lstat(dir)).isSymbolicLink()||await realpath(dir)!==dir||!(await lstat(dir)).isDirectory())throw new Error('Güvensiz dinamik sayfa dizini.');}
console.log('Dinamik sayfa dizinleri hazır; JSON/görsel oluşturulmadı veya değiştirilmedi.');
