import { constants } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveAzuraPaths } from "../lib/azura-homepage-storage.mjs";
import { readRestaurantsContent, restaurantsFile, validateRestaurantsContent } from "../lib/azura-restaurants-storage.mjs";

const appRoot = process.cwd();
const paths = resolveAzuraPaths({ appRoot, production: true });
const images = [
  "hero-banner.jpg", "intro-primary.jpg", "intro-secondary.jpg",
  "main-restaurant-background.jpg", "carousel-orchestra.webp", "carousel-bella-azura.webp",
  "carousel-ottoman.webp", "reverse-primary.jpg", "reverse-secondary.webp",
  "carousel-patisserie.webp", "carousel-mazurka.jpg", "carousel-lyric.jpg",
  "discover-bars-background.jpg",
];
const uploads = path.join(paths.uploadsRoot, "pages", "restaurants");
await mkdir(path.dirname(restaurantsFile(paths)), { recursive: true });
await mkdir(uploads, { recursive: true });

for (const name of images) {
  const source = path.join(appRoot, "public", "uploads", "pages", "restaurants", name);
  const target = path.join(uploads, name);
  try {
    await copyFile(source, target, constants.COPYFILE_EXCL);
    console.log(`Azura restoran görseli başlatıldı: ${target}`);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    console.log(`Mevcut Azura restoran görseli korundu: ${target}`);
  }
}

const seed = path.join(appRoot, "content", "site-pages", "restaurants.json");
validateRestaurantsContent(JSON.parse(await readFile(seed, "utf8")));
try {
  await writeFile(restaurantsFile(paths), await readFile(seed), { flag: "wx", mode: 0o600 });
  console.log(`Azura restaurants JSON başlatıldı: ${restaurantsFile(paths)}`);
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  console.log(`Mevcut Azura restaurants JSON korundu: ${restaurantsFile(paths)}`);
}

await readRestaurantsContent(paths);
