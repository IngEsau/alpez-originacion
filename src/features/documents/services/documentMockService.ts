import type { DocumentItem, DocumentStatus } from "../types/document.types";
import {
  appendTimeline,
  getApplicationById,
  replaceApplicationInStore,
  updateValidationInApplication,
} from "../../applications/services/applicationMockService";
import { wait } from "../../../shared/lib/mockDelay";
import { createDocumentsForApplication } from "../../../mocks/documents.mock";
import type { PersonType } from "../../applications/types/application.types";

function getDocumentStatusForValidation(documents: DocumentItem[]): { status: "aprobado" | "observado"; detail: string } {
  const rejected = documents.filter((document) => document.required && document.status === "rechazado").length;
  const pending = documents.filter((document) => document.required && document.status === "pendiente").length;

  if (rejected > 0) {
    return { status: "observado", detail: `${rejected} documento(s) rechazado(s).` };
  }

  if (pending > 0) {
    return { status: "observado", detail: `${pending} documento(s) pendiente(s).` };
  }

  return { status: "aprobado", detail: "Documentos requeridos cargados para revisión." };
}

async function getApplicationOrThrow(applicationId: string) {
  const application = await getApplicationById(applicationId);
  if (!application) throw new Error("Solicitud no encontrada.");
  return application;
}

export async function getApplicationDocuments(applicationId: string): Promise<DocumentItem[]> {
  await wait();
  const application = await getApplicationOrThrow(applicationId);
  return application.documents;
}

export async function getInitialDocuments(personType: PersonType): Promise<DocumentItem[]> {
  await wait(200);
  return createDocumentsForApplication("draft", personType, "pendiente");
}

export async function simulateDocumentUpload(
  applicationId: string,
  documentId: string,
): Promise<DocumentItem> {
  await wait();
  const application = await getApplicationOrThrow(applicationId);
  const now = new Date().toISOString();
  const updatedDocuments = application.documents.map((document) =>
    document.id === documentId
      ? {
          ...document,
          status: "cargado" as const,
          fileName: `${document.type}.pdf`,
          fileSizeMb: Number((1 + Math.random() * 4).toFixed(1)),
          fileType: "pdf" as const,
          uploadedAt: now,
          comments: undefined,
        }
      : document,
  );
  const updatedDocument = updatedDocuments.find((document) => document.id === documentId);
  if (!updatedDocument) throw new Error("Documento no encontrado.");

  const documentValidation = getDocumentStatusForValidation(updatedDocuments);
  const updatedApplication = appendTimeline(
    updateValidationInApplication(
      {
        ...application,
        documents: updatedDocuments,
        status: documentValidation.status === "aprobado" ? "documentos_revision" : "documentos_pendientes",
      },
      "documentos",
      {
        status: documentValidation.status,
        result: documentValidation.status === "aprobado" ? "Documentación cargada" : "Documentación observada",
        detail: documentValidation.detail,
      },
    ),
    {
      status: documentValidation.status === "aprobado" ? "documentos_revision" : "documentos_pendientes",
      title: "Documento cargado",
      description: updatedDocument.label,
      actor: "Ejecutivo Demo",
    },
  );
  replaceApplicationInStore(updatedApplication);
  return updatedDocument;
}

export async function updateDocumentStatus(
  applicationId: string,
  documentId: string,
  status: DocumentStatus,
  comments?: string,
): Promise<DocumentItem> {
  await wait();
  const application = await getApplicationOrThrow(applicationId);
  const now = new Date().toISOString();
  const updatedDocuments = application.documents.map((document) =>
    document.id === documentId
      ? {
          ...document,
          status,
          comments: status === "rechazado" ? comments || "Documento observado para corrección." : comments,
          reviewedAt: ["validado", "rechazado"].includes(status) ? now : document.reviewedAt,
          uploadedAt: ["cargado", "en_revision", "validado", "rechazado"].includes(status)
            ? document.uploadedAt ?? now
            : document.uploadedAt,
          fileName:
            ["cargado", "en_revision", "validado", "rechazado"].includes(status) && !document.fileName
              ? `${document.type}.pdf`
              : document.fileName,
          fileSizeMb:
            ["cargado", "en_revision", "validado", "rechazado"].includes(status) && !document.fileSizeMb
              ? 2
              : document.fileSizeMb,
          fileType:
            ["cargado", "en_revision", "validado", "rechazado"].includes(status) && !document.fileType
              ? ("pdf" as const)
              : document.fileType,
        }
      : document,
  );
  const updatedDocument = updatedDocuments.find((document) => document.id === documentId);
  if (!updatedDocument) throw new Error("Documento no encontrado.");

  const documentValidation = getDocumentStatusForValidation(updatedDocuments);
  const updatedApplication = appendTimeline(
    updateValidationInApplication(
      {
        ...application,
        documents: updatedDocuments,
        status: documentValidation.status === "aprobado" ? "documentos_revision" : "documentos_pendientes",
      },
      "documentos",
      {
        status: documentValidation.status,
        result: documentValidation.status === "aprobado" ? "Documentación cargada" : "Documentación observada",
        detail: documentValidation.detail,
      },
    ),
    {
      status: documentValidation.status === "aprobado" ? "documentos_revision" : "documentos_pendientes",
      title: "Estado documental actualizado",
      description: `${updatedDocument.label}: ${status}`,
      actor: "Analista Demo",
    },
  );
  replaceApplicationInStore(updatedApplication);
  return updatedDocument;
}
