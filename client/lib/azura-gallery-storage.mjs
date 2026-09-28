import { createHash, randomUUID } from "node:crypto";
import { canonicalJson, enqueuePageWrite, writePageAtomically } from "./azura-page-storage.mjs";
import { constants } from "node:fs";
import { open, readFile, realpath, lstat } from "node:fs/promises";
import path from "node:path";
import { LOCALES, resolveAzuraPaths } from "./azura-homepage-storage.mjs";
import { createPageValidators } from "./azura-page-content-validation.mjs";
import { inspectHomepageImage } from "./azura-homepage-media.mjs";
export const GALLERY_CATEGORY_IDS = Object.freeze(["general", "rooms", "flavours", "bar", "pool", "entertainment", "kidsclub", "spa", "meeting"]);
export class GalleryContentError extends Error {
  constructor(message, status = 400) { super(message); this.name = "GalleryContentError"; this.status = status; }
}
const { keys, text } = createPageValidators("gallery", GalleryContentError);
const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.(jpg|jpeg|png|webp)$/i;
function filename(src) {
  if (typeof src !== "string" || !src.startsWith("/uploads/gallery/")) throw new GalleryContentError("Geçersiz galeri görsel yolu.");
  const name = src.slice("/uploads/gallery/".length);
  if (!NAME.test(name) || name.includes("..")) throw new GalleryContentError("Geçersiz galeri dosya adı.");
  return name;
}
export function validateGalleryContent(c) {
  if (!c || typeof c !== "object" || Array.isArray(c)) throw new GalleryContentError("Geçersiz galeri.");
  // Existing root metadata belongs to the file and is preserved by PATCH.
  if (c.schemaVersion !== 1 || !Array.isArray(c.categories) || c.categories.length !== GALLERY_CATEGORY_IDS.length) throw new GalleryContentError("Geçersiz galeri sürümü/kategorileri.");
  const ids = new Set();
  c.categories.forEach((category, i) => {
    keys(category, ["id", "images"], "category");
    if (category.id !== GALLERY_CATEGORY_IDS[i] || !Array.isArray(category.images)) throw new GalleryContentError("Geçersiz kategori kimliği/sırası.");
    category.images.forEach((record, order) => {
      keys(record, ["id", "src", "order", "width", "height", "translations"], "image");
      if (typeof record.id !== "string" || !/^[a-z0-9][a-z0-9-]{0,127}$/.test(record.id) || ids.has(record.id) || record.order !== order) throw new GalleryContentError("Geçersiz/tekrarlanan görsel kimliği veya sıra.");
      ids.add(record.id); filename(record.src);
      if (!Number.isInteger(record.width) || !Number.isInteger(record.height) || record.width < 1 || record.height < 1 || record.width * record.height > 16_000_000) throw new GalleryContentError("Geçersiz görsel ölçüsü.");
      keys(record.translations, LOCALES, "translations");
      for (const locale of LOCALES) { keys(record.translations[locale], ["alt"], locale); text(record.translations[locale].alt, `${locale}.alt`, 300); }
    });
  });
  return c;
}
// Gallery is a separate collection scope, not a fixed site-page media section.
export async function readGalleryImage(src, paths = resolveAzuraPaths()) {
  const name = filename(src); let handle;
  try {
    const root = await realpath(paths.uploadsRoot), directory = path.join(root, "gallery");
    if ((await lstat(directory)).isSymbolicLink() || await realpath(directory) !== directory) throw new Error("Güvenli olmayan galeri dizini");
    handle = await open(path.join(directory, name), constants.O_RDONLY | constants.O_NOFOLLOW);
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > 8 * 1024 * 1024) throw new Error("Geçersiz galeri dosyası");
    const bytes = await handle.readFile();
    const ext = path.extname(name).toLowerCase();
    const info = await inspectHomepageImage(bytes, ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg");
    return { bytes, info };
  } catch (e) { throw new GalleryContentError(`Galeri görseli okunamadı: ${src} (${e.message})`); }
  finally { if (handle) await handle.close(); }
}
export function galleryFile(paths = resolveAzuraPaths()) { return path.join(paths.contentRoot, "gallery/gallery.json"); }
export async function readGalleryContent(paths = resolveAzuraPaths()) {
  let c;
  try { c = JSON.parse(await readFile(galleryFile(paths), "utf8")); }
  catch (e) { throw new GalleryContentError(`Galeri okunamadı: ${e.message}`); }
  validateGalleryContent(c);
  await validateGalleryFiles(c, paths);
  return c;
}
export async function validateGalleryFiles(c, paths = resolveAzuraPaths()) {
  validateGalleryContent(c);
  const inspected = new Map();
  for (const category of c.categories) for (const record of category.images) {
    if (!inspected.has(record.src)) inspected.set(record.src, (await readGalleryImage(record.src, paths)).info);
    const actual = inspected.get(record.src);
    if (actual.width !== record.width || actual.height !== record.height) throw new GalleryContentError(`Galeri gerçek ölçüleri eşleşmiyor: ${record.src}`);
  }
  return c;
}
export async function readGalleryLocale(locale, paths = resolveAzuraPaths()) {
  if (!LOCALES.includes(locale)) throw new GalleryContentError("Geçersiz dil.");
  const c = await readGalleryContent(paths);
  return c.categories.map(category => ({ id: category.id, images: category.images.map(r => ({ id: r.id, src: r.src, width: r.width, height: r.height, alt: r.translations[locale].alt })) }));
}

