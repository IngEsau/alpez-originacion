import type { DocumentItem, DocumentStatus } from "../types/document.types";
import { Card } from "../../../shared/components/Card";
import { DocumentUploadCard } from "./DocumentUploadCard";

function documentCounters(documents: DocumentItem[]) {
  return {
    required: documents.filter((document) => document.required).length,
    loaded: documents.filter((document) => document.status === "cargado").length,
    validated: documents.filter((document) => document.status === "validado").length,
    rejected: documents.filter((document) => document.status === "rechazado").length,
    pending: documents.filter((document) => document.status === "pendiente").length,
  };
}

export function DocumentChecklist({
  documents,
  title = "Checklist documental",
  description = "Documentos requeridos para el expediente demo",
  busyDocumentId,
  onUpload,
  onStatusChange,
}: {
  documents: DocumentItem[];
  title?: string;
  description?: string;
  busyDocumentId?: string | null;
  onUpload?: (documentId: string) => void;
  onStatusChange?: (documentId: string, status: DocumentStatus, comments?: string) => void;
}) {
  const counters = documentCounters(documents);

  return (
    <Card
      title={title}
      description={description}
      actions={
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
          <span>Req. {counters.required}</span>
          <span>Carg. {counters.loaded}</span>
          <span>Val. {counters.validated}</span>
          <span>Rech. {counters.rejected}</span>
          <span>Pend. {counters.pending}</span>
        </div>
      }
    >
      <div className="grid gap-3 xl:grid-cols-2">
        {documents.map((document) => (
          <DocumentUploadCard
            key={document.id}
            busy={busyDocumentId === document.id}
            document={document}
            onStatusChange={onStatusChange}
            onUpload={onUpload}
          />
        ))}
      </div>
    </Card>
  );
}
