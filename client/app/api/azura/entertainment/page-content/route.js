import { createPageContentHandlers } from "@/lib/azura-page-api";
import { parseIfMatch } from "@/lib/azura-homepage-storage.mjs";
import { readEntertainmentPageContent, writeEntertainmentPageContent, EntertainmentContentError } from "@/lib/azura-entertainment-storage.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const { GET, PUT } = createPageContentHandlers({
  readContent: readEntertainmentPageContent, writeContent: writeEntertainmentPageContent,
  parseIfMatch, ContentError: EntertainmentContentError, pageKey: "entertainment",
});
