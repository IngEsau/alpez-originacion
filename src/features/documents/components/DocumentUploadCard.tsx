import { useState } from "react";
import { CheckCircle2, Eye, RotateCcw, Upload, XCircle } from "lucide-react";
import type { DocumentItem, DocumentStatus } from "../types/document.types";
import { Button } from "../../../shared/components/Button";
import { DocumentStatusBadge } from "../../../shared/components/Badge";
import { Textarea } from "../../../shared/components/Textarea";
import { formatDateTime } from "../../../shared/lib/formatters";

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
  const [error, setError] = useState<string | null>(null);

  function changeStatus(status: DocumentStatus) {
    if (status === "rechazado" && !comment.trim()) {
      setError("El comentario es obligatorio para solicitar cambio.");
      return;
    }
    setError(null);
    onStatusChange?.(document.id, status, status === "rechazado" ? comment : comment || undefined);
  }

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
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {document.fileName && (
            <Button icon={<Eye className="h-4 w-4" />} size="sm" type="button" variant="outline">
              Ver archivo
            </Button>
          )}
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
      </div>
      <div className="mt-4 grid gap-3">
        <Textarea
          label="Comentario del agente"
          placeholder="La imagen no es legible, el documento está incompleto o se requiere una versión más reciente."
          value={comment}
          onChange={(event) => {
            setError(null);
            setComment(event.target.value);
          }}
        />
        {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button
            icon={<CheckCircle2 className="h-4 w-4" />}
            loading={busy}
            size="sm"
            type="button"
            variant="secondary"
            onClick={() => changeStatus("validado")}
          >
            Aprobar documento
          </Button>
          <Button
            icon={<XCircle className="h-4 w-4" />}
            loading={busy}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => changeStatus("rechazado")}
          >
            Solicitar cambio
          </Button>
          <Button
            icon={<RotateCcw className="h-4 w-4" />}
            loading={busy}
            size="sm"
            type="button"
            variant="ghost"
            onClick={() => changeStatus("pendiente")}
          >
            Marcar pendiente
          </Button>
        </div>
      </div>
      {document.comments && <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">{document.comments}</p>}
    </article>
  );
}
