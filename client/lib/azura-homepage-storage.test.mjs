import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  HomepageContentError,
  homepageFile,
  readHomepageContent,
  resolveAzuraPaths,
  writeHomepageExperience,
} from "./azura-homepage-storage.mjs";
import { hasValidServiceToken } from "./azura-service-auth.mjs";

const appRoot = path.resolve(import.meta.dirname, "..");

test("servis tokenı eksik veya hatalıysa kabul edilmez", () => {
  const token = randomUUID() + randomUUID();
  assert.equal(hasValidServiceToken(null, token), false);
  assert.equal(hasValidServiceToken("Bearer wrong", token), false);
  assert.equal(hasValidServiceToken(`Bearer ${token}`, token), true);
  assert.equal(hasValidServiceToken(`Bearer ${token}`, "short"), false);
});

test("geçersiz PUT verisi mevcut dosyayı korur; geçerli kayıt diğer alanları korur", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "azura-homepage-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = resolveAzuraPaths({
    appRoot,
    contentRoot: path.join(root, "content"),
    uploadsRoot: path.join(root, "uploads"),
    production: true,
  });
  await mkdir(path.dirname(homepageFile(paths)), { recursive: true });
  await mkdir(path.join(paths.uploadsRoot, "pages", "homepage"), { recursive: true });
  const seed = JSON.parse(await readFile(path.join(appRoot, "content", "site-pages", "homepage.json"), "utf8"));
  seed.futureField = { preserved: true };
  await writeFile(homepageFile(paths), JSON.stringify(seed));
  for (const image of ["experience-background.jpg", "experience-foreground.jpg"]) {
    await copyFile(
      path.join(appRoot, "public", "uploads", "pages", "homepage", image),
      path.join(paths.uploadsRoot, "pages", "homepage", image),
    );
  }
  const before = await readFile(homepageFile(paths));

  const invalidPath = structuredClone(seed.experience);
  invalidPath.background.image = "/uploads/pages/homepage/../../secret.jpg";
  await assert.rejects(writeHomepageExperience(invalidPath, paths), HomepageContentError);
  assert.deepEqual(await readFile(homepageFile(paths)), before);

  const absentImage = structuredClone(seed.experience);
  absentImage.foreground.image = "/uploads/pages/homepage/missing.jpg";
  await assert.rejects(writeHomepageExperience(absentImage, paths), HomepageContentError);
  assert.deepEqual(await readFile(homepageFile(paths)), before);

  const invalidLocale = structuredClone(seed.experience);
  delete invalidLocale.background.translations.ru;
  await assert.rejects(writeHomepageExperience(invalidLocale, paths), HomepageContentError);
  assert.deepEqual(await readFile(homepageFile(paths)), before);

  const updated = structuredClone(seed.experience);
  updated.foreground.translations.tr.alt = "Azura yeni açıklama";
  await writeHomepageExperience(updated, paths);
  const saved = await readHomepageContent(paths);
  assert.equal(saved.experience.foreground.translations.tr.alt, "Azura yeni açıklama");
  assert.deepEqual(saved.futureField, { preserved: true });
  assert.deepEqual(saved.experience.background, seed.experience.background);
});

test("bozuk mevcut JSON üzerine yazılmaz", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "azura-homepage-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = resolveAzuraPaths({
    appRoot,
    contentRoot: path.join(root, "content"),
    uploadsRoot: path.join(root, "uploads"),
    production: true,
  });
  await mkdir(path.dirname(homepageFile(paths)), { recursive: true });
  await mkdir(path.join(paths.uploadsRoot, "pages", "homepage"), { recursive: true });
  for (const image of ["experience-background.jpg", "experience-foreground.jpg"]) {
    await copyFile(
      path.join(appRoot, "public", "uploads", "pages", "homepage", image),
      path.join(paths.uploadsRoot, "pages", "homepage", image),
    );
  }
  await writeFile(homepageFile(paths), "{bozuk JSON");
  const seed = JSON.parse(await readFile(path.join(appRoot, "content", "site-pages", "homepage.json"), "utf8"));
  await assert.rejects(writeHomepageExperience(seed.experience, paths));
  assert.equal(await readFile(homepageFile(paths), "utf8"), "{bozuk JSON");
});
