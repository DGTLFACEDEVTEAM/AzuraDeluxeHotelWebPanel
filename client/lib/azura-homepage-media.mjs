import { randomUUID } from "node:crypto";
import { link, mkdir, open, readFile, readdir, realpath, stat, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { resolveAzuraPaths } from "./azura-homepage-storage.mjs";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_MULTIPART_BYTES = MAX_IMAGE_BYTES + 128 * 1024;
const MAX_PIXELS = 16_000_000;
const IMAGE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.(?:jpg|jpeg|png|webp)$/i;
const FORMATS = {
  jpeg: { mimeType: "image/jpeg", extension: "jpg" },
  png: { mimeType: "image/png", extension: "png" },
  webp: { mimeType: "image/webp", extension: "webp" },
};

export class HomepageMediaError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "HomepageMediaError";
    this.status = status;
  }
}

export function homepageMediaDir(paths = resolveAzuraPaths()) {
  return path.join(paths.uploadsRoot, "pages", "homepage");
}

function sniffFormat(bytes) {
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) return "jpeg";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP" && bytes.readUInt32LE(4) === bytes.length - 8) return "webp";
  return null;
}

export async function inspectHomepageImage(bytes, mimeType) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
    throw new HomepageMediaError("Boş veya geçersiz görsel dosyası.");
  }
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new HomepageMediaError("Görsel 8 MiB sınırını aşıyor.", 413);
  }
  const format = sniffFormat(bytes);
  if (!format || FORMATS[format].mimeType !== mimeType) {
    throw new HomepageMediaError("Dosya türü ve gerçek görsel imzası eşleşmiyor.", 415);
  }

  try {
    const image = sharp(bytes, { failOn: "error", limitInputPixels: MAX_PIXELS });
    const metadata = await image.metadata();
    if (metadata.format !== format || !metadata.width || !metadata.height ||
        metadata.width * metadata.height > MAX_PIXELS || metadata.pages > 1) {
      throw new HomepageMediaError("Desteklenmeyen veya çok büyük görsel boyutları.");
    }
    await image.stats();
    return {
      mimeType: FORMATS[format].mimeType,
      extension: FORMATS[format].extension,
      size: bytes.length,
      width: metadata.width,
      height: metadata.height,
    };
  } catch (error) {
    if (error instanceof HomepageMediaError) throw error;
    throw new HomepageMediaError("Görsel dosyası çözülemedi veya bozuk.", 415);
  }
}

async function safeMediaDir(paths, create = false) {
  if (create) await mkdir(paths.uploadsRoot, { recursive: true });
  const root = await realpath(paths.uploadsRoot);
  if (create) {
    const pages = path.join(root, "pages");
    await mkdir(pages).catch((error) => { if (error.code !== "EEXIST") throw error; });
    const resolvedPages = await realpath(pages);
    if (!resolvedPages.startsWith(`${root}${path.sep}`) || !(await stat(resolvedPages)).isDirectory()) {
      throw new HomepageMediaError("Homepage uploads üst dizini güvenli değil.");
    }
    await mkdir(path.join(resolvedPages, "homepage")).catch((error) => {
      if (error.code !== "EEXIST") throw error;
    });
  }
  const folder = await realpath(homepageMediaDir(paths));
  if (!folder.startsWith(`${root}${path.sep}`) || !(await stat(folder)).isDirectory()) {
    throw new HomepageMediaError("Homepage uploads dizini güvenli değil.");
  }
  return folder;
}

export async function saveHomepageImage(bytes, mimeType, paths = resolveAzuraPaths(), idFactory = randomUUID) {
  const info = await inspectHomepageImage(bytes, mimeType);
  const folder = await safeMediaDir(paths, true);
  const name = `homepage-${idFactory()}.${info.extension}`;
  if (!IMAGE_NAME.test(name) || name.includes("..")) {
    throw new HomepageMediaError("Sunucu dosya adı oluşturamadı.");
  }
  const finalFile = path.join(folder, name);
  const temporary = path.join(folder, `.${name}.${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(temporary, "wx", 0o600);
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = null;
    await link(temporary, finalFile);
  } catch (error) {
    if (handle) await handle.close();
    await unlink(temporary).catch(() => {});
    if (error.code === "EEXIST") throw new HomepageMediaError("Görsel dosya adı çakıştı; mevcut dosya korundu.", 409);
    throw error;
  }
  await unlink(temporary);
  const directory = await open(folder, "r");
  try {
    await directory.sync();
  } finally {
    await directory.close();
  }
  return { image: `/uploads/pages/homepage/${name}`, mimeType: info.mimeType, size: info.size, width: info.width, height: info.height };
}

export async function listHomepageImages(paths = resolveAzuraPaths()) {
  let folder;
  try {
    folder = await safeMediaDir(paths);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const records = [];
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    if (!entry.isFile() || !IMAGE_NAME.test(entry.name) || entry.name.includes("..")) continue;
    const extension = path.extname(entry.name).toLowerCase();
    const mimeType = extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" :
      extension === ".png" ? "image/png" : "image/webp";
    const file = path.join(folder, entry.name);
    try {
      const details = await stat(file);
      if (details.size === 0 || details.size > MAX_IMAGE_BYTES) continue;
      const info = await inspectHomepageImage(await readFile(file), mimeType);
      records.push({
        image: `/uploads/pages/homepage/${entry.name}`,
        mimeType: info.mimeType,
        size: info.size,
        width: info.width,
        height: info.height,
        modifiedAt: details.mtime.toISOString(),
      });
    } catch (error) {
      if (!(error instanceof HomepageMediaError) && error.code !== "ENOENT") throw error;
    }
  }
  return records.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt) || a.image.localeCompare(b.image));
}
