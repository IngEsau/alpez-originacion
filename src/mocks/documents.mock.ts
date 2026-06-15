import type {
  DocumentItem,
  DocumentStatus,
  DocumentType,
  PersonType,
} from "../features/applications/types/application.types";
import {
  DOCUMENT_LABELS,
  MORAL_PERSON_DOCUMENTS,
  PHYSICAL_PERSON_DOCUMENTS,
} from "./catalogs.mock";

export function getRequiredDocumentTypes(personType: PersonType): DocumentType[] {
  return personType === "fisica" ? PHYSICAL_PERSON_DOCUMENTS : MORAL_PERSON_DOCUMENTS;
}

export function createDocumentsForApplication(
  applicationId: string,
  personType: PersonType,
  status: DocumentStatus = "pendiente",
  overrides: Partial<Record<DocumentType, DocumentStatus>> = {},
): DocumentItem[] {
  return getRequiredDocumentTypes(personType).map((type) => {
    const documentStatus = overrides[type] ?? status;
    const uploaded = ["cargado", "en_revision", "validado", "rechazado"].includes(documentStatus);

    return {
      id: `${applicationId}_${type}`,
      applicationId,
      type,
      label: DOCUMENT_LABELS[type],
      required: true,
      status: documentStatus,
      fileName: uploaded ? `${type}.pdf` : undefined,
      fileSizeMb: uploaded ? 2.4 : undefined,
      fileType: uploaded ? "pdf" : undefined,
      uploadedAt: uploaded ? "2026-06-10T10:20:00.000Z" : undefined,
      reviewedAt: documentStatus === "validado" || documentStatus === "rechazado" ? "2026-06-11T15:10:00.000Z" : undefined,
      comments: documentStatus === "rechazado" ? "Documento vencido o ilegible." : undefined,
    };
  });
}
