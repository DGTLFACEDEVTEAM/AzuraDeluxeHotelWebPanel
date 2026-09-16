import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  HomepageContentError,
  getExperienceRevision,
  getExperienceTextRevision,
  homepageFile,
  parseIfMatch,
  readHomepageContent,
  resolveAzuraPaths,
  writeHomepageExperience,
  writeHomepageExperienceText,
} from "./azura-homepage-storage.mjs";

const appRoot = path.resolve(import.meta.dirname, "..");
const seed = JSON.parse(await readFile(path.join(appRoot, "content", "site-pages", "homepage.json"), "utf8"));

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "azura-concurrency-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = resolveAzuraPaths({
    contentRoot: path.join(root, "content"),
    uploadsRoot: path.join(root, "uploads"),
    production: true,
  });
  await mkdir(path.dirname(homepageFile(paths)), { recursive: true });
  await mkdir(path.join(paths.uploadsRoot, "pages", "homepage"), { recursive: true });
  await writeFile(homepageFile(paths), JSON.stringify({ ...seed, futureField: { preserved: true } }));
  for (const image of ["experience-background.jpg", "experience-foreground.jpg"]) {
    await copyFile(
      path.join(appRoot, "public", "uploads", "pages", "homepage", image),
      path.join(paths.uploadsRoot, "pages", "homepage", image),
    );
  }
  return paths;
}

function expectStatus(status) {
  return (error) => error instanceof HomepageContentError && error.status === status;
}

test("revision doğrulanmış içeriğin kararlı 64 karakterlik SHA-256 değeridir", () => {
  const imageRevision = getExperienceRevision(seed.experience);
  const textRevision = getExperienceTextRevision(seed.experienceText);
  assert.match(imageRevision, /^[a-f0-9]{64}$/);
  assert.match(textRevision, /^[a-f0-9]{64}$/);
  assert.notEqual(imageRevision, textRevision);

  const reordered = {
    foreground: seed.experience.foreground,
    background: seed.experience.background,
  };
  assert.equal(getExperienceRevision(reordered), imageRevision);
});

test("If-Match eksikse 428, tırnaksız veya biçimsizse 400 döner", () => {
  assert.throws(() => parseIfMatch(), expectStatus(428));
  assert.throws(() => parseIfMatch(""), expectStatus(428));
  assert.throws(() => parseIfMatch("0".repeat(64)), expectStatus(400));
  assert.throws(() => parseIfMatch('"ABC"'), expectStatus(400));
  const revision = getExperienceRevision(seed.experience);
  assert.equal(parseIfMatch(`"${revision}"`), revision);
});

test("eski revision 409 döndürür ve dosyayı değiştirmez", async (t) => {
  const paths = await fixture(t);
  const before = await readFile(homepageFile(paths));
  const update = structuredClone(seed.experience);
  update.background.translations.en.alt = "Stale revision must not save";

  await assert.rejects(writeHomepageExperience(update, "0".repeat(64), paths), expectStatus(409));
  assert.deepEqual(await readFile(homepageFile(paths)), before);
});

test("görsel ve metin paralel kaydedildiğinde ikisi de ve diğer alanlar korunur", async (t) => {
  const paths = await fixture(t);
  const originalImageRevision = getExperienceRevision(seed.experience);
  const originalTextRevision = getExperienceTextRevision(seed.experienceText);
  const experience = structuredClone(seed.experience);
  const experienceText = structuredClone(seed.experienceText);
  experience.foreground.translations.de.alt = "Parallel gespeichertes Azura Bild";
  experienceText.ru.title = "Параллельно сохранённый заголовок Azura";

  const [imageResult, textResult] = await Promise.all([
    writeHomepageExperience(experience, originalImageRevision, paths),
    writeHomepageExperienceText(experienceText, originalTextRevision, paths),
  ]);
  const saved = await readHomepageContent(paths);
  assert.deepEqual(saved.experience, experience);
  assert.deepEqual(saved.experienceText, experienceText);
  assert.deepEqual(saved.futureField, { preserved: true });
  assert.equal(imageResult.revision, getExperienceRevision(experience));
  assert.equal(textResult.revision, getExperienceTextRevision(experienceText));
});

for (const field of ["experience", "experienceText"]) {
  test(`aynı revision ile iki paralel ${field} kaydından yalnızca biri başarılı olur`, async (t) => {
    const paths = await fixture(t);
    const first = structuredClone(seed[field]);
    const second = structuredClone(seed[field]);
    const revision = field === "experience"
      ? getExperienceRevision(seed.experience)
      : getExperienceTextRevision(seed.experienceText);
    if (field === "experience") {
      first.background.translations.tr.alt = "Birinci eşzamanlı görsel kaydı";
      second.background.translations.tr.alt = "İkinci eşzamanlı görsel kaydı";
    } else {
      first.tr.title = "Birinci eşzamanlı metin kaydı";
      second.tr.title = "İkinci eşzamanlı metin kaydı";
    }

    const write = field === "experience" ? writeHomepageExperience : writeHomepageExperienceText;
    const results = await Promise.allSettled([
      write(first, revision, paths),
      write(second, revision, paths),
    ]);
    assert.equal(results.filter(({ status }) => status === "fulfilled").length, 1);
    const rejected = results.find(({ status }) => status === "rejected");
    assert.ok(rejected.reason instanceof HomepageContentError);
    assert.equal(rejected.reason.status, 409);

    const saved = await readHomepageContent(paths);
    assert.ok(
      JSON.stringify(saved[field]) === JSON.stringify(first) ||
      JSON.stringify(saved[field]) === JSON.stringify(second),
    );
    assert.deepEqual(saved.futureField, { preserved: true });
  });
}

test("alan revision'ları bağımsızdır ve başarısız işlem yazma kuyruğunu kilitlemez", async (t) => {
  const paths = await fixture(t);
  const initialImageRevision = getExperienceRevision(seed.experience);
  const initialTextRevision = getExperienceTextRevision(seed.experienceText);
  const experienceText = structuredClone(seed.experienceText);
  experienceText.en.subtitle = "Text-only revision update";
  await writeHomepageExperienceText(experienceText, initialTextRevision, paths);
  let saved = await readHomepageContent(paths);
  assert.equal(getExperienceRevision(saved.experience), initialImageRevision);

  const experience = structuredClone(saved.experience);
  experience.foreground.translations.en.alt = "Image-only revision update";
  await writeHomepageExperience(experience, initialImageRevision, paths);
  saved = await readHomepageContent(paths);
  assert.equal(getExperienceTextRevision(saved.experienceText), getExperienceTextRevision(experienceText));

  await assert.rejects(
    writeHomepageExperience(experience, initialImageRevision, paths),
    expectStatus(409),
  );
  const nextText = structuredClone(saved.experienceText);
  nextText.de.buttonText = "GALERIE ÖFFNEN";
  await writeHomepageExperienceText(nextText, getExperienceTextRevision(saved.experienceText), paths);
  assert.deepEqual((await readHomepageContent(paths)).experienceText, nextText);
});
