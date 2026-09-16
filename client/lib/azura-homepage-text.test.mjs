import assert from "node:assert/strict";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  HomepageContentError,
  getExperienceTextRevision,
  homepageFile,
  readHomepageContent,
  resolveAzuraPaths,
  validateExperienceText,
  writeHomepageExperienceText,
} from "./azura-homepage-storage.mjs";

const run = promisify(execFile);
const appRoot = path.resolve(import.meta.dirname, "..");
const seed = JSON.parse(await readFile(path.join(appRoot, "content", "site-pages", "homepage.json"), "utf8"));

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "azura-text-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = resolveAzuraPaths({
    contentRoot: path.join(root, "content"),
    uploadsRoot: path.join(root, "uploads"),
    production: true,
  });
  await mkdir(path.dirname(homepageFile(paths)), { recursive: true });
  return paths;
}

test("dört dil ve beş alan tam olmalı; geçersiz PUT dosyayı değiştirmez", async (t) => {
  const paths = await fixture(t);
  const original = { ...seed, futureField: { keep: "yes" } };
  await writeFile(homepageFile(paths), JSON.stringify(original));
  const before = await readFile(homepageFile(paths));
  const revision = getExperienceTextRevision(seed.experienceText);
  const mutations = [
    (value) => { delete value.ru; },
    (value) => { delete value.tr.text2; },
    (value) => { value.en.extra = "not allowed"; },
    (value) => { value.tr.title = "   "; },
    (value) => { value.de.buttonText = "x".repeat(121); },
    (value) => { value.ru.text1 = "bad\u0000text"; },
    (value) => { value.en.subtitle = 123; },
  ];
  for (const mutate of mutations) {
    const input = structuredClone(seed.experienceText);
    mutate(input);
    await assert.rejects(writeHomepageExperienceText(input, revision, paths), HomepageContentError);
    assert.deepEqual(await readFile(homepageFile(paths)), before);
  }

  const updated = structuredClone(seed.experienceText);
  updated.tr.title = "  Yeni Azura başlığı";
  const result = await writeHomepageExperienceText(updated, revision, paths);
  assert.equal(result.revision, getExperienceTextRevision(updated));
  const saved = await readHomepageContent(paths);
  assert.equal(saved.experienceText.tr.title, "  Yeni Azura başlığı");
  assert.deepEqual(saved.experience, original.experience);
  assert.deepEqual(saved.futureField, original.futureField);
});

test("seed eski kalıcı JSON'a metinleri ekler ve tekrar çalışınca güncellenmiş metni korur", async (t) => {
  const paths = await fixture(t);
  const old = structuredClone(seed);
  delete old.experienceText;
  old.experience.background.translations.tr.alt = "Kalıcı özelleştirilmiş görsel açıklaması";
  old.otherContent = { untouched: true };
  await writeFile(homepageFile(paths), JSON.stringify(old));
  const env = {
    ...process.env,
    AZURA_CONTENT_ROOT: paths.contentRoot,
    AZURA_UPLOADS_ROOT: paths.uploadsRoot,
  };
  await run(process.execPath, ["scripts/seed-persistent-homepage.mjs"], { cwd: appRoot, env });
  const migrated = await readHomepageContent(paths);
  assert.deepEqual(migrated.experienceText, seed.experienceText);
  assert.deepEqual(migrated.experience, old.experience);
  assert.deepEqual(migrated.otherContent, old.otherContent);
  const updated = structuredClone(migrated.experienceText);
  updated.en.buttonText = "Current saved text";
  await writeHomepageExperienceText(
    updated,
    getExperienceTextRevision(migrated.experienceText),
    paths,
  );
  await run(process.execPath, ["scripts/seed-persistent-homepage.mjs"], { cwd: appRoot, env });
  assert.equal((await readHomepageContent(paths)).experienceText.en.buttonText, "Current saved text");
});

test("başlangıç metinleri mevcut alan sınırlarına uygundur", () => {
  assert.equal(validateExperienceText(seed.experienceText), seed.experienceText);
});
