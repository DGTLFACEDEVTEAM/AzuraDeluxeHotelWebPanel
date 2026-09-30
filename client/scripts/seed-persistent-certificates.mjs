import { constants } from "node:fs";
import { copyFile, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveAzuraPaths } from "../lib/azura-homepage-storage.mjs";
import { certificatesFile, certificatesImages, readCertificatesContent, validateCertificatesContent } from "../lib/azura-certificates-storage.mjs";

const appRoot = process.cwd();
const paths = resolveAzuraPaths({ appRoot, production: !process.argv.includes('--local') });
const bytes = await readFile(path.join(appRoot, "content/site-pages/certificates.json"));
const seed = validateCertificatesContent(JSON.parse(bytes));
await mkdir(path.dirname(certificatesFile(paths)), { recursive: true });
const directory = path.join(paths.uploadsRoot, "pages/certificates");
await mkdir(directory, { recursive: true });
if (await realpath(directory) !== path.join(await realpath(paths.uploadsRoot), "pages/certificates")) throw new Error("Güvenli olmayan Certificates seed dizini");
for (const image of new Set(certificatesImages(seed).map(record => record.image))) {
  const relative = image.slice("/uploads/".length);
  try { await copyFile(path.join(appRoot, "public/uploads", relative), path.join(paths.uploadsRoot, relative), constants.COPYFILE_EXCL); }
  catch (error) { if (error.code !== "EEXIST") throw error; }
}
try { await writeFile(certificatesFile(paths), bytes, { flag: "wx", mode: 0o600 }); }
catch (error) { if (error.code !== "EEXIST") throw error; }
await readCertificatesContent(paths);
console.log("Azura Certificates seed tamamlandı; mevcut JSON ve görseller korundu.");
