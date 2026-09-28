import { constants } from "node:fs";
import { copyFile, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveAzuraPaths } from "../lib/azura-homepage-storage.mjs";
import { galleryFile, readGalleryContent, validateGalleryContent } from "../lib/azura-gallery-storage.mjs";

const appRoot = process.cwd();
const paths = resolveAzuraPaths({ appRoot, production: true });
const bytes = await readFile(path.join(appRoot, "content/gallery/gallery.json"));
const seed = validateGalleryContent(JSON.parse(bytes));
await mkdir(path.dirname(galleryFile(paths)), { recursive: true });
const directory = path.join(paths.uploadsRoot, "gallery");
await mkdir(directory, { recursive: true });
if (await realpath(directory) !== path.join(await realpath(paths.uploadsRoot), "gallery")) throw new Error("Güvenli olmayan Gallery seed dizini");
for (const image of new Set(seed.categories.flatMap(category => category.images.map(record => record.src)))) {
  const relative = image.slice("/uploads/".length);
  try { await copyFile(path.join(appRoot, "public/uploads", relative), path.join(paths.uploadsRoot, relative), constants.COPYFILE_EXCL); }
  catch (error) { if (error.code !== "EEXIST") throw error; }
}
try { await writeFile(galleryFile(paths), bytes, { flag: "wx", mode: 0o600 }); }
catch (error) { if (error.code !== "EEXIST") throw error; }
await readGalleryContent(paths);
console.log("Azura Gallery seed tamamlandı; mevcut JSON ve görseller korundu.");
