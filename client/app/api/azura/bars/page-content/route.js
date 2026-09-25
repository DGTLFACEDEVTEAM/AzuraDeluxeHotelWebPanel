import { createPageContentHandlers } from "@/lib/azura-page-api";
import { parseIfMatch } from "@/lib/azura-homepage-storage.mjs";
import { readBarsPageContent, writeBarsPageContent, BarsContentError } from "@/lib/azura-bars-storage.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const { GET, PUT } = createPageContentHandlers({
  readContent: readBarsPageContent, writeContent: writeBarsPageContent,
  parseIfMatch, ContentError: BarsContentError, pageKey: "bars",
});
