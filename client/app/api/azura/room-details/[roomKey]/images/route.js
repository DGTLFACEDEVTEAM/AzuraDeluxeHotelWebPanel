import {roomDetailApiConfig, RoomDetailContentError} from "@/lib/azura-room-detail-storage.mjs";
import { NextResponse } from "next/server";
import { hasValidServiceToken, serviceTokenConfigured } from "@/lib/azura-service-auth.mjs";
import {
  HomepageMediaError, MAX_IMAGE_BYTES, MAX_MULTIPART_BYTES,
  listDeluxeImages, saveDeluxeImage, listFamilyImages, saveFamilyImage, listFantasyImages, saveFantasyImage,
} from "@/lib/azura-homepage-media.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mediaHandlers = Object.freeze({
  deluxe: { list: listDeluxeImages, save: saveDeluxeImage },
  family: { list: listFamilyImages, save: saveFamilyImage },
  fantasy: { list: listFantasyImages, save: saveFantasyImage },
});

function json(body, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function authorize(request) {
  if (!serviceTokenConfigured()) return json({ error: "Azura servis tokenı yapılandırılmamış." }, 503);
  if (!hasValidServiceToken(request.headers.get("authorization"))) return json({ error: "Yetkisiz erişim." }, 401);
  return null;
}

function failure(error) {
  if (error instanceof HomepageMediaError || error instanceof RoomDetailContentError) return json({ error: error.message }, error.status);
  console.error("Azura oda detay görsel API hatası:", error);
  return json({ error: "Azura oda detay görselleri işlenemedi." }, 500);
}

async function readLimitedMultipart(request) {
  if (Number(request.headers.get("content-length")) > MAX_MULTIPART_BYTES) {
    throw new HomepageMediaError("Yükleme 8 MiB sınırını aşıyor.", 413);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new HomepageMediaError("Dosya içeren multipart gövde eksik.");
  const chunks = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_MULTIPART_BYTES) {
      await reader.cancel();
      throw new HomepageMediaError("Yükleme 8 MiB sınırını aşıyor.", 413);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function GET(request, { params }) {
  const denied = authorize(request);
  if (denied) return denied;
  try { const {roomKey} = await params; roomDetailApiConfig(roomKey); return json({ images: await mediaHandlers[roomKey].list() }); }
  catch (error) { return failure(error); }
}

export async function POST(request, { params }) {
  const denied = authorize(request);
  if (denied) return denied;
  let roomKey;
  try { ({roomKey} = await params); roomDetailApiConfig(roomKey); } catch(error) { return failure(error); }
  const contentType = request.headers.get("content-type") || "";
  if (!/^multipart\/form-data\s*;/i.test(contentType)) {
    return json({ error: "Content-Type multipart/form-data olmalıdır." }, 415);
  }
  try {
    const body = await readLimitedMultipart(request);
    let form;
    try {
      form = await new Request("http://localhost/upload", {
        method: "POST", headers: { "Content-Type": contentType }, body,
      }).formData();
    } catch {
      throw new HomepageMediaError("Multipart dosya gövdesi bozuk.");
    }
    const entries = [...form.entries()];
    if (entries.length !== 1 || entries[0][0] !== "file" ||
        !(entries[0][1] instanceof Blob) || typeof entries[0][1].name !== "string") {
      throw new HomepageMediaError("Yalnızca tek bir file alanı kabul edilir.");
    }
    const file = entries[0][1];
    if (file.size > MAX_IMAGE_BYTES) throw new HomepageMediaError("Görsel 8 MiB sınırını aşıyor.", 413);
    return json(await mediaHandlers[roomKey].save(Buffer.from(await file.arrayBuffer()), file.type), 201);
  } catch (error) { return failure(error); }
}
