import type { DocumentItem, DocumentStatus } from "../types/document.types";
import { Card } from "../../../shared/components/Card";
import { DocumentUploadCard } from "./DocumentUploadCard";
import { calculateDocumentSummary } from "../../applications/utils/workflowState";

export function DocumentChecklist({
  documents,
  title = "Checklist documental",
  description = "Documentos requeridos para integrar el expediente",
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
  const summary = calculateDocumentSummary(documents);

  return (
    <Card
      title={title}
      description={description}
      actions={
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
          <span>Req. {summary.totalRequired}</span>
          <span>Faltan {summary.missing}</span>
          <span>Carg. {summary.uploaded}</span>
          <span>Rev. {summary.pendingReview}</span>
          <span>Val. {summary.approved}</span>
          <span>Cambio {summary.needsChange}</span>
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
