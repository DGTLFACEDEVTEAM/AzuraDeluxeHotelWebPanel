import { constants } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveAzuraPaths } from "../lib/azura-homepage-storage.mjs";
import { aboutFile, aboutImages, readAboutContent, validateAboutContent } from "../lib/azura-about-storage.mjs";

const appRoot = process.cwd();
const paths = resolveAzuraPaths({ appRoot, production: true });
const bytes = await readFile(path.join(appRoot, "content/site-pages/about.json"));
const seed = validateAboutContent(JSON.parse(bytes));
await mkdir(path.dirname(aboutFile(paths)), { recursive: true });
await mkdir(path.join(paths.uploadsRoot, "pages/about"), { recursive: true });
for (const record of aboutImages(seed.media)) {
  const relative = record.image.slice("/uploads/".length);
  try { await copyFile(path.join(appRoot, "public/uploads", relative), path.join(paths.uploadsRoot, relative), constants.COPYFILE_EXCL); }
  catch (error) { if (error.code !== "EEXIST") throw error; }
}
try { await writeFile(aboutFile(paths), bytes, { flag: "wx", mode: 0o600 }); }
catch (error) { if (error.code !== "EEXIST") throw error; }
await readAboutContent(paths);
console.log("Azura about seed tamamlandı; mevcut JSON ve görseller korundu.");
