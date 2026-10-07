import {readBlogImage, readDynamicPageImage, readLibraryImage} from "@/lib/azura-homepage-media.mjs";
import {readGalleryImage} from "@/lib/azura-gallery-storage.mjs";
import {mediaScanCoordinator} from "@/lib/azura-media-scan.mjs";
import {NextResponse} from "next/server";
import {resolveAzuraPaths} from "@/lib/azura-homepage-storage.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    // Byte readers fully decode this request's bytes; metadata cache is not a substitute.
    let result;
    await mediaScanCoordinator.map([segments], async () => {
      result = await readLibraryImage(segments[1], `/uploads/${segments.join("/")}`, resolveAzuraPaths());
    });
    return new NextResponse(result.bytes, {
      headers: { "Content-Type": result.info.mimeType, "Cache-Control": "public, max-age=0, must-revalidate" },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
