import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Application } from "../types/application.types";
import {
  ApplicationDecisionBadge,
  ApplicationScenarioBadge,
  ApplicationStatusBadge,
} from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { formatDate, formatMoney, formatScore, personTypeLabels } from "../../../shared/lib/formatters";

export function ApplicationsTable({ applications }: { applications: Application[] }) {
  const navigate = useNavigate();

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-[1120px] w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-400">
          <tr>
            <th className="px-4 py-3">Folio</th>
            <th className="px-4 py-3">Cliente / Prospecto</th>
            <th className="px-4 py-3">Tipo persona</th>
            <th className="px-4 py-3">Escenario</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Decisión</th>
            <th className="px-4 py-3">Score</th>
            <th className="px-4 py-3">Monto solicitado</th>
            <th className="px-4 py-3">Línea sugerida</th>
            <th className="px-4 py-3">Ejecutivo</th>
            <th className="px-4 py-3">Fecha creación</th>
            <th className="px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((application) => (
            <tr key={application.id} className="border-t border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-3">
                <button
                  className="font-bold text-[#0F4C81] hover:underline"
                  type="button"
                  onClick={() => navigate(`/solicitudes/${application.id}`)}
                >
                  {application.folio}
                </button>
              </td>
              <td className="px-4 py-3">
                <p className="font-semibold text-slate-950">{application.applicantName}</p>
                <p className="text-xs text-slate-500">{application.applicantRfc ?? "RFC pendiente"}</p>
              </td>
              <td className="px-4 py-3 text-slate-600">{personTypeLabels[application.personType]}</td>
              <td className="px-4 py-3">
                <ApplicationScenarioBadge scenario={application.scenario} />
              </td>
              <td className="px-4 py-3">
                <ApplicationStatusBadge status={application.status} />
              </td>
              <td className="px-4 py-3">
                <ApplicationDecisionBadge decision={application.decision} />
              </td>
              <td className="px-4 py-3 text-slate-600">{formatScore(application.bureauScore, application.finalScore)}</td>
              <td className="px-4 py-3 text-slate-600">{formatMoney(application.requestedAmount)}</td>
              <td className="px-4 py-3 text-slate-600">{formatMoney(application.assignedCreditLine)}</td>
              <td className="px-4 py-3 text-slate-600">{application.executiveName}</td>
              <td className="px-4 py-3 text-slate-600">{formatDate(application.createdAt)}</td>
              <td className="px-4 py-3">
                <Button
                  icon={<ArrowRight className="h-4 w-4" />}
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/solicitudes/${application.id}`)}
                >
                  Ver detalle
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
