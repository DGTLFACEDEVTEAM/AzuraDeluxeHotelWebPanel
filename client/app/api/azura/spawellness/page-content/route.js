import { createPageContentHandlers } from "@/lib/azura-page-api";
import { parseIfMatch } from "@/lib/azura-homepage-storage.mjs";
import { readSpaWellnessPageContent, writeSpaWellnessPageContent, SpaWellnessContentError } from "@/lib/azura-spawellness-storage.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const { GET, PUT } = createPageContentHandlers({
  readContent: readSpaWellnessPageContent, writeContent: writeSpaWellnessPageContent,
  parseIfMatch, ContentError: SpaWellnessContentError, pageKey: "spawellness",
});
