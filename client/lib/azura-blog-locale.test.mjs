import test from 'node:test';
import assert from 'node:assert/strict';
import {blogLocaleHref} from './azura-blog-locale.mjs';
import {blogContractVersion} from './azura-blog-version.mjs';
import {dynamicLocaleHref} from './azura-pages/routes.mjs';
import {readFile} from 'node:fs/promises';
test('server mode is strict and defaults to v2',()=>{
 const previous=process.env.AZURA_BLOG_CONTRACT_VERSION;
 try{delete process.env.AZURA_BLOG_CONTRACT_VERSION;assert.equal(blogContractVersion(),2);
 for(const v of ['2','3']){process.env.AZURA_BLOG_CONTRACT_VERSION=v;assert.equal(blogContractVersion(),Number(v));}
 for(const v of ['','4','03']){process.env.AZURA_BLOG_CONTRACT_VERSION=v;assert.throws(()=>blogContractVersion(),{code:'BLOG_CONTRACT_CONFIGURATION_ERROR'});}
 }finally{if(previous===undefined)delete process.env.AZURA_BLOG_CONTRACT_VERSION;else process.env.AZURA_BLOG_CONTRACT_VERSION=previous;}
});
test('published slug context serves both headers; stale context never overrides static/dynamic routes',async()=>{
 const state={pathname:'/tr/news/yazi',slugs:{tr:'yazi',en:'article',de:'artikel',ru:'statya'}};
 for(const [l,s] of Object.entries(state.slugs))assert.equal(blogLocaleHref(state,state.pathname,l),`/${l}/news/${s}`);
 for(const route of ['/en/about','/tr/custom','/en/news'])assert.equal(blogLocaleHref(state,route,'en'),null);
 assert.equal(blogLocaleHref(null,'/en/news/article','de'),null);
 assert.equal(dynamicLocaleHref({pathname:'/tr/custom',slugs:{en:'custom-en'}},'/tr/custom','en'),'/en/custom-en');
 const layout=await readFile(new URL('../app/[locale]/layout.js',import.meta.url),'utf8');
 assert.ok(layout.indexOf('<BlogLocaleProvider>')<layout.indexOf('<Header '));assert.ok(layout.indexOf('</BlogLocaleProvider>')>layout.indexOf('{children}'));
});
