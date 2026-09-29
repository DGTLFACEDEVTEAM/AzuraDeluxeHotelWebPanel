import test from 'node:test';
import assert from 'node:assert/strict';
import {createManagedPage,mutateManagedPage} from './azura-dynamic-pages-management.mjs';
import {listDynamicPageNavigation,readPublishedDynamicPage} from './azura-dynamic-pages-storage.mjs';
process.env.DYNAMIC_FIXTURE_ONLY='1';
const {fixture,setup}=await import('./azura-dynamic-pages.test.mjs');
test('published menu: four languages, ordering, fallback, hidden direct route, draft isolation, unpublish/delete',async t=>{
 const paths=await setup(t);const {id,status,createdAt,updatedAt,...draft}=fixture().draft;
 const states=[];
 for(let n=0;n<3;n++){const d=structuredClone(draft);for(const l of ['tr','en','de','ru']){d.slugs[l]+=`-${n}`;d.navigation.translations[l].label=`Menu ${n} ${l}`;}d.navigation.order=n===0?20:10;const r=await createManagedPage({draft:d},paths);states.push(await mutateManagedPage(r.record.id,{action:'publish'},r.revision,paths));}
 for(const l of ['tr','en','de','ru']){const menu=await listDynamicPageNavigation(l,paths);const expected=[...states].sort((a,b)=>a.record.published.navigation.order-b.record.published.navigation.order||a.record.id.localeCompare(b.record.id));assert.deepEqual(menu.map(m=>m.id),expected.map(r=>r.record.id));for(const m of menu){assert.ok(m.label.endsWith(l));assert.ok(m.href.startsWith(`/${l}/`));assert.ok(!m.href.includes(`/${l}/${l}/`));}}
 let state=states[0];const d=structuredClone(draft);d.slugs=state.record.draft.slugs;d.navigation.visible=false;state=await mutateManagedPage(state.record.id,{action:'save',draft:d},state.revision,paths);assert.equal((await listDynamicPageNavigation('en',paths)).length,3);state=await mutateManagedPage(state.record.id,{action:'publish'},state.revision,paths);assert.equal((await listDynamicPageNavigation('en',paths)).length,2);assert.ok(await readPublishedDynamicPage('en',d.slugs.en,paths));
 const second=states[1];await mutateManagedPage(second.record.id,{action:'unpublish'},second.revision,paths);assert.equal((await listDynamicPageNavigation('en',paths)).length,1);
 const third=states[2];await mutateManagedPage(third.record.id,{action:'delete'},third.revision,paths);assert.deepEqual(await listDynamicPageNavigation('en',paths),[]);
 d.navigation.visible=true;d.navigation.translations.en.label='';d.hero.translations.en.title='Fallback hero';state=await mutateManagedPage(state.record.id,{action:'save',draft:d},state.revision,paths);state=await mutateManagedPage(state.record.id,{action:'publish'},state.revision,paths);assert.equal((await listDynamicPageNavigation('en',paths))[0].label,'Fallback hero');
});
test('localized header links use next/link unchanged and close the shared mobile/desktop menu',async()=>{
 const {readFile}=await import('node:fs/promises'),{createRequire}=await import('node:module'),vm=await import('node:vm');const require=createRequire(import.meta.url);const {transform}=require('next/dist/build/swc');
 const source=await readFile(new URL('../app/[locale]/GeneralComponents/Header/DynamicNavigationLinks.jsx',import.meta.url),'utf8');
 const output=await transform(source,{filename:'DynamicNavigationLinks.jsx',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});
 const jsx=(type,props)=>({type,props});const context={exports:{},require:id=>{if(id==='next/link')return 'NextLink';if(id==='react/jsx-runtime')return {jsx,jsxs:jsx};throw new Error(id);}};vm.runInNewContext(output.code,context);
 let closed=0;for(const l of ['tr','en','de','ru']){const href=`/${l}/example`,nodes=context.exports.default({items:[{id:'stable',href,label:'Visible label'}],className:'preserved',onNavigate:()=>closed++});assert.equal(nodes[0].type,'NextLink');assert.equal(nodes[0].props.href,href);assert.equal(nodes[0].props.className,'preserved');nodes[0].props.onClick();}assert.equal(closed,4);
 for(const file of ['Header','HeaderWhite']){const code=await readFile(new URL(`../app/[locale]/GeneralComponents/Header/${file}.jsx`,import.meta.url),'utf8');assert.equal((code.match(/<DynamicNavigationLinks/g)||[]).length,1);assert.equal((code.match(/<nav\b/g)||[]).length,1);assert.ok(code.includes('items={dynamicNavigation}'));}
});
