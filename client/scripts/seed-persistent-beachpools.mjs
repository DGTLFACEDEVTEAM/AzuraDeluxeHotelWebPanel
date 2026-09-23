import { constants } from "node:fs";
import { copyFile, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveAzuraPaths } from "../lib/azura-homepage-storage.mjs";
import { beachPoolsFile, beachPoolsImages, readBeachPoolsContent, validateBeachPoolsContent } from "../lib/azura-beachpools-storage.mjs";

const appRoot = process.cwd();
const paths = resolveAzuraPaths({ appRoot, production: true });
const bytes = await readFile(path.join(appRoot, "content/site-pages/beachpools.json"));
const seed = validateBeachPoolsContent(JSON.parse(bytes));
await mkdir(path.dirname(beachPoolsFile(paths)), { recursive: true });
const directory = path.join(paths.uploadsRoot, "pages/beachpools");
await mkdir(directory, { recursive: true });
if (await realpath(directory) !== path.join(await realpath(paths.uploadsRoot), "pages/beachpools")) throw new Error("Güvenli olmayan BeachPools seed dizini");
for (const image of new Set(beachPoolsImages(seed.media).map(record => record.image))) {
  const relative = image.slice("/uploads/".length);
  try { await copyFile(path.join(appRoot, "public/uploads", relative), path.join(paths.uploadsRoot, relative), constants.COPYFILE_EXCL); }
  catch (error) { if (error.code !== "EEXIST") throw error; }
}
try { await writeFile(beachPoolsFile(paths), bytes, { flag: "wx", mode: 0o600 }); }
catch (error) { if (error.code !== "EEXIST") throw error; }
await readBeachPoolsContent(paths);
console.log("Azura BeachPools seed tamamlandı; mevcut JSON ve görseller korundu.");
