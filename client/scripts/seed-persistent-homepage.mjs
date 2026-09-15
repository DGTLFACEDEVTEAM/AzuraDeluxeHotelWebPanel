import { constants } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { homepageFile, resolveAzuraPaths } from "../lib/azura-homepage-storage.mjs";

const appRoot = process.cwd();
const paths = resolveAzuraPaths({ appRoot, production: true });
const seed = path.join(appRoot, "content", "site-pages", "homepage.json");
const images = ["experience-background.jpg", "experience-foreground.jpg"];

await mkdir(path.dirname(homepageFile(paths)), { recursive: true });
await mkdir(path.join(paths.uploadsRoot, "pages", "homepage"), { recursive: true });

try {
  await writeFile(homepageFile(paths), await readFile(seed), { flag: "wx", mode: 0o600 });
  console.log(`Azura homepage JSON başlatıldı: ${homepageFile(paths)}`);
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  console.log(`Mevcut Azura homepage JSON korundu: ${homepageFile(paths)}`);
}

for (const image of images) {
  const source = path.join(appRoot, "public", "uploads", "pages", "homepage", image);
  const target = path.join(paths.uploadsRoot, "pages", "homepage", image);
  try {
    await copyFile(source, target, constants.COPYFILE_EXCL);
    console.log(`Azura görseli başlatıldı: ${target}`);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    console.log(`Mevcut Azura görseli korundu: ${target}`);
  }
}
