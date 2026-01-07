import { ApiDocumentGet } from "need4deed-sdk";
import Document from "../../data/entity/document.entity";
import { getDocumentUrl } from "../../server/utils";

export function documentSerializer(doc: Document): ApiDocumentGet {
  return {
    id: doc.id,
    type: doc.type,
    originalName: doc.originalName,
    url: getDocumentUrl(doc.s3Key),
    mimeType: doc.mimeType,
    createdAt: doc.createdAt,
  };
}
