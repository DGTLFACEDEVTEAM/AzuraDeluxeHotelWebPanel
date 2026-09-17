import { createHash, randomUUID } from "node:crypto";
import { link, mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { HomepageContentError, LOCALES, resolveAzuraPaths } from "./azura-homepage-storage.mjs";

const DETAIL_KEYS = [
  "username", "phone", "callCenter", "email", "instagramUrl", "facebookUrl",
  "youtubeUrl", "reservationUrl", "translations",
];
const TEXT_LIMITS = {
  contactForMore: 200,
  address: 500,
  phoneLabel: 120,
  callCenterLabel: 120,
  emailLabel: 120,
  reservationButtonText: 120,
};
const EXTERNAL_URL_KEYS = ["instagramUrl", "facebookUrl", "youtubeUrl", "reservationUrl"];
const REVISION = /^[a-f0-9]{64}$/;
let contactWriteQueue = Promise.resolve();

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) {
    throw new HomepageContentError(`${label} alanı beklenen biçimde değil.`);
  }
}

function textField(value, limit, label) {
  if (typeof value !== "string" || !value.trim() || value.length > limit || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new HomepageContentError(`${label} geçersiz veya çok uzun.`);
  }
}

export function contactPhoneHref(value) {
  if (typeof value !== "string" || value.length > 32 || !/^\+[1-9][0-9 ()-]{5,31}$/.test(value)) {
    throw new HomepageContentError("İletişim telefon numarası geçersiz.");
  }
  const normalized = value.replace(/[ ()-]/g, "");
  if (!/^\+[1-9][0-9]{6,14}$/.test(normalized)) {
    throw new HomepageContentError("İletişim telefon numarası geçersiz.");
  }
  return `tel:${normalized}`;
}

export function contactEmailHref(value) {
  if (typeof value !== "string" || value.length > 254 ||
      !/^[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(value) || value.includes("..")) {
    throw new HomepageContentError("İletişim e-posta adresi geçersiz.");
  }
  return `mailto:${value}`;
}

function httpsUrl(value, label) {
  if (typeof value !== "string" || value.length > 2048 || /\s|[\u0000-\u001f\u007f]/.test(value)) {
    throw new HomepageContentError(`${label} geçerli HTTPS adresi olmalıdır.`);
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) {
      throw new Error("invalid HTTPS URL");
    }
  } catch {
    throw new HomepageContentError(`${label} geçerli HTTPS adresi olmalıdır.`);
  }
}

export function validateSharedContactDetails(details) {
  exactKeys(details, DETAIL_KEYS, "details");
  textField(details.username, 100, "details.username");
  contactPhoneHref(details.phone);
  contactPhoneHref(details.callCenter);
  contactEmailHref(details.email);
  for (const key of EXTERNAL_URL_KEYS) httpsUrl(details[key], `details.${key}`);
  exactKeys(details.translations, LOCALES, "details.translations");
  for (const locale of LOCALES) {
    exactKeys(details.translations[locale], Object.keys(TEXT_LIMITS), `details.translations.${locale}`);
    for (const [field, limit] of Object.entries(TEXT_LIMITS)) {
      textField(details.translations[locale][field], limit, `details.translations.${locale}.${field}`);
    }
  }
  return details;
}

export function sharedContactFile(paths = resolveAzuraPaths()) {
  return path.join(paths.contentRoot, "shared", "contact-details.json");
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function getSharedContactRevision(details) {
  validateSharedContactDetails(details);
  return createHash("sha256").update(canonicalJson(details)).digest("hex");
}

export async function readSharedContactDetails(paths = resolveAzuraPaths()) {
  let details;
  try {
    details = JSON.parse(await readFile(sharedContactFile(paths), "utf8"));
  } catch (error) {
    throw new Error(`Azura ortak iletişim verisi okunamadı: ${sharedContactFile(paths)}`, { cause: error });
  }
  validateSharedContactDetails(details);
  return { details, revision: getSharedContactRevision(details) };
}

function enqueueContactWrite(operation) {
  const result = contactWriteQueue.then(operation, operation);
  contactWriteQueue = result.then(() => undefined, () => undefined);
  return result;
}

async function syncDirectory(directory) {
  const handle = await open(directory, "r");
  try { await handle.sync(); } finally { await handle.close(); }
}

async function writeTemporary(details, target) {
  const temporary = `${target}.${randomUUID()}.tmp`;
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(details, null, 2)}\n`, "utf8");
    await handle.sync();
  } catch (error) {
    await handle.close();
    await unlink(temporary).catch(() => {});
    throw error;
  }
  await handle.close();
  return temporary;
}

export async function writeSharedContactDetails(details, expectedRevision, paths = resolveAzuraPaths()) {
  validateSharedContactDetails(details);
  if (typeof expectedRevision !== "string" || !REVISION.test(expectedRevision)) {
    throw new HomepageContentError("Beklenen revision geçersizdir.");
  }
  return enqueueContactWrite(async () => {
    const current = await readSharedContactDetails(paths);
    if (current.revision !== expectedRevision) {
      throw new HomepageContentError("İletişim verisi başka bir kullanıcı tarafından güncellendi.", 409);
    }
    const target = sharedContactFile(paths);
    const temporary = await writeTemporary(details, target);
    try {
      await rename(temporary, target);
      await syncDirectory(path.dirname(target));
    } catch (error) {
      await unlink(temporary).catch(() => {});
      throw error;
    }
    return { details, revision: getSharedContactRevision(details) };
  });
}

export async function ensureSharedContactDetails(details, paths = resolveAzuraPaths()) {
  validateSharedContactDetails(details);
  return enqueueContactWrite(async () => {
    const target = sharedContactFile(paths);
    await mkdir(path.dirname(target), { recursive: true });
    const temporary = await writeTemporary(details, target);
    try {
      await link(temporary, target);
      await syncDirectory(path.dirname(target));
      return details;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      return (await readSharedContactDetails(paths)).details;
    } finally {
      await unlink(temporary).catch(() => {});
    }
  });
}
