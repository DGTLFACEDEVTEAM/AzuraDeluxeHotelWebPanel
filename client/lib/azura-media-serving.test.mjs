import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {syncBuiltinESMExports} from 'node:module';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import {readLibraryImage} from './azura-homepage-media.mjs';
test('byte reader: zero descriptor size still decodes real bytes and enforces byte limit',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'media-byte-reader-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const paths={contentRoot:path.join(root,'content'),uploadsRoot:path.join(root,'uploads')};await fs.mkdir(path.join(paths.uploadsRoot,'pages/bars'),{recursive:true});
 const bytes=await sharp({create:{width:30,height:20,channels:3,background:'red'}}).png().toBuffer();await fs.writeFile(path.join(paths.uploadsRoot,'pages/bars/good.png'),bytes);await fs.writeFile(path.join(paths.uploadsRoot,'pages/bars/large.png'),Buffer.alloc(8*1024*1024+1));
 const open=fs.open;t.mock.method(fs,'open',async(...args)=>{const handle=await open(...args),stat=handle.stat.bind(handle);handle.stat=async(...a)=>{const value=await stat(...a);value.size=0;return value;};return handle;});syncBuiltinESMExports();t.after(()=>{t.mock.restoreAll();syncBuiltinESMExports();});
 const r=await readLibraryImage('bars','/uploads/pages/bars/good.png',paths);assert.deepEqual(r.bytes,bytes);assert.equal(r.info.size,bytes.length);assert.equal(r.info.mimeType,'image/png');
 await assert.rejects(readLibraryImage('bars','/uploads/pages/bars/large.png',paths),e=>e.status===413);
});
