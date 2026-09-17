import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { hasValidServiceToken, serviceTokenConfigured } from "@/lib/azura-service-auth.mjs";
import { HomepageContentError, LOCALES } from "@/lib/azura-homepage-storage.mjs";
import {
  parseRoomsIfMatch, readRoomsCardsVersion, RoomsContentError, writeRoomsCards,
} from "@/lib/azura-rooms-storage.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 64 * 1024;

function json(body, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function authorize(request) {
  if (!serviceTokenConfigured()) return json({ error: "Azura servis tokenı yapılandırılmamış." }, 503);
  if (!hasValidServiceToken(request.headers.get("authorization"))) return json({ error: "Yetkisiz erişim." }, 401);
  return null;
}

function failure(error) {
  if (error instanceof RoomsContentError || error instanceof HomepageContentError) {
    return json({ error: error.message }, error.status);
  }
  console.error("Azura oda kartı API hatası:", error);
  return json({ error: "Azura oda kartları işlenemedi." }, 500);
}

async function readLimitedBody(request) {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
    throw new RoomsContentError("İstek gövdesi çok büyük.", 413);
  }
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new RoomsContentError("İstek gövdesi çok büyük.", 413);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function GET(request) {
  const denied = authorize(request);
  if (denied) return denied;
  try { return json(await readRoomsCardsVersion()); } catch (error) { return failure(error); }
}

export async function PUT(request) {
  const denied = authorize(request);
  if (denied) return denied;
  try {
    const expectedRevision = parseRoomsIfMatch(request.headers.get("if-match"));
    if (!/^application\/json(?:\s*;|\s*$)/i.test(request.headers.get("content-type") || "")) {
      return json({ error: "Content-Type application/json olmalıdır." }, 415);
    }
    let body;
    try { body = JSON.parse(await readLimitedBody(request)); }
    catch (error) {
      if (error instanceof RoomsContentError) throw error;
      return json({ error: "Geçersiz JSON." }, 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body) ||
        Object.keys(body).length !== 1 || !Object.hasOwn(body, "cards")) {
      return json({ error: "Yalnızca cards alanı güncellenebilir." }, 400);
    }
    const result = await writeRoomsCards(body.cards, expectedRevision);
    for (const locale of LOCALES) revalidatePath(`/${locale}/rooms`);
    return json(result);
  } catch (error) { return failure(error); }
}
