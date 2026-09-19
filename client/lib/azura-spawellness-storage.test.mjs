import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, mkdtemp, mkdir, cp, rm, symlink } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import { SPA_GALLERY_IDS, SPA_MASSAGE_IDS, spaWellnessFile, spaWellnessImages,
  readSpaWellnessContent, readSpaWellnessPageLocale, validateSpaWellnessContent } from "./azura-spawellness-storage.mjs";

const run = promisify(execFile);
const root = path.resolve(import.meta.dirname, "..");
const seed = JSON.parse(await readFile(path.join(root, "content/site-pages/spawellness.json"), "utf8"));
const locales = ["tr", "en", "de", "ru"];
const originals = ["spaBanner.webp", "spa1.webp", "spa2.webp", "spa4.webp", "spa3.webp", "spa5.webp",
  "spa1.webp", "spa2.webp", "aromatic.webp", "oriental.webp", "clasmassage.webp", "masagefaci.webp", "indoor.webp", "spa9.webp"];

async function fixture(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "azura-spa-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const paths = { contentRoot: path.join(dir, "content"), uploadsRoot: path.join(dir, "uploads") };
  await mkdir(path.join(paths.contentRoot, "site-pages"), { recursive: true });
  await cp(path.join(root, "public/uploads/pages/spawellness"), path.join(paths.uploadsRoot, "pages/spawellness"), { recursive: true });
  await writeFile(spaWellnessFile(paths), JSON.stringify(seed));
  return paths;
}

function expected(m) {
  const group = (value, n) => ({ subtitle: value[`subtitle${n}`], title: value[`title${n}`], text: value[`text${n}`] });
  return {
    hero: { subtitle: m.subtitle, title: m.title, text: m.text },
    info: { intro: group(m.InfoSection, 1), sauna: group(m.InfoSection, 2), wellness: {
      ...group(m.InfoSection, 3), ...Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`list${i + 1}`, m.InfoSection[`list${i + 1}`]])),
    } },
    gallery: m.GallerySection,
    massage: { ...m.CarouselSection, time: m.time, cards: Object.fromEntries(SPA_MASSAGE_IDS.map((id, i) => [id, { title: m[`title${i + 1}`] }])) },
    types: { indoor: group(m.SpaTypes, 1), turkishBath: group(m.SpaTypes, 2) },
  };
}

test("dört dilin tüm görünür metinleri, yedi liste maddesi ve boşlukları aynen korunur", async (t) => {
  const paths = await fixture(t);
  for (const locale of locales) {
    const old = JSON.parse(await readFile(path.join(root, `messages/${locale}.json`), "utf8")).Spa;
    assert.deepEqual(seed.translations[locale], expected(old));
    assert.deepEqual((await readSpaWellnessPageLocale(locale, paths)).texts, expected(old));
  }
});

test("14 medya kullanımı, 12 benzersiz dosya ve kaynakların bayt/ölçü/sıra eşliği", async (t) => {
  const paths = await fixture(t);
  const content = await readSpaWellnessContent(paths);
  const records = spaWellnessImages(content.media);
  assert.equal(records.length, 14);
  assert.equal(new Set(records.map(r => r.image)).size, 12);
  for (const [i, record] of records.entries()) {
    const original = await readFile(path.join(root, "app/[locale]/spawellness/images", originals[i]));
    assert.deepEqual(await readFile(path.join(root, "public", record.image)), original);
    const actual = await sharp(original).metadata();
    assert.equal(record.width, actual.width); assert.equal(record.height, actual.height);
  }
  assert.deepEqual(content.media.gallery.images.map(r => r.id), SPA_GALLERY_IDS);
  assert.deepEqual(content.media.gallery.images.map(r => r.order), [0, 1, 2, 3, 4]);
  assert.deepEqual(content.media.massage.images.map(r => r.id), SPA_MASSAGE_IDS);
});

test("masaj başlıkları bağımsız dizi konumuna değil aynı kimlikteki görsele bağlanır", async (t) => {
  const paths = await fixture(t);
  const changed = structuredClone(seed);
  for (const locale of locales) changed.translations[locale].massage.cards = Object.fromEntries(
    Object.entries(changed.translations[locale].massage.cards).reverse());
  await writeFile(spaWellnessFile(paths), JSON.stringify(changed));
  for (const locale of locales) {
    const page = await readSpaWellnessPageLocale(locale, paths);
    for (const [i, card] of page.images.massage.entries()) {
      assert.equal(card.id, SPA_MASSAGE_IDS[i]); assert.equal(card.order, i);
      assert.equal(card.src, seed.media.massage.images[i].image);
      assert.equal(card.title, seed.translations[locale].massage.cards[card.id].title);
      assert.equal(card.alt, seed.media.massage.images[i].translations[locale].alt);
    }
  }
});

