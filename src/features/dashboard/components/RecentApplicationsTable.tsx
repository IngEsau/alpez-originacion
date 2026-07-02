import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Application } from "../../applications/types/application.types";
import {
  ApplicationDecisionBadge,
  ApplicationScenarioBadge,
  ApplicationStatusBadge,
} from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { formatDate, formatMoney, formatScore, personTypeLabels } from "../../../shared/lib/formatters";

export function RecentApplicationsTable({ applications }: { applications: Application[] }) {
  const navigate = useNavigate();

  return (
    <Card
      title="Solicitudes recientes"
      description="Últimos casos registrados en el store demo"
      actions={
        <Button size="sm" type="button" variant="outline" onClick={() => navigate("/solicitudes")}>
          Ver todas
        </Button>
      }
    >
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr className="border-b border-slate-200">
              <th className="py-3 pr-4">Folio</th>
              <th className="py-3 pr-4">Cliente</th>
              <th className="py-3 pr-4">Tipo</th>
              <th className="py-3 pr-4">Estado</th>
              <th className="py-3 pr-4">Score</th>
              <th className="py-3 pr-4">Línea sugerida por score</th>
              <th className="py-3 pr-4">Fecha</th>
              <th className="py-3 pr-0">Acción</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((application) => (
              <tr key={application.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="py-3 pr-4 font-semibold text-[#0F4C81]">{application.folio}</td>
                <td className="py-3 pr-4">
                  <p className="font-semibold text-slate-950">{application.applicantName}</p>
                  <div className="mt-1 flex gap-1">
                    <ApplicationScenarioBadge scenario={application.scenario} />
                    <ApplicationDecisionBadge decision={application.decision} />
                  </div>
                </td>
                <td className="py-3 pr-4 text-slate-600">{personTypeLabels[application.personType]}</td>
                <td className="py-3 pr-4">
                  <ApplicationStatusBadge status={application.status} />
                </td>
                <td className="py-3 pr-4 text-slate-600">{formatScore(application.bureauScore, application.finalScore)}</td>
                <td className="py-3 pr-4 text-slate-600">{formatMoney(application.assignedCreditLine)}</td>
                <td className="py-3 pr-4 text-slate-600">{formatDate(application.createdAt)}</td>
                <td className="py-3 pr-0">
                  <Button
                    icon={<ArrowRight className="h-4 w-4" />}
                    size="sm"
                    type="button"
                    variant="ghost"
                    onClick={() => navigate(`/solicitudes/${application.id}`)}
                  >
                    Ver
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
