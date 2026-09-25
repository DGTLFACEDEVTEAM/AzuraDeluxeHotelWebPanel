import { constants } from "node:fs";
import { copyFile, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveAzuraPaths } from "../lib/azura-homepage-storage.mjs";
import { entertainmentFile, entertainmentImages, readEntertainmentContent, validateEntertainmentContent } from "../lib/azura-entertainment-storage.mjs";

const appRoot = process.cwd();
const paths = resolveAzuraPaths({ appRoot, production: true });
const bytes = await readFile(path.join(appRoot, "content/site-pages/entertainment.json"));
const seed = validateEntertainmentContent(JSON.parse(bytes));
await mkdir(path.dirname(entertainmentFile(paths)), { recursive: true });
const directory = path.join(paths.uploadsRoot, "pages/entertainment");
await mkdir(directory, { recursive: true });
if (await realpath(directory) !== path.join(await realpath(paths.uploadsRoot), "pages/entertainment")) throw new Error("Güvenli olmayan Entertainment seed dizini");
for (const image of new Set(entertainmentImages(seed.media).map(record => record.image))) {
  const relative = image.slice("/uploads/".length);
  try { await copyFile(path.join(appRoot, "public/uploads", relative), path.join(paths.uploadsRoot, relative), constants.COPYFILE_EXCL); }
  catch (error) { if (error.code !== "EEXIST") throw error; }
}
try { await writeFile(entertainmentFile(paths), bytes, { flag: "wx", mode: 0o600 }); }
catch (error) { if (error.code !== "EEXIST") throw error; }
await readEntertainmentContent(paths);
console.log("Azura Entertainment seed tamamlandı; mevcut JSON ve görseller korundu.");
