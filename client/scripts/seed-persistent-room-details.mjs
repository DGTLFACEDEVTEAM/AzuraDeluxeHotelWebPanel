import { constants } from "node:fs";
import { copyFile, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveAzuraPaths } from "../lib/azura-homepage-storage.mjs";
import { roomDetailConfig, roomDetailFile, roomDetailImages, readRoomDetailContent, validateRoomDetailContent } from "../lib/azura-room-detail-storage.mjs";

const roomKey = process.argv[2] ?? "deluxe";
const config = roomDetailConfig(roomKey);
const appRoot = process.cwd();
const paths = resolveAzuraPaths({ appRoot, production: true });
const bytes = await readFile(path.join(appRoot, "content/site-pages", config.file));
const seed = validateRoomDetailContent(roomKey, JSON.parse(bytes));
await mkdir(path.dirname(roomDetailFile(roomKey, paths)), { recursive: true });
await mkdir(paths.uploadsRoot, { recursive: true });
const root = await realpath(paths.uploadsRoot);
for (const image of new Set(roomDetailImages(seed.media).map(r => r.image))) {
  const relative = image.slice("/uploads/".length);
  const target = path.join(paths.uploadsRoot, relative);
  await mkdir(path.dirname(target), { recursive: true });
  if (await realpath(path.dirname(target)) !== path.join(root, path.dirname(relative))) throw new Error("Güvenli olmayan seed görsel dizini.");
  try { await copyFile(path.join(appRoot, "public/uploads", relative), target, constants.COPYFILE_EXCL); }
  catch (error) { if (error.code !== "EEXIST") throw error; }
}
try { await writeFile(roomDetailFile(roomKey, paths), bytes, { flag: "wx", mode: 0o600 }); }
catch (error) { if (error.code !== "EEXIST") throw error; }
await readRoomDetailContent(roomKey, paths);
console.log(`Azura ${roomKey} seed tamamlandı; mevcut JSON ve görseller korundu.`);
