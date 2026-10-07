import {cp, mkdtemp, rm, symlink} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
const source=path.resolve(import.meta.dirname,'..');
const temporary=await mkdtemp(path.join(os.tmpdir(),'azura-blog-production-'));
const target=path.join(temporary,'client');
async function run(args){await new Promise((resolve,reject)=>{
 const child=spawn(process.platform==='win32'?'npm.cmd':'npm',args,{cwd:target,env:process.env,stdio:'inherit'});
 child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`npm ${args.join(' ')}: ${code}`)));
});}
try {
 await cp(source,target,{recursive:true,filter:p=>!['node_modules','.next','.git'].includes(path.basename(p))&&!path.basename(p).startsWith('.env')});
 await symlink(path.join(source,'node_modules'),path.join(target,'node_modules'),'dir');
 await run(['run','build']);
 await run(['exec','--','node','--test','lib/azura-media-serving.test.mjs','lib/azura-media-serving-http.test.mjs']);
 await run(['exec','--','node','--test','lib/azura-dashboard-summary-http.test.mjs']);
 await run(['run','test:blog-http']);
 await run(['exec','--','node','--test','lib/azura-media-library-http.test.mjs']);
 await run(['run','test:dynamic-pages-http']);
 await run(['exec','--','node','--test','--test-concurrency=1','lib/azura-gallery-api-http.test.mjs']);


} finally { await rm(temporary,{recursive:true,force:true}); }
