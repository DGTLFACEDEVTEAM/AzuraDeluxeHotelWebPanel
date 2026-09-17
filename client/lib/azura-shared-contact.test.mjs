import assert from "node:assert/strict";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { HomepageContentError, resolveAzuraPaths } from "./azura-homepage-storage.mjs";
import {
  contactEmailHref, contactPhoneHref, ensureSharedContactDetails, getSharedContactRevision,
  readSharedContactDetails, sharedContactFile, validateSharedContactDetails, writeSharedContactDetails,
} from "./azura-shared-contact-storage.mjs";

const appRoot = path.resolve(import.meta.dirname, "..");
const run = promisify(execFile);
const seed = JSON.parse(await readFile(path.join(appRoot, "content/shared/contact-details.json"), "utf8"));
const locales = ["tr", "en", "de", "ru"];
const messageSources = Object.fromEntries(await Promise.all(locales.map(async (locale) => [
  locale, await readFile(path.join(appRoot, "messages", `${locale}.json`), "utf8"),
])));

async function fixture(t, details = seed) {
  const root = await mkdtemp(path.join(os.tmpdir(), "azura-shared-contact-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = resolveAzuraPaths({
    contentRoot: path.join(root, "content"), uploadsRoot: path.join(root, "uploads"), production: true,
  });
  await mkdir(path.dirname(sharedContactFile(paths)), { recursive: true });
  await writeFile(sharedContactFile(paths), JSON.stringify(details));
  return paths;
}

const status = (expected) => (error) => error instanceof HomepageContentError && error.status === expected;

test("başlangıç verisi görünüm ve dört dilin ContactPage çevirileriyle aynıdır", () => {
  assert.equal(validateSharedContactDetails(seed), seed);
  assert.equal(seed.username, "@AzuraDeluxeResort");
  assert.equal(seed.phone, "+90 242 517 12 34");
  assert.equal(seed.callCenter, "+90 242 277 11 43");
  assert.equal(seed.email, "info@azuradeluxe.com");
  assert.equal(seed.instagramUrl, "https://www.instagram.com/azuradeluxeresort/");
  assert.equal(seed.facebookUrl, "https://www.facebook.com/AzuraDeluxeResort/");
  assert.equal(seed.youtubeUrl, "https://www.youtube.com/channel/UC3Z23WuWOhmpFnbw9fLI1-g");
  assert.equal(seed.reservationUrl, "https://azuradeluxehotel.orsmod.com/");
  assert.deepEqual(Object.keys(seed.translations), locales);
  for (const locale of locales) {
    const message = JSON.parse(messageSources[locale]).ContactPage;
    assert.deepEqual(seed.translations[locale], {
      contactForMore: message.contactForMore,
      address: "Avsallar Mah. İncekum Cad. No:76 Alanya / Turkey",
      phoneLabel: message.phoneColon,
      callCenterLabel: message.callCenter,
      emailLabel: message.emailAddress,
      reservationButtonText: message.bookNow,
    });
  }
  assert.equal(contactPhoneHref(seed.phone), "tel:+902425171234");
  assert.equal(contactPhoneHref(seed.callCenter), "tel:+902422771143");
  assert.equal(contactEmailHref(seed.email), "mailto:info@azuradeluxe.com");
  assert.match(getSharedContactRevision(seed), /^[a-f0-9]{64}$/);
});

