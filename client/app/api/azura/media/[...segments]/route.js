import {inspectHomepageImage} from "@/lib/azura-homepage-media.mjs";
import {constants} from "node:fs";
import {open} from "node:fs/promises";
import { readBlogImage, readDynamicPageImage } from "@/lib/azura-homepage-media.mjs";
import { readGalleryImage } from "@/lib/azura-gallery-storage.mjs";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { resolveAzuraPaths } from "@/lib/azura-homepage-storage.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const types = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

export async function GET(_request, { params }) {
  const { segments } = await params;
  if (Array.isArray(segments) && segments.length === 2 && ["gallery", "blog", "dynamic-pages"].includes(segments[0])) {
    try {
      const { bytes, info } = await (segments[0] === "gallery" ? readGalleryImage : segments[0] === "blog" ? readBlogImage : readDynamicPageImage)(`/uploads/${segments[0]}/${segments[1]}`);
      return new NextResponse(bytes, { headers: { "Content-Type": info.mimeType, "Cache-Control": "public, max-age=0, must-revalidate" } });
    } catch { return new NextResponse(null, { status: 404 }); }
  }
  if (!Array.isArray(segments) || segments.length !== 3 ||
      segments[0] !== "pages" || !["homepage", "rooms", "restaurants", "about", "spawellness", "spor", "beachpools", "kidsclub", "bars", "entertainment", "deluxeroom", "familyroom", "fantasyroom", "room-options", "certificates"].includes(segments[1]) ||
      segments.some((segment) => !/^[A-Za-z0-9._-]+$/.test(segment) || segment.includes(".."))) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const { uploadsRoot } = resolveAzuraPaths();
    const root = await realpath(uploadsRoot);
    if(segments[1] === 'certificates') {
      const directory=path.join(root,'pages/certificates');
      if(await realpath(directory)!==directory) return new NextResponse(null,{status:404});
      const handle=await open(path.join(directory,segments[2]),constants.O_RDONLY|constants.O_NOFOLLOW);
      try {const details=await handle.stat();if(!details.isFile()||details.size>8*1024*1024) return new NextResponse(null,{status:404});const bytes=await handle.readFile();const info=await inspectHomepageImage(bytes,types[path.extname(segments[2]).toLowerCase()]);return new NextResponse(bytes,{headers:{'Content-Type':info.mimeType,'Cache-Control':'public, max-age=0, must-revalidate'}});}finally{await handle.close();}
    }
    const file = await realpath(path.join(root, ...segments));
    const type = types[path.extname(file).toLowerCase()];
    if (!file.startsWith(`${root}${path.sep}`) || !type || !(await stat(file)).isFile()) {
      return new NextResponse(null, { status: 404 });
    }
    return new NextResponse(await readFile(file), {
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=0, must-revalidate" },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
