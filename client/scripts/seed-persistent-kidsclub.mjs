import { constants } from "node:fs";
import { copyFile, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveAzuraPaths } from "../lib/azura-homepage-storage.mjs";
import { kidsClubFile, kidsClubImages, readKidsClubContent, validateKidsClubContent } from "../lib/azura-kidsclub-storage.mjs";

const appRoot = process.cwd();
const paths = resolveAzuraPaths({ appRoot, production: true });
const bytes = await readFile(path.join(appRoot, "content/site-pages/kidsclub.json"));
const seed = validateKidsClubContent(JSON.parse(bytes));
await mkdir(path.dirname(kidsClubFile(paths)), { recursive: true });
const directory = path.join(paths.uploadsRoot, "pages/kidsclub");
await mkdir(directory, { recursive: true });
if (await realpath(directory) !== path.join(await realpath(paths.uploadsRoot), "pages/kidsclub")) throw new Error("Güvenli olmayan KidsClub seed dizini");
for (const image of new Set(kidsClubImages(seed.media).map(record => record.image))) {
  const relative = image.slice("/uploads/".length);
  try { await copyFile(path.join(appRoot, "public/uploads", relative), path.join(paths.uploadsRoot, relative), constants.COPYFILE_EXCL); }
  catch (error) { if (error.code !== "EEXIST") throw error; }
}
try { await writeFile(kidsClubFile(paths), bytes, { flag: "wx", mode: 0o600 }); }
catch (error) { if (error.code !== "EEXIST") throw error; }
await readKidsClubContent(paths);
console.log("Azura KidsClub seed tamamlandı; mevcut JSON ve görseller korundu.");
