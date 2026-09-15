import { createHash, timingSafeEqual } from "node:crypto";

export function hasValidServiceToken(header, token = process.env.AZURA_PANEL_SERVICE_TOKEN) {
  if (typeof token !== "string" || token.length < 32 || typeof header !== "string" ||
      !header.startsWith("Bearer ")) {
    return false;
  }

  const supplied = header.slice("Bearer ".length);
  const expectedHash = createHash("sha256").update(token).digest();
  const suppliedHash = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(expectedHash, suppliedHash);
}

export function serviceTokenConfigured() {
  return typeof process.env.AZURA_PANEL_SERVICE_TOKEN === "string" &&
    process.env.AZURA_PANEL_SERVICE_TOKEN.length >= 32;
}
