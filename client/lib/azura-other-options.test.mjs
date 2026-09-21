import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);

test('mobil iki gösterge mevcut Embla örneğine 0/1 gönderir; eski oda prop kullanımı da çalışır',async()=>{
 const {transform}=require('next/dist/build/swc');
 const source=await readFile(new URL('../app/[locale]/rooms/subroomComponent/components/OtherOptions.jsx',import.meta.url),'utf8');
 const output=await transform(source,{filename:'OtherOptions.jsx',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'classic'}}},module:{type:'commonjs'}});
 for(const room of ['deluxe','family','fantasy','handicap']){
  const calls=[];const React={createElement:(type,props,...children)=>({type,props:props??{},children}),useCallback:fn=>fn,useEffect:()=>{},useState:()=>[0,()=>{}]};
  const fakeRequire=id=>id==='react'?React:id==='embla-carousel-react'?()=>[()=>{},{scrollTo:i=>calls.push(i)}]:id==='next-intl'?{useTranslations:()=>x=>x}:{};
  const context={exports:{},require:fakeRequire};vm.runInNewContext(output.code,context);
  const tree=context.exports.default({rooms:[{id:'family',img:{width:1,height:1}},{id:'fantasy',img:{width:1,height:1}}],...(room==='deluxe'?{content:{span:'s',title:'t',buttonText:'b'}}:{})});
  const controls=[];function walk(node){if(Array.isArray(node)){node.forEach(walk);return;}if(!node||typeof node!=='object')return;if(node.props?.onClick)controls.push(node);walk(node.children);}
  walk(tree);assert.equal(controls.length,2);controls[1].props.onClick();controls[0].props.onClick();assert.deepEqual(calls,[1,0]);
 }
});
