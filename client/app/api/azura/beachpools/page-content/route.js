import { createPageContentHandlers } from "@/lib/azura-page-api";
import { parseIfMatch } from "@/lib/azura-homepage-storage.mjs";
import { readBeachPoolsPageContent, writeBeachPoolsPageContent, BeachPoolsContentError } from "@/lib/azura-beachpools-storage.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const { GET, PUT } = createPageContentHandlers({
  readContent: readBeachPoolsPageContent, writeContent: writeBeachPoolsPageContent,
  parseIfMatch, ContentError: BeachPoolsContentError, pageKey: "beachpools",
  revalidationPaths: ["/tr/plaj-havuz", "/en/beach-pool", "/de/strand-pool", "/ru/plaj-basseyn"],
});
