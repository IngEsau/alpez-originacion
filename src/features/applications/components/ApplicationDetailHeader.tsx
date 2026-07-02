import { ArrowLeft, Play } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import type { Application } from "../types/application.types";
import {
  ApplicationDecisionBadge,
  ApplicationScenarioBadge,
  ApplicationStatusBadge,
} from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { formatDate, personTypeLabels } from "../../../shared/lib/formatters";
import type { InternalWorkflowState } from "../types/application.types";

export function ApplicationDetailHeader({
  application,
  workflow,
  hasEvaluation,
  onRunContextAction,
  onRunDecision,
  running,
}: {
  application: Application;
  workflow: InternalWorkflowState;
  hasEvaluation?: boolean;
  onRunContextAction: () => void;
  onRunDecision: () => void;
  running?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Button icon={<ArrowLeft className="h-4 w-4" />} size="sm" type="button" variant="ghost" onClick={() => navigate("/solicitudes")}>
            Volver a solicitudes
          </Button>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-[#0F4C81]">{application.folio}</span>
            <ApplicationStatusBadge status={application.status} />
            <ApplicationDecisionBadge decision={application.decision} />
            <ApplicationScenarioBadge scenario={application.scenario} />
          </div>
          <h1 className="mt-3 text-2xl font-bold text-slate-950">{application.applicantName}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {personTypeLabels[application.personType]} · Creada {formatDate(application.createdAt)} · {application.executiveName}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Trace ID:{" "}
            <Link className="font-bold text-[#0F4C81] hover:underline" to={`/trazas/${application.trace_id}`}>
              {application.trace_id}
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {workflow.nextAction !== "none" && (
            <Button loading={running} type="button" variant="secondary" onClick={onRunContextAction}>
              {workflow.nextActionLabel}
            </Button>
          )}
          <Button
            icon={<Play className="h-4 w-4" />}
            loading={running}
            type="button"
            variant={hasEvaluation ? "outline" : "primary"}
            onClick={onRunDecision}
          >
            {hasEvaluation ? "Recalcular evaluación" : "Ejecutar evaluación"}
          </Button>
        </div>
      </div>
    </div>
  );
}
