import { constants } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveAzuraPaths } from "../lib/azura-homepage-storage.mjs";
import { spaWellnessFile, spaWellnessImages, readSpaWellnessContent, validateSpaWellnessContent } from "../lib/azura-spawellness-storage.mjs";

const appRoot = process.cwd();
const paths = resolveAzuraPaths({ appRoot, production: true });
const bytes = await readFile(path.join(appRoot, "content/site-pages/spawellness.json"));
const seed = validateSpaWellnessContent(JSON.parse(bytes));
await mkdir(path.dirname(spaWellnessFile(paths)), { recursive: true });
await mkdir(path.join(paths.uploadsRoot, "pages/spawellness"), { recursive: true });
for (const image of new Set(spaWellnessImages(seed.media).map(record => record.image))) {
  const relative = image.slice("/uploads/".length);
  try { await copyFile(path.join(appRoot, "public/uploads", relative), path.join(paths.uploadsRoot, relative), constants.COPYFILE_EXCL); }
  catch (error) { if (error.code !== "EEXIST") throw error; }
}
try { await writeFile(spaWellnessFile(paths), bytes, { flag: "wx", mode: 0o600 }); }
catch (error) { if (error.code !== "EEXIST") throw error; }
await readSpaWellnessContent(paths);
console.log("Azura spawellness seed tamamlandı; mevcut JSON ve görseller korundu.");
