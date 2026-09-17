import { constants } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveAzuraPaths } from "../lib/azura-homepage-storage.mjs";
import { readRoomsContent, roomsFile, validateRoomsContent } from "../lib/azura-rooms-storage.mjs";
import { ensureRoomsPageFields } from "../lib/azura-rooms-page-content.mjs";

const appRoot = process.cwd();
const paths = resolveAzuraPaths({ appRoot, production: true });
const images = [
  "deluxe-primary.png",
  "deluxe-secondary.png",
  "family-primary.png",
  "family-secondary.png",
  "fantasy-primary.png",
  "fantasy-secondary.png",
  "rooms-hero.webp",
  "rooms-parallax.jpg",
];
const uploads = path.join(paths.uploadsRoot, "pages", "rooms");
await mkdir(path.dirname(roomsFile(paths)), { recursive: true });
await mkdir(uploads, { recursive: true });

for (const name of images) {
  const source = path.join(appRoot, "public", "uploads", "pages", "rooms", name);
  const target = path.join(uploads, name);
  try {
    await copyFile(source, target, constants.COPYFILE_EXCL);
    console.log(`Azura oda görseli başlatıldı: ${target}`);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    console.log(`Mevcut Azura oda görseli korundu: ${target}`);
  }
}

const seed = path.join(appRoot, "content", "site-pages", "rooms.json");
validateRoomsContent(JSON.parse(await readFile(seed, "utf8")));
try {
  await writeFile(roomsFile(paths), await readFile(seed), { flag: "wx", mode: 0o600 });
  console.log(`Azura rooms JSON başlatıldı: ${roomsFile(paths)}`);
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  console.log(`Mevcut Azura rooms JSON korundu: ${roomsFile(paths)}`);
}

const initial = JSON.parse(await readFile(seed, "utf8"));
await ensureRoomsPageFields(initial, paths);
await readRoomsContent(paths);
