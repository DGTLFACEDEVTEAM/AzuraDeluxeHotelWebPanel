import { randomUUID } from "node:crypto";
import { open, readFile, realpath, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";

export const LOCALES = ["tr", "en", "de", "ru"];
const IMAGE_PATH = /^\/uploads\/pages\/homepage\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.(?:jpg|jpeg|png|webp)$/i;

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
  return content;
}

export async function writeHomepageExperience(experience, paths = resolveAzuraPaths()) {
  validateExperience(experience);
  await assertExperienceImagesExist(experience, paths);
  const current = await readHomepageContent(paths);
  const next = { ...current, experience };
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
  return next.experience;
}
