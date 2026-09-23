import {cp, mkdtemp, rm, symlink} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
const source=path.resolve(import.meta.dirname,'..');
const temporary=await mkdtemp(path.join(os.tmpdir(),'azura-spor-production-'));
const target=path.join(temporary,'client');
async function run(args){await new Promise((resolve,reject)=>{
 const child=spawn(process.platform==='win32'?'npm.cmd':'npm',args,{cwd:target,env:process.env,stdio:'inherit'});
 child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`npm ${args.join(' ')}: ${code}`)));
});}
try {
 await cp(source,target,{recursive:true,filter:p=>!['node_modules','.next','.git'].includes(path.basename(p))&&!path.basename(p).startsWith('.env')});
 await symlink(path.join(source,'node_modules'),path.join(target,'node_modules'),'dir');
 await run(['run','build']);
 await run(['run','test:spor-http']);
 await run(['run','test:spawellness-http']);
} finally { await rm(temporary,{recursive:true,force:true}); }
