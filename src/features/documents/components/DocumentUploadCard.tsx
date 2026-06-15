import { useState } from "react";
import { Upload } from "lucide-react";
import type { DocumentItem, DocumentStatus } from "../types/document.types";
import { Button } from "../../../shared/components/Button";
import { DocumentStatusBadge } from "../../../shared/components/Badge";
import { Select } from "../../../shared/components/Select";
import { Textarea } from "../../../shared/components/Textarea";
import { documentStatusLabels, formatDateTime } from "../../../shared/lib/formatters";

const statuses: DocumentStatus[] = ["pendiente", "cargado", "en_revision", "validado", "rechazado"];

export function DocumentUploadCard({
  document,
  busy,
  onUpload,
  onStatusChange,
}: {
  document: DocumentItem;
  busy?: boolean;
  onUpload?: (documentId: string) => void;
  onStatusChange?: (documentId: string, status: DocumentStatus, comments?: string) => void;
}) {
  const [comment, setComment] = useState(document.comments ?? "");

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-950">{document.label}</h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {document.required ? "Requerido" : "Opcional"}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <DocumentStatusBadge status={document.status} />
            {document.fileName && <span className="text-xs text-slate-500">{document.fileName}</span>}
            {document.fileSizeMb && <span className="text-xs text-slate-500">{document.fileSizeMb} MB</span>}
          </div>
          {document.uploadedAt && (
            <p className="mt-2 text-xs text-slate-500">Cargado: {formatDateTime(document.uploadedAt)}</p>
          )}
        </div>
        <Button
          icon={<Upload className="h-4 w-4" />}
          loading={busy}
          size="sm"
          type="button"
          variant="secondary"
          onClick={() => onUpload?.(document.id)}
        >
          Simular carga
        </Button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[220px_1fr]">
        <Select
          label="Estado documental"
          options={statuses.map((status) => ({ value: status, label: documentStatusLabels[status] }))}
          value={document.status}
          onChange={(event) => onStatusChange?.(document.id, event.target.value as DocumentStatus, comment)}
        />
        {document.status === "rechazado" && (
          <Textarea
            label="Comentario de rechazo"
            placeholder="Documento ilegible, vencido o no corresponde al solicitante"
            value={comment}
            onBlur={() => onStatusChange?.(document.id, "rechazado", comment || "Documento observado para corrección.")}
            onChange={(event) => setComment(event.target.value)}
          />
        )}
      </div>
      {document.comments && <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">{document.comments}</p>}
    </article>
  );
}
