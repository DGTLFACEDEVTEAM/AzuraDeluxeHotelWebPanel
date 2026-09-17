import { constants } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  homepageFile,
  ensureHomepageExperienceText,
  ensureHomepageWelcomeText,
  ensureHomepageSection,
  readHomepageContent,
  resolveAzuraPaths,
  validateExperienceText,
  validateWelcomeText,
  validateHomepageSection,
} from "../lib/azura-homepage-storage.mjs";
import { ensureSharedContactDetails, sharedContactFile } from "../lib/azura-shared-contact-storage.mjs";

const appRoot = process.cwd();
const paths = resolveAzuraPaths({ appRoot, production: true });
const seed = path.join(appRoot, "content", "site-pages", "homepage.json");
const images = [
  "experience-background.jpg",
  "experience-foreground.jpg",
  "carousel-accommodation.jpg",
  "carousel-restaurants.jpg",
  "carousel-beach-pools.jpg",
  "carousel-experiences.jpg",
  "carousel-kids.jpg",
  "accommodation-deluxe.png",
  "accommodation-fantasy.png",
  "accommodation-family.png",
  "background-green-and-blue.png",
];

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

const current = await readHomepageContent(paths);
if (current.experienceText === undefined) {
  const initial = JSON.parse(await readFile(seed, "utf8"));
  validateExperienceText(initial.experienceText);
  await ensureHomepageExperienceText(initial.experienceText, paths);
  console.log(`Azura experienceText alanı mevcut JSON'a eklendi: ${homepageFile(paths)}`);
}

if (current.welcomeText === undefined) {
  const initial = JSON.parse(await readFile(seed, "utf8"));
  validateWelcomeText(initial.welcomeText);
  await ensureHomepageWelcomeText(initial.welcomeText, paths);
  console.log(`Azura welcomeText alanı mevcut JSON'a eklendi: ${homepageFile(paths)}`);
}

if (current.sections?.essentials === undefined) {
  const initial = JSON.parse(await readFile(seed, "utf8"));
  validateHomepageSection("essentials", initial.sections?.essentials);
  await ensureHomepageSection("essentials", initial.sections.essentials, paths);
  console.log(`Azura essentials bölümü mevcut JSON'a eklendi: ${homepageFile(paths)}`);
}

if (current.sections?.carousel === undefined) {
  const initial = JSON.parse(await readFile(seed, "utf8"));
  validateHomepageSection("carousel", initial.sections?.carousel);
  await ensureHomepageSection("carousel", initial.sections.carousel, paths);
  console.log(`Azura carousel bölümü mevcut JSON'a eklendi: ${homepageFile(paths)}`);
}

if (current.sections?.accommodation === undefined) {
  const initial = JSON.parse(await readFile(seed, "utf8"));
  validateHomepageSection("accommodation", initial.sections?.accommodation);
  await ensureHomepageSection("accommodation", initial.sections.accommodation, paths);
  console.log(`Azura accommodation bölümü mevcut JSON'a eklendi: ${homepageFile(paths)}`);
}

if (current.sections?.background === undefined) {
  const initial = JSON.parse(await readFile(seed, "utf8"));
  validateHomepageSection("background", initial.sections?.background);
  await ensureHomepageSection("background", initial.sections.background, paths);
  console.log(`Azura background bölümü mevcut JSON'a eklendi: ${homepageFile(paths)}`);
}

const contactSeed = JSON.parse(await readFile(path.join(appRoot, "content", "shared", "contact-details.json"), "utf8"));
await ensureSharedContactDetails(contactSeed, paths);
console.log(`Azura ortak iletişim verisi mevcut veya başlatıldı: ${sharedContactFile(paths)}`);