test("eksik/ek alan, dil, boş/uzun metin, yanlış kimlik/sıra ve güvensiz yol reddedilir", () => {
  const mutations = [
    s => { delete s.translations.ru; }, s => { delete s.translations.tr.info.wellness.list7; },
    s => { s.translations.tr.hero.title = " "; }, s => { s.translations.en.hero.text = "x".repeat(4001); },
    s => { s.translations.de.hero.text = "x\u0000"; }, s => { s.media.hero.translations.ru.alt = "x".repeat(301); },
    s => { s.media.gallery.images.pop(); }, s => { s.media.massage.images.reverse(); },
    s => { s.media.gallery.images[1].order = 0; }, s => { s.media.gallery.images[0].id = "unknown"; },
    s => { s.translations.en.massage.cards.unknown = { title: "extra" }; },
    s => { delete s.translations.tr.massage.cards[SPA_MASSAGE_IDS[0]]; },
    s => { s.media.hero.image = "/uploads/pages/spawellness/../about/hero.jpg"; },
    s => { s.media.hero.image = "/uploads/pages/about/hero.jpg"; },
    s => { s.media.hero.width = 0; }, s => { s.media.hero.height = 16_000_000; },
  ];
  for (const mutate of mutations) { const invalid = structuredClone(seed); mutate(invalid); assert.throws(() => validateSpaWellnessContent(invalid)); }
});

test("eksik/bozuk JSON, eksik/sahte/symlink görsel, gerçek tür ve ölçü uyuşmazlığı açık hata verir", async (t) => {
  const paths = await fixture(t);
  for (const mutate of [s => s.media.hero.width++, s => s.media.hero.image = "/uploads/pages/spawellness/absent.webp",
    s => s.media.gallery.images[3].width++]) {
    const invalid = structuredClone(seed); mutate(invalid);
    await writeFile(spaWellnessFile(paths), JSON.stringify(invalid));
    await assert.rejects(readSpaWellnessContent(paths), /Spa görseli/);
  }
  await writeFile(spaWellnessFile(paths), JSON.stringify(seed));
  const target = path.join(paths.uploadsRoot, "pages/spawellness/hero.webp");
  await writeFile(target, "fake image"); await assert.rejects(readSpaWellnessContent(paths), /Spa görseli/);
  await writeFile(target, await sharp({ create: { width: 10, height: 10, channels: 3, background: "red" } }).png().toBuffer());
  await assert.rejects(readSpaWellnessContent(paths), /imzası/);
  await rm(target); await symlink(path.join(root, "public/uploads/pages/spawellness/hero.webp"), target);
  await assert.rejects(readSpaWellnessContent(paths), /Spa görseli/);
  await assert.rejects(readSpaWellnessPageLocale("fr", paths), /Desteklenmeyen/);
  await writeFile(spaWellnessFile(paths), "{"); await assert.rejects(readSpaWellnessContent(paths), /verisi okunamadı/);
  await rm(spaWellnessFile(paths)); await assert.rejects(readSpaWellnessContent(paths), /verisi okunamadı/);
});

test("seed ilk kurulumu yapar; tekrarda değiştirilmiş metinleri ve görsel dosyasını ezmez", async (t) => {
  const paths = await fixture(t);
  await rm(spaWellnessFile(paths)); await rm(path.join(paths.uploadsRoot, "pages/spawellness"), { recursive: true });
  const env = { ...process.env, AZURA_CONTENT_ROOT: paths.contentRoot, AZURA_UPLOADS_ROOT: paths.uploadsRoot };
  await run(process.execPath, ["scripts/seed-persistent-spawellness.mjs"], { cwd: root, env });
  assert.deepEqual(await readSpaWellnessContent(paths), seed);
  const custom = structuredClone(seed); custom.translations.en.hero.title = " Persistent title ";
  const replacement = await readFile(path.join(paths.uploadsRoot, "pages/spawellness/indoor.webp"));
  custom.media.hero.width = seed.media.types.indoor.width; custom.media.hero.height = seed.media.types.indoor.height;
  await writeFile(path.join(paths.uploadsRoot, "pages/spawellness/hero.webp"), replacement);
  await writeFile(spaWellnessFile(paths), JSON.stringify(custom));
  const before = await readFile(spaWellnessFile(paths));
  await run(process.execPath, ["scripts/seed-persistent-spawellness.mjs"], { cwd: root, env });
  assert.deepEqual(await readFile(spaWellnessFile(paths)), before);
  assert.deepEqual(await readFile(path.join(paths.uploadsRoot, "pages/spawellness/hero.webp")), replacement);
  await writeFile(spaWellnessFile(paths), "{");
  await assert.rejects(run(process.execPath, ["scripts/seed-persistent-spawellness.mjs"], { cwd: root, env }));
  assert.equal(await readFile(spaWellnessFile(paths), "utf8"), "{");
});

