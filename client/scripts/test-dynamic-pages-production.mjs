import {cp, mkdtemp, rm, symlink} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
const source=path.resolve(import.meta.dirname,'..');
const temporary=await mkdtemp(path.join(os.tmpdir(),'azura-dynamic-pages-production-'));
const target=path.join(temporary,'client');
async function run(args){await new Promise((resolve,reject)=>{
 const child=spawn(process.platform==='win32'?'npm.cmd':'npm',args,{cwd:target,env:process.env,stdio:'inherit'});
 child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`npm ${args.join(' ')}: ${code}`)));
});}
try {
 await cp(source,target,{recursive:true,filter:p=>!['node_modules','.next','.git'].includes(path.basename(p))&&!path.basename(p).startsWith('.env')});
 await symlink(path.join(source,'node_modules'),path.join(target,'node_modules'),'dir');
 await run(['run','build']);
 const failures=[];
 for(const args of [['run','test:dynamic-pages-http'],['run','test:blog-http'],['run','test:rooms-http'],['run','test:homepage-http'],['exec','--','node','--test','--test-concurrency=1','lib/azura-gallery-api-http.test.mjs']]){
  try{await run(args);}catch(error){failures.push(error.message);}
 }
 if(failures.length)throw new Error(failures.join('\n'));



} finally { if(process.env.KEEP_DYNAMIC_TEST_BUILD) console.log('Test build:',target); else await rm(temporary,{recursive:true,force:true}); }
