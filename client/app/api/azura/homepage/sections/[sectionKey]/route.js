import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  assertHomepageSectionKey,
  HomepageContentError,
  LOCALES,
  parseIfMatch,
  readHomepageSection,
  writeHomepageSection,
} from "@/lib/azura-homepage-storage.mjs";
import { hasValidServiceToken, serviceTokenConfigured } from "@/lib/azura-service-auth.mjs";

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
  if (error instanceof HomepageContentError) return json({ error: error.message }, error.status);
  console.error("Azura homepage bölüm API hatası:", error);
  return json({ error: "Azura homepage bölümü işlenemedi." }, 500);
}

async function readLimitedBody(request) {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
    throw new HomepageContentError("İstek gövdesi çok büyük.", 413);
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
      throw new HomepageContentError("İstek gövdesi çok büyük.", 413);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function GET(request, { params }) {
  const denied = authorize(request);
  if (denied) return denied;
  try {
    const { sectionKey } = await params;
    assertHomepageSectionKey(sectionKey);
    return json(await readHomepageSection(sectionKey));
  } catch (error) {
    return failure(error);
  }
}

export async function PUT(request, { params }) {
  const denied = authorize(request);
  if (denied) return denied;
  try {
    const { sectionKey } = await params;
    assertHomepageSectionKey(sectionKey);
    const expectedRevision = parseIfMatch(request.headers.get("if-match"));
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return json({ error: "Content-Type application/json olmalıdır." }, 415);
    }
    const raw = await readLimitedBody(request);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return json({ error: "Geçersiz JSON." }, 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body) ||
        Object.keys(body).length !== 1 || !Object.hasOwn(body, "section")) {
      return json({ error: "Yalnızca section alanı güncellenebilir." }, 400);
    }
    const result = await writeHomepageSection(sectionKey, body.section, expectedRevision);
    for (const locale of LOCALES) revalidatePath(`/${locale}`);
    return json(result);
  } catch (error) {
    return failure(error);
  }
}