test('kanonik revision, paralel kayıt, başarısız kuyruk sonrası kayıt ve kök metadata korunur',async(t)=>{
  const {readSpaWellnessPageContent,writeSpaWellnessPageContent,spaWellnessPageRevision}=await import('./azura-spawellness-storage.mjs');
  const paths=await fixture(t);
  await writeFile(spaWellnessFile(paths),JSON.stringify({...seed,customMetadata:{keep:true}}));
  const initial=await readSpaWellnessPageContent(paths);
  assert.match(initial.revision,/^[a-f0-9]{64}$/);
  const reordered=Object.fromEntries(Object.entries(initial.bundle).reverse());
  assert.equal(spaWellnessPageRevision(reordered,initial.media),initial.revision);
  const first=structuredClone(initial.bundle),second=structuredClone(initial.bundle);
  first.tr.hero.title='İlk';second.tr.hero.title='İkinci';
  const results=await Promise.allSettled([
    writeSpaWellnessPageContent(first,initial.media,initial.revision,paths),
    writeSpaWellnessPageContent(second,initial.media,initial.revision,paths),
  ]);
  assert.equal(results[0].status,'fulfilled');assert.equal(results[1].reason.status,409);
  const before=await readFile(spaWellnessFile(paths));
  await assert.rejects(writeSpaWellnessPageContent(second,initial.media,initial.revision,paths),e=>e.status===409);
  assert.deepEqual(await readFile(spaWellnessFile(paths)),before);
  const current=await readSpaWellnessPageContent(paths);
  await writeSpaWellnessPageContent(second,current.media,current.revision,paths);
  const saved=JSON.parse(await readFile(spaWellnessFile(paths),'utf8'));
  assert.deepEqual(saved.customMetadata,{keep:true});assert.equal(saved.pageKey,'spawellness');assert.equal(saved.schemaVersion,1);
  assert.ok(!Object.hasOwn(saved,'revision'));
});

test("Spa medya kapsamı gerçek JPEG/PNG/WebP kabul eder; limitleri, sahte dosyayı, symlink ve üzerine yazmayı engeller", async (t) => {
  const { saveSpaWellnessImage, listSpaWellnessImages } = await import('./azura-homepage-media.mjs');
  const paths = await fixture(t);
  for (const [format, mime] of [['jpeg', 'image/jpeg'], ['png', 'image/png'], ['webp', 'image/webp']]) {
    const bytes = await sharp({create:{width:24,height:32,channels:3,background:'blue'}})[format]().toBuffer();
    const result = await saveSpaWellnessImage(bytes,mime,paths,()=>format);
    assert.equal(result.width,24);assert.equal(result.height,32);assert.equal(result.mimeType,mime);
    const target = path.join(paths.uploadsRoot,result.image.slice('/uploads/'.length));
    await assert.rejects(saveSpaWellnessImage(bytes,mime,paths,()=>format));
    assert.deepEqual(await readFile(target),bytes);
  }
  await assert.rejects(saveSpaWellnessImage(Buffer.from('<svg/>'),'image/png',paths));
  await assert.rejects(saveSpaWellnessImage(Buffer.alloc(8*1024*1024+1),'image/png',paths),e=>e.status===413);
  const large=await sharp({create:{width:4001,height:4000,channels:3,background:'white'}}).png().toBuffer();
  await assert.rejects(saveSpaWellnessImage(large,'image/png',paths));
  const source=path.join(paths.uploadsRoot,'pages/spawellness/hero.webp');
  const linked=path.join(paths.uploadsRoot,'pages/spawellness/spawellness-linked.webp');
  await symlink(source,linked);
  const original=await readFile(source);
  await assert.rejects(saveSpaWellnessImage(original,'image/webp',paths,()=> 'linked'));
  assert.deepEqual(await readFile(source),original);
  await writeFile(path.join(paths.uploadsRoot,'pages/spawellness/fake.png'),'not an image');
  const list=await listSpaWellnessImages(paths);
  assert.equal(list.length,15);
  assert.ok(list.every(r=>r.image.startsWith('/uploads/pages/spawellness/') && r.modifiedAt));
  assert.ok(!list.some(r=>r.image.includes('linked') || r.image.includes('fake')));
});
