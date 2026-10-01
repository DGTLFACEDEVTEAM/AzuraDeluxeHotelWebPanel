import test from 'node:test';
import assert from 'node:assert/strict';
import {blogFixture} from './azura-blog-test-fixtures.mjs';
import {blogRevision} from './azura-blog-management.mjs';
import {validateBlogRecord} from './azura-blog-storage.mjs';
import {convertBlogV2ToV3, validateBlogV3, assertBlogV3AddressAvailability, planBlogV3Migration, planBlogV3Publication, resolvePublishedBlogV3, publishedBlogV3Href} from './azura-blog-v3.mjs';
const make = key => convertBlogV2ToV3(blogFixture(key));
const conflict = fn => assert.throws(fn, {status: 409});
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
test('pure conversion preserves every v2 field, whitespace, dates, blocks and revision; idempotent v3', () => {
  const old = blogFixture('technical-key');
  old.draft.translations.en.content = '  text\n\nnext\t ';
  const before = structuredClone(old), revision = blogRevision(old);
  freeze(old);
  const next = convertBlogV2ToV3(old);
  assert.equal(next.slug, old.slug);
  assert.deepEqual(next.draft.slugs, {tr:'technical-key',en:'technical-key',de:'technical-key',ru:'technical-key'});
  const projected = structuredClone(next);
  projected.storageVersion = 2; delete projected.aliases;
  delete projected.draft.slugs; delete projected.published.slugs;
  assert.deepEqual(projected, before);
  assert.deepEqual(old, before);
  assert.equal(blogRevision(old), revision);
  assert.deepEqual(convertBlogV2ToV3(freeze(next)), next);
  assert.notEqual(convertBlogV2ToV3(next).draft, next.draft);
  assert.throws(() => validateBlogRecord(next, next.slug)); // Active v2 never silently accepts v3.
});
test('null published, empty migration, mixed/idempotent migration; no mutation', () => {
  const old = blogFixture(); old.published = null; old.publicationUpdatedAt = null;
  const next = convertBlogV2ToV3(freeze(old));
  assert.equal(next.published, null);
  assert.equal(next.publicationUpdatedAt, null);
  assert.equal(publishedBlogV3Href(next, 'tr'), null);
  assert.deepEqual(planBlogV3Migration([]), []);
  const records = [old, make('second')];
  assert.deepEqual(planBlogV3Migration(planBlogV3Migration(records)), planBlogV3Migration(records));
});
test('strict four-language ASCII slugs; no normalization and existing validation remains strict', () => {
  for (const bad of ['', 'Upper', 'a--b', '-a', 'a-', 'a b', 'ş', '%61', '../x', 'a'.repeat(121)]) {
    const record = make('key'); record.draft.slugs.tr = bad;
    assert.throws(() => validateBlogV3(record));
  }
  const valid = make('key'); valid.draft.slugs.tr = 'a'.repeat(120); validateBlogV3(valid);
  for (const mutate of [r=>{delete r.draft.slugs.en;}, r=>{r.published.slugs.fr='bonjour';}, r=>{r.aliases.tr=['old','old'];}, r=>{r.aliases.ru=['../x'];}, r=>{r.extra=true;}, r=>{r.draft.contentBlocks[0].headingLevel='h1';}, r=>{r.draft.updatedAt='yesterday';}]) {
    const record=make('key'); mutate(record); assert.throws(()=>validateBlogV3(record));
  }
});
test('locale-scoped reservations cover drafts, published snapshots and aliases, including unpublished aliases', () => {
  const a=make('a'), b=make('b');
  a.draft.slugs.tr='shared'; b.draft.slugs.en='shared';
  assertBlogV3AddressAvailability([a,b]);
  for (const source of ['draft','published','alias']) {
    const other=make('other');
    if(source==='alias') other.aliases.tr=['shared']; else other[source].slugs.tr='shared';
    conflict(()=>assertBlogV3AddressAvailability([a,other]));
  }
  a.aliases.tr=['retired']; a.draft.slugs.tr='retired';
  assertBlogV3AddressAvailability([a]); // Same owner may reclaim its old URL.
  b.draft.slugs.tr='retired'; a.published=null; a.publicationUpdatedAt=null;
  conflict(()=>assertBlogV3AddressAvailability([a,b]));
  conflict(()=>assertBlogV3AddressAvailability([a,a]));
});
test('public resolution and language switch never expose draft addresses/content', () => {
  const record=make('key');
  for (const locale of ['tr','en','de','ru']) {
    record.published.slugs[locale]=`live-${locale}`;
    record.draft.slugs[locale]=`draft-${locale}`;
    record.aliases[locale]=[`old-${locale}`];
  }
  for (const locale of ['tr','en','de','ru']) {
    assert.equal(resolvePublishedBlogV3([record],locale,`draft-${locale}`),null);
    const live=resolvePublishedBlogV3([record],locale,`live-${locale}`);
    assert.equal(live.redirect,false); assert.equal('draft' in live,false);
    assert.deepEqual(live.published,record.published);
    assert.equal(publishedBlogV3Href(record,locale),`/${locale}/news/live-${locale}`);
    const alias=resolvePublishedBlogV3([record],locale,`old-${locale}`);
    assert.equal(alias.redirect,true); assert.equal(alias.href,live.href);
  }
  record.published=null; record.publicationUpdatedAt=null;
  assert.equal(resolvePublishedBlogV3([record],'tr','old-tr'),null);
  assert.equal(resolvePublishedBlogV3([],'tr','old-tr'),null);
  assert.throws(()=>resolvePublishedBlogV3([],'fr','key'));
});
test('publish plans retain locale aliases, collapse redirects, permit reversion, and validate all reservations', () => {
  const old=make('key'); old.draft.slugs.tr='new';
  const before=structuredClone(old);
  let next=planBlogV3Publication(freeze([old]),'key','2026-09-30T10:00:00.000Z');
  assert.deepEqual(old,before); assert.deepEqual(next.aliases.tr,['key']); assert.deepEqual(next.aliases.en,[]);
  next.draft.slugs.tr='newer';
  next=planBlogV3Publication([next],'key','2026-09-30T11:00:00.000Z');
  assert.equal(resolvePublishedBlogV3([next],'tr','key').href,'/tr/news/newer');
  next.draft.slugs.tr='key';
  next=planBlogV3Publication([next],'key','2026-09-30T12:00:00.000Z');
  assert.deepEqual(next.aliases.tr,['new','newer']);
  assert.equal(resolvePublishedBlogV3([next],'tr','key').redirect,false);
  const other=make('other'); other.draft.slugs.tr='new';
  conflict(()=>planBlogV3Publication([next,other],'key','2026-09-30T13:00:00.000Z'));
  assert.throws(()=>planBlogV3Publication([next],'missing','2026-09-30T13:00:00.000Z'),{status:404});
});
