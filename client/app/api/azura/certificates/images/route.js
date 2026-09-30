import { createPageImageHandlers } from "@/lib/azura-page-image-api";
import { listCertificatesImages, saveCertificatesImage } from "@/lib/azura-homepage-media.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const { GET, POST } = createPageImageHandlers({ listImages: listCertificatesImages, saveImage: saveCertificatesImage });
