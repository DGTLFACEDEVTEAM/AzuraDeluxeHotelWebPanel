import { constants } from "node:fs";
import { copyFile, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveAzuraPaths } from "../lib/azura-homepage-storage.mjs";
import { barsFile, barsImages, readBarsContent, validateBarsContent } from "../lib/azura-bars-storage.mjs";

const appRoot = process.cwd();
const paths = resolveAzuraPaths({ appRoot, production: true });
const bytes = await readFile(path.join(appRoot, "content/site-pages/bars.json"));
const seed = validateBarsContent(JSON.parse(bytes));
await mkdir(path.dirname(barsFile(paths)), { recursive: true });
const directory = path.join(paths.uploadsRoot, "pages/bars");
await mkdir(directory, { recursive: true });
if (await realpath(directory) !== path.join(await realpath(paths.uploadsRoot), "pages/bars")) throw new Error("Güvenli olmayan Bars seed dizini");
for (const image of new Set(barsImages(seed.media).map(record => record.image))) {
  const relative = image.slice("/uploads/".length);
  try { await copyFile(path.join(appRoot, "public/uploads", relative), path.join(paths.uploadsRoot, relative), constants.COPYFILE_EXCL); }
  catch (error) { if (error.code !== "EEXIST") throw error; }
}
try { await writeFile(barsFile(paths), bytes, { flag: "wx", mode: 0o600 }); }
catch (error) { if (error.code !== "EEXIST") throw error; }
await readBarsContent(paths);
console.log("Azura Bars seed tamamlandı; mevcut JSON ve görseller korundu.");
