import { constants } from "node:fs";
import { copyFile, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveAzuraPaths } from "../lib/azura-homepage-storage.mjs";
import { sporFile, sporImages, readSporContent, validateSporContent } from "../lib/azura-spor-storage.mjs";

const appRoot = process.cwd();
const paths = resolveAzuraPaths({ appRoot, production: true });
const bytes = await readFile(path.join(appRoot, "content/site-pages/spor.json"));
const seed = validateSporContent(JSON.parse(bytes));
await mkdir(path.dirname(sporFile(paths)), { recursive: true });
const directory = path.join(paths.uploadsRoot, "pages/spor");
await mkdir(directory, { recursive: true });
if (await realpath(directory) !== path.join(await realpath(paths.uploadsRoot), "pages/spor")) throw new Error("Güvenli olmayan Spor seed dizini");
for (const image of new Set(sporImages(seed.media).map(record => record.image))) {
  const relative = image.slice("/uploads/".length);
  try { await copyFile(path.join(appRoot, "public/uploads", relative), path.join(paths.uploadsRoot, relative), constants.COPYFILE_EXCL); }
  catch (error) { if (error.code !== "EEXIST") throw error; }
}
try { await writeFile(sporFile(paths), bytes, { flag: "wx", mode: 0o600 }); }
catch (error) { if (error.code !== "EEXIST") throw error; }
await readSporContent(paths);
console.log("Azura Spor seed tamamlandı; mevcut JSON ve görseller korundu.");
