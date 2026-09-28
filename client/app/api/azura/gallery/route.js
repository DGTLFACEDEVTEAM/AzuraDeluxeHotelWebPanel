import { createPageContentHandlers } from "@/lib/azura-page-api";
import { parseIfMatch } from "@/lib/azura-homepage-storage.mjs";
import { GalleryContentError, readGalleryManagement, patchGallery, validateGalleryAction } from "@/lib/azura-gallery-storage.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const { GET, PUT: PATCH } = createPageContentHandlers({
  readContent: readGalleryManagement, writeOperation: patchGallery,
  validateBody: validateGalleryAction, parseIfMatch, ContentError: GalleryContentError, pageKey: "gallery",
});
