import { createPageContentHandlers } from "@/lib/azura-page-api";
import { parseIfMatch } from "@/lib/azura-homepage-storage.mjs";
import { readKidsClubPageContent, writeKidsClubPageContent, KidsClubContentError } from "@/lib/azura-kidsclub-storage.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const { GET, PUT } = createPageContentHandlers({
  readContent: readKidsClubPageContent, writeContent: writeKidsClubPageContent,
  parseIfMatch, ContentError: KidsClubContentError, pageKey: "kidsclub",
});
