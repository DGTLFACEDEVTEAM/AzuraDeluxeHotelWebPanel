import { createHash, randomUUID } from "node:crypto";
import { open, readFile, realpath, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";

export const LOCALES = ["tr", "en", "de", "ru"];
const IMAGE_PATH = /^\/uploads\/pages\/homepage\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.(?:jpg|jpeg|png|webp)$/i;
const TEXT_LIMITS = {
  subtitle: 200,
  title: 250,
  text1: 2000,
  text2: 2000,
  buttonText: 120,
};
const REVISION = /^[a-f0-9]{64}$/;
let homepageWriteQueue = Promise.resolve();

export class HomepageContentError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "HomepageContentError";
    this.status = status;
  }
}

function requireRoot(value, name) {
  if (!value || !path.isAbsolute(value)) {
    throw new Error(`${name} mutlak bir kalıcı dizin yolu olarak tanımlanmalıdır.`);
  }
  return path.resolve(value);
}

export function resolveAzuraPaths({
  appRoot = process.cwd(),
  contentRoot = process.env.AZURA_CONTENT_ROOT,
  uploadsRoot = process.env.AZURA_UPLOADS_ROOT,
  production = process.env.NODE_ENV === "production",
} = {}) {
  if (production) {
    return {
      contentRoot: requireRoot(contentRoot, "AZURA_CONTENT_ROOT"),
      uploadsRoot: requireRoot(uploadsRoot, "AZURA_UPLOADS_ROOT"),
    };
  }

  return {
    contentRoot: contentRoot ? requireRoot(contentRoot, "AZURA_CONTENT_ROOT") : path.join(appRoot, "content"),
    uploadsRoot: uploadsRoot ? requireRoot(uploadsRoot, "AZURA_UPLOADS_ROOT") : path.join(appRoot, "public", "uploads"),
  };
}

export function homepageFile(paths) {
  return path.join(paths.contentRoot, "site-pages", "homepage.json");
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) {
    throw new HomepageContentError(`${label} alanı beklenen biçimde değil.`);
  }
}

function validateImage(item, label) {
  exactKeys(item, ["image", "translations"], label);
  if (typeof item.image !== "string" || !IMAGE_PATH.test(item.image) || item.image.includes("..")) {
    throw new HomepageContentError(`${label} için geçersiz görsel yolu.`);
  }
  exactKeys(item.translations, LOCALES, `${label}.translations`);
  for (const locale of LOCALES) {
    exactKeys(item.translations[locale], ["alt"], `${label}.translations.${locale}`);
    const alt = item.translations[locale].alt;
    if (typeof alt !== "string" || !alt.trim() || alt.length > 300) {
      throw new HomepageContentError(`${label} için ${locale} alt metni geçersiz.`);
    }
  }
  return item;
}

export function validateExperience(experience) {
  exactKeys(experience, ["background", "foreground"], "experience");
  validateImage(experience.background, "experience.background");
  validateImage(experience.foreground, "experience.foreground");
  return experience;
}

