import { createPageImageHandlers } from "@/lib/azura-page-image-api";
import { listBeachPoolsImages, saveBeachPoolsImage } from "@/lib/azura-homepage-media.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const { GET, POST } = createPageImageHandlers({ listImages: listBeachPoolsImages, saveImage: saveBeachPoolsImage });