export function galleryRevision(gallery) {
  validateGalleryContent(gallery);
  return createHash("sha256").update(canonicalJson(gallery)).digest("hex");
}
export async function readGalleryManagement(paths = resolveAzuraPaths()) {
  const gallery = await readGalleryContent(paths);
  return { gallery, revision: galleryRevision(gallery) };
}
export function validateGalleryAction(body) {
  const fields = {
    add: ["action", "categoryId", "src", "translations"],
    reorder: ["action", "categoryId", "imageIds"],
    update: ["action", "categoryId", "imageId", "translations"],
    remove: ["action", "categoryId", "imageId"],
  };
  if (!body || typeof body.action !== "string" || !Object.hasOwn(fields, body.action)) throw new GalleryContentError("Geçersiz galeri işlemi.");
  keys(body, fields[body.action], "action");
  if (typeof body.categoryId !== "string") throw new GalleryContentError("Geçersiz kategori.");
  if (!GALLERY_CATEGORY_IDS.includes(body.categoryId)) throw new GalleryContentError("Kategori bulunamadı.", 404);
  if (body.action === "add") filename(body.src);
  if (["add", "update"].includes(body.action)) {
    keys(body.translations, LOCALES, "translations");
    for (const locale of LOCALES) { keys(body.translations[locale], ["alt"], locale); text(body.translations[locale].alt, `${locale}.alt`, 300); }
  }
  if (["update", "remove"].includes(body.action) && (typeof body.imageId !== "string" || !body.imageId)) throw new GalleryContentError("Geçersiz kayıt kimliği.");
  if (body.action === "reorder" && (!Array.isArray(body.imageIds) || body.imageIds.some(id => typeof id !== "string"))) throw new GalleryContentError("Geçersiz sıra listesi.");
  return body;
}
export async function patchGallery(body, expectedRevision, paths = resolveAzuraPaths()) {
  // Clone so queued operations cannot observe a caller mutating the request object.
  const action = structuredClone(validateGalleryAction(body));
  return enqueuePageWrite(galleryFile(paths), async () => {
    const gallery = await readGalleryContent(paths);
    if (galleryRevision(gallery) !== expectedRevision) throw new GalleryContentError("Galeri başka bir kayıtla değişti.", 409);
    const category = gallery.categories.find(c => c.id === action.categoryId);
    if (action.action === "add") {
      if (category.images.some(r => r.src === action.src)) throw new GalleryContentError("Görsel bu kategoride zaten var.", 409);
      const { info } = await readGalleryImage(action.src, paths);
      category.images.push({ id: `gallery-${randomUUID()}`, src: action.src, order: category.images.length, width: info.width, height: info.height, translations: action.translations });
    } else if (action.action === "reorder") {
      const records = new Map(category.images.map(r => [r.id, r]));
      if (action.imageIds.length !== records.size || new Set(action.imageIds).size !== records.size || action.imageIds.some(id => !records.has(id))) throw new GalleryContentError("Sıra listesi kategorinin tüm kayıtlarını tam bir kez içermeli.");
      category.images = action.imageIds.map(id => records.get(id));
    } else {
      const index = category.images.findIndex(r => r.id === action.imageId);
      if (index < 0) throw new GalleryContentError("Kategori kaydı bulunamadı.", 404);
      if (action.action === "update") category.images[index].translations = action.translations;
      else category.images.splice(index, 1); // Never delete physical media.
    }
    category.images.forEach((record, order) => { record.order = order; });
    await validateGalleryFiles(gallery, paths);
    const revision = galleryRevision(gallery);
    await writePageAtomically(gallery, galleryFile(paths));
    return { gallery, revision };
  });
}