test("eksik dil, ek alan, boş/uzun metin ve güvensiz telefon/e-posta/URL reddedilir", async (t) => {
  const paths = await fixture(t);
  const before = await readFile(sharedContactFile(paths));
  const revision = getSharedContactRevision(seed);
  const mutations = [
    (value) => { delete value.translations.ru; },
    (value) => { value.extra = "not allowed"; },
    (value) => { value.translations.tr.address = " "; },
    (value) => { value.translations.en.contactForMore = "x".repeat(201); },
    (value) => { value.phone = "javascript:alert(1)"; },
    (value) => { value.callCenter = "+90 242 277 11 43;evil"; },
    (value) => { value.email = "a@example.com?subject=evil"; },
    (value) => { value.instagramUrl = "http://example.com"; },
    (value) => { value.facebookUrl = "https://user:pass@example.com/"; },
    (value) => { value.reservationUrl = "javascript:alert(1)"; },
  ];
  for (const mutate of mutations) {
    const candidate = structuredClone(seed);
    mutate(candidate);
    await assert.rejects(writeSharedContactDetails(candidate, revision, paths), status(400));
    assert.deepEqual(await readFile(sharedContactFile(paths)), before);
  }
});

test("eski revision 409 verir; geçerli kayıt atomik olarak kalıcı dosyaya yazılır", async (t) => {
  const paths = await fixture(t);
  const before = await readFile(sharedContactFile(paths));
  const changed = structuredClone(seed);
  changed.translations.de.reservationButtonText = "Jetzt reservieren";
  await assert.rejects(writeSharedContactDetails(changed, "0".repeat(64), paths), status(409));
  assert.deepEqual(await readFile(sharedContactFile(paths)), before);
  const result = await writeSharedContactDetails(changed, getSharedContactRevision(seed), paths);
  assert.deepEqual(result, { details: changed, revision: getSharedContactRevision(changed) });
  assert.deepEqual((await readSharedContactDetails(paths)).details, changed);
  assert.equal(Object.hasOwn(JSON.parse(await readFile(sharedContactFile(paths), "utf8")), "revision"), false);
  assert.deepEqual(await readdir(path.dirname(sharedContactFile(paths))), ["contact-details.json"]);
});

test("aynı revision ile paralel kayıtların biri başarılı, diğeri 409 alır", async (t) => {
  const paths = await fixture(t);
  const first = structuredClone(seed);
  const second = structuredClone(seed);
  first.username = "@first";
  second.username = "@second";
  const revision = getSharedContactRevision(seed);
  const results = await Promise.allSettled([
    writeSharedContactDetails(first, revision, paths),
    writeSharedContactDetails(second, revision, paths),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.find((result) => result.status === "rejected").reason.status, 409);
});

test("seed eksik dosyayı oluşturur ve sonraki çalıştırmada özelleştirilmiş veriyi korur", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "azura-shared-contact-seed-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = resolveAzuraPaths({
    contentRoot: path.join(root, "content"), uploadsRoot: path.join(root, "uploads"), production: true,
  });
  await ensureSharedContactDetails(seed, paths);
  assert.deepEqual((await readSharedContactDetails(paths)).details, seed);
  const changed = structuredClone(seed);
  changed.username = "@updated";
  await writeSharedContactDetails(changed, getSharedContactRevision(seed), paths);
  await ensureSharedContactDetails(seed, paths);
  assert.deepEqual((await readSharedContactDetails(paths)).details, changed);
});

test("deployment seed komutu mevcut kalıcı iletişim kaydını ezmez", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "azura-shared-contact-script-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = resolveAzuraPaths({
    contentRoot: path.join(root, "content"), uploadsRoot: path.join(root, "uploads"), production: true,
  });
  const env = { ...process.env, AZURA_CONTENT_ROOT: paths.contentRoot, AZURA_UPLOADS_ROOT: paths.uploadsRoot };
  await run(process.execPath, ["scripts/seed-persistent-homepage.mjs"], { cwd: appRoot, env });
  assert.deepEqual((await readSharedContactDetails(paths)).details, seed);
  const changed = structuredClone(seed);
  changed.translations.ru.address = "Новый постоянный адрес";
  await writeSharedContactDetails(changed, getSharedContactRevision(seed), paths);
  await run(process.execPath, ["scripts/seed-persistent-homepage.mjs"], { cwd: appRoot, env });
  assert.deepEqual((await readSharedContactDetails(paths)).details, changed);
});
