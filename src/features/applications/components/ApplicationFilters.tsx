import type {
  ApplicationDecision,
  ApplicationFilters as Filters,
  ApplicationScenario,
  ApplicationStatus,
  PersonType,
} from "../types/application.types";
import { Input } from "../../../shared/components/Input";
import { Select } from "../../../shared/components/Select";
import {
  applicationDecisionLabels,
  applicationStatusLabels,
  fullScenarioLabels,
  personTypeLabels,
} from "../../../shared/lib/formatters";

const statusOptions: Array<ApplicationStatus | "todos"> = [
  "todos",
  "nueva",
  "captura_datos",
  "validacion_ine",
  "documentos_pendientes",
  "documentos_revision",
  "sms_pendiente",
  "consulta_buro",
  "validacion_listas",
  "modelo_decision",
  "analisis_credito",
  "investigacion_legal",
  "contratos",
  "aprobada",
  "rechazada",
];

const personTypeOptions: Array<PersonType | "todos"> = ["todos", "fisica", "moral"];
const decisionOptions: Array<ApplicationDecision | "todas"> = ["todas", "pendiente", "aprobada", "rechazada", "observada"];
const scenarioOptions: Array<ApplicationScenario | "todos"> = [
  "todos",
  "persona_fisica_hit_buro",
  "persona_moral_hit_buro",
  "persona_moral_no_hit_buro",
];

export function ApplicationFilters({ filters, onChange }: { filters: Filters; onChange: (filters: Filters) => void }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
      <Input
        label="Búsqueda general"
        placeholder="Buscar por folio, cliente o RFC"
        value={filters.search ?? ""}
        onChange={(event) => onChange({ ...filters, search: event.target.value })}
      />
      <Select
        label="Estado"
        options={statusOptions.map((value) => ({
          value,
          label: value === "todos" ? "Todos" : applicationStatusLabels[value],
        }))}
        value={filters.status ?? "todos"}
        onChange={(event) => onChange({ ...filters, status: event.target.value as Filters["status"] })}
      />
      <Select
        label="Tipo persona"
        options={personTypeOptions.map((value) => ({
          value,
          label: value === "todos" ? "Todos" : personTypeLabels[value],
        }))}
        value={filters.personType ?? "todos"}
        onChange={(event) => onChange({ ...filters, personType: event.target.value as Filters["personType"] })}
      />
      <Select
        label="Decisión"
        options={decisionOptions.map((value) => ({
          value,
          label: value === "todas" ? "Todas" : applicationDecisionLabels[value],
        }))}
        value={filters.decision ?? "todas"}
        onChange={(event) => onChange({ ...filters, decision: event.target.value as Filters["decision"] })}
      />
      <Select
        label="Perfil"
        options={scenarioOptions.map((value) => ({
          value,
          label: value === "todos" ? "Todos" : fullScenarioLabels[value],
        }))}
        value={filters.scenario ?? "todos"}
        onChange={(event) => onChange({ ...filters, scenario: event.target.value as Filters["scenario"] })}
      />
    </div>
  );
}