export function validateExperienceText(experienceText) {
  exactKeys(experienceText, LOCALES, "experienceText");
  for (const locale of LOCALES) {
    exactKeys(experienceText[locale], Object.keys(TEXT_LIMITS), `experienceText.${locale}`);
    for (const [field, limit] of Object.entries(TEXT_LIMITS)) {
      const value = experienceText[locale][field];
      if (typeof value !== "string" || !value.trim() || value.length > limit || /[\u0000-\u001f\u007f]/.test(value)) {
        throw new HomepageContentError(`experienceText.${locale}.${field} geçersiz veya çok uzun.`);
      }
    }
  }
  return experienceText;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function revisionFor(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function getExperienceRevision(experience) {
  validateExperience(experience);
  return revisionFor(experience);
}

export function getExperienceTextRevision(experienceText) {
  validateExperienceText(experienceText);
  return revisionFor(experienceText);
}

export function parseIfMatch(value) {
  if (value === null || value === undefined || value === "") {
    throw new HomepageContentError("If-Match başlığı zorunludur.", 428);
  }
  const match = /^"([a-f0-9]{64})"$/.exec(value);
  if (!match || !REVISION.test(match[1])) {
    throw new HomepageContentError("If-Match başlığı geçersizdir.");
  }
  return match[1];
}

function enqueueHomepageWrite(operation) {
  const result = homepageWriteQueue.then(operation, operation);
  homepageWriteQueue = result.then(() => undefined, () => undefined);
  return result;
}

export async function assertExperienceImagesExist(experience, paths) {
  const root = await realpath(paths.uploadsRoot);
  for (const item of [experience.background, experience.foreground]) {
    const relative = item.image.slice("/uploads/".length);
    const file = path.join(paths.uploadsRoot, relative);
    let resolved;
    try {
      resolved = await realpath(file);
    } catch {
      throw new HomepageContentError(`Görsel uploads dizininde bulunamadı: ${item.image}`);
    }
    if (!resolved.startsWith(`${root}${path.sep}`) || !(await stat(resolved)).isFile()) {
      throw new HomepageContentError(`Görsel uploads dizini dışında veya dosya değil: ${item.image}`);
    }
  }
}

export async function readHomepageContent(paths = resolveAzuraPaths()) {
  let content;
  try {
    content = JSON.parse(await readFile(homepageFile(paths), "utf8"));
  } catch (error) {
    throw new Error(`Azura homepage verisi okunamadı: ${homepageFile(paths)}`, { cause: error });
  }
  if (content?.schemaVersion !== 1 || content?.pageKey !== "homepage") {
    throw new Error("Azura homepage verisinin sayfa anahtarı veya şema sürümü geçersiz.");
  }
  validateExperience(content.experience);
  if (content.experienceText !== undefined) validateExperienceText(content.experienceText);
  return content;
}

async function writeHomepageContentAtomically(next, paths = resolveAzuraPaths()) {
  const target = homepageFile(paths);
  const temporary = `${target}.${randomUUID()}.tmp`;
  let handle;
  try {
    handle = await open(temporary, "wx", 0o600);
    await handle.writeFile(`${JSON.stringify(next, null, 2)}\n`, "utf8");
    await handle.sync();
    await handle.close();
    handle = null;
    await rename(temporary, target);
    const directory = await open(path.dirname(target), "r");
    try {
      await directory.sync();
    } finally {
      await directory.close();
    }
  } catch (error) {
    if (handle) await handle.close();
    await unlink(temporary).catch(() => {});
    throw error;
  }
  return next;
}

function assertRevision(expected, actual) {
  if (!REVISION.test(expected)) {
    throw new HomepageContentError("Beklenen revision geçersizdir.");
  }
  if (expected !== actual) {
    throw new HomepageContentError("İçerik başka bir kullanıcı tarafından güncellendi.", 409);
  }
}

export async function writeHomepageExperience(experience, expectedRevision, paths = resolveAzuraPaths()) {
  validateExperience(experience);
  return enqueueHomepageWrite(async () => {
    const current = await readHomepageContent(paths);
    assertRevision(expectedRevision, getExperienceRevision(current.experience));
    await assertExperienceImagesExist(experience, paths);
    const next = await writeHomepageContentAtomically({ ...current, experience }, paths);
    return { experience: next.experience, revision: getExperienceRevision(next.experience) };
  });
}

export async function writeHomepageExperienceText(experienceText, expectedRevision, paths = resolveAzuraPaths()) {
  validateExperienceText(experienceText);
  return enqueueHomepageWrite(async () => {
    const current = await readHomepageContent(paths);
    if (!current.experienceText) {
      throw new HomepageContentError("Kalıcı homepage JSON'unda experienceText eksik.", 503);
    }
    assertRevision(expectedRevision, getExperienceTextRevision(current.experienceText));
    const next = await writeHomepageContentAtomically({ ...current, experienceText }, paths);
    return { experienceText: next.experienceText, revision: getExperienceTextRevision(next.experienceText) };
  });
}

export async function ensureHomepageExperienceText(experienceText, paths = resolveAzuraPaths()) {
  validateExperienceText(experienceText);
  return enqueueHomepageWrite(async () => {
    const current = await readHomepageContent(paths);
    if (current.experienceText !== undefined) return current.experienceText;
    const next = await writeHomepageContentAtomically({ ...current, experienceText }, paths);
    return next.experienceText;
  });
}
