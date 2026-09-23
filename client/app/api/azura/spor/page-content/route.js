import { createPageContentHandlers } from "@/lib/azura-page-api";
import { parseIfMatch } from "@/lib/azura-homepage-storage.mjs";
import { readSporPageContent, writeSporPageContent, SporContentError } from "@/lib/azura-spor-storage.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const { GET, PUT } = createPageContentHandlers({
  readContent: readSporPageContent, writeContent: writeSporPageContent,
  parseIfMatch, ContentError: SporContentError, pageKey: "spor",
});
