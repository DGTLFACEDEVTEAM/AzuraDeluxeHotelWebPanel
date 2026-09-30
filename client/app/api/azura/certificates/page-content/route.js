import { createPageContentHandlers } from "@/lib/azura-page-api";
import { parseIfMatch } from "@/lib/azura-homepage-storage.mjs";
import { readCertificatesPageContent, writeCertificatesPageContent, CertificatesContentError } from "@/lib/azura-certificates-storage.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const { GET, PUT } = createPageContentHandlers({
  readContent: readCertificatesPageContent, writeContent: writeCertificatesPageContent,
  parseIfMatch, ContentError: CertificatesContentError, pageKey: "certificates",
});
