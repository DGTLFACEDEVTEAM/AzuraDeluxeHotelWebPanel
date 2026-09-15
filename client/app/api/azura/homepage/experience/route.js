import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  HomepageContentError,
  LOCALES,
  readHomepageContent,
  writeHomepageExperience,
} from "@/lib/azura-homepage-storage.mjs";
import { hasValidServiceToken, serviceTokenConfigured } from "@/lib/azura-service-auth.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function authorize(request) {
  if (!serviceTokenConfigured()) {
    return json({ error: "Azura servis tokenı yapılandırılmamış." }, 503);
  }
  if (!hasValidServiceToken(request.headers.get("authorization"))) {
    return json({ error: "Yetkisiz erişim." }, 401);
  }
  return null;
}

function failure(error) {
  if (error instanceof HomepageContentError) {
    return json({ error: error.message }, error.status);
  }
  console.error("Azura homepage experience API hatası:", error);
  return json({ error: "Azura homepage verisi işlenemedi." }, 500);
}

async function readLimitedBody(request) {
  if (Number(request.headers.get("content-length")) > 8192) {
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
    if (size > 8192) {
      await reader.cancel();
      throw new HomepageContentError("İstek gövdesi çok büyük.", 413);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function GET(request) {
  const denied = authorize(request);
  if (denied) return denied;
  try {
    const { experience } = await readHomepageContent();
    return json({ experience });
  } catch (error) {
    return failure(error);
  }
}

export async function PUT(request) {
  const denied = authorize(request);
  if (denied) return denied;
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json({ error: "Content-Type application/json olmalıdır." }, 415);
  }
  try {
    const raw = await readLimitedBody(request);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return json({ error: "Geçersiz JSON." }, 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body) ||
        Object.keys(body).length !== 1 || !Object.hasOwn(body, "experience")) {
      return json({ error: "Yalnızca experience alanı güncellenebilir." }, 400);
    }
    const experience = await writeHomepageExperience(body.experience);
    for (const locale of LOCALES) revalidatePath(`/${locale}`);
    return json({ experience });
  } catch (error) {
    return failure(error);
  }
}
