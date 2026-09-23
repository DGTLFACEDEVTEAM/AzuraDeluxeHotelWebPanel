import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import path from "node:path";
import { LOCALES } from "./azura-homepage-storage.mjs";
import { inspectHomepageImage, MAX_IMAGE_BYTES } from "./azura-homepage-media.mjs";

// Scope is supplied by server code, never by a route parameter.
export function createPageValidators(scope, ContentError) {
  if (!/^[a-z]+$/.test(scope)) throw new Error("Invalid page media scope");
  const imagePattern = new RegExp(`^/uploads/pages/${scope}/[A-Za-z0-9][A-Za-z0-9._-]{0,127}\\.(jpg|jpeg|png|webp)$`, "i");
  function keys(value, expected, label) {
    if (!value || typeof value !== "object" || Array.isArray(value) ||
        Object.keys(value).length !== expected.length || expected.some(key => !Object.hasOwn(value, key))) {
      throw new ContentError(`${label}: eksik veya geçersiz alan.`);
    }
  }

  function text(value, label, max = 4000) {
    if (typeof value !== "string" || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) {
      throw new ContentError(`${label}: geçersiz metin.`);
    }
  }

  function texts(value, fields, label) {
    keys(value, fields, label);
    for (const field of fields) text(value[field], `${label}.${field}`);
  }

  function image(record, label, collection = false, withAlt = true) {
    keys(record, [...(collection ? ["id", "order"] : []), "image", "width", "height", ...(withAlt ? ["translations"] : [])], label);
    if (typeof record.image !== "string" ||
        !imagePattern.test(record.image) ||
        record.image.includes("..")) throw new ContentError(`${label}: geçersiz görsel yolu.`);
    if (!Number.isInteger(record.width) || !Number.isInteger(record.height) || record.width <= 0 ||
        record.height <= 0 || record.width * record.height > 16_000_000) {
      throw new ContentError(`${label}: geçersiz görsel ölçüsü.`);
    }
    if (!withAlt) return;
    keys(record.translations, LOCALES, `${label}.translations`);
    for (const locale of LOCALES) {
      keys(record.translations[locale], ["alt"], `${label}.${locale}`);
      text(record.translations[locale].alt, `${label}.${locale}.alt`, 300);
    }
  }

  function collection(value, ids, label) {
    keys(value, ["images"], label);
    if (!Array.isArray(value.images) || value.images.length !== ids.length) {
      throw new ContentError(`${label}: tam ${ids.length} görsel zorunludur.`);
    }
    value.images.forEach((record, index) => {
      image(record, `${label}.${index}`, true);
      if (record.id !== ids[index] || record.order !== index) {
        throw new ContentError(`${label}: kimlik veya sıra geçersiz.`);
      }
    });
  }

  return { keys, text, texts, image, collection };
}

export async function validatePageImageFiles(records, scope, paths, ContentError, label = scope) {
  // Reused media is decoded once per read; every record still has its dimensions checked.
  const inspected = new Map();
  for (const record of records) {
    let handle;
    try {
      let actual = inspected.get(record.image);
      if (!actual) {
        const root = await realpath(paths.uploadsRoot);
        const file = path.join(paths.uploadsRoot, record.image.slice("/uploads/".length));
        if (await realpath(path.dirname(file)) !== path.join(root, "pages", scope)) throw new Error("Güvenli olmayan dizin");
        handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
        const stat = await handle.stat();
        if (!stat.isFile() || stat.size > MAX_IMAGE_BYTES) throw new Error("Geçersiz dosya");
        const ext = path.extname(file).toLowerCase();
        const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
        actual = await inspectHomepageImage(await handle.readFile(), mime);
        inspected.set(record.image, actual);
      }
      if (actual.width !== record.width || actual.height !== record.height) throw new Error("Gerçek ölçüler JSON ile eşleşmiyor");
    } catch (error) { throw new ContentError(`${label} görseli okunamadı: ${record.image} (${error.message})`); }
    finally { if (handle) await handle.close(); }
  }
}

