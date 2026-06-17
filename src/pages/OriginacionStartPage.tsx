import { useState } from "react";
import { IdCard, Landmark, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { PersonType } from "../features/applications/types/application.types";
import { createTrace } from "../features/traces/services/traceService";
import { Button } from "../shared/components/Button";
import { Card } from "../shared/components/Card";
import { PageHeader } from "../shared/components/PageHeader";

export function OriginacionStartPage() {
  const navigate = useNavigate();
  const [personType, setPersonType] = useState<PersonType>("fisica");
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    try {
      const trace = await createTrace({ person_type: personType });
      navigate(`/originacion/${trace.trace_id}/ine`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Iniciar originación"
        description="El proceso comienza con la carga y validación de INE."
      />
      <Card title="Tipo de persona" description="Selecciona el perfil inicial de la originación">
        <div className="grid gap-4 md:grid-cols-2">
          <button
            className={`rounded-2xl border p-5 text-left transition ${
              personType === "fisica" ? "border-[#0F4C81] bg-[#E6F0FA]" : "border-slate-200 hover:border-slate-300"
            }`}
            type="button"
            onClick={() => setPersonType("fisica")}
          >
            <User className="mb-3 h-6 w-6 text-[#0F4C81]" />
            <p className="text-lg font-bold text-slate-950">Persona Física</p>
            <p className="mt-1 text-sm text-slate-500">Carga y validación inicial de INE del titular.</p>
          </button>
          <button
            className={`rounded-2xl border p-5 text-left transition ${
              personType === "moral" ? "border-[#0F4C81] bg-[#E6F0FA]" : "border-slate-200 hover:border-slate-300"
            }`}
            type="button"
            onClick={() => setPersonType("moral")}
          >
            <Landmark className="mb-3 h-6 w-6 text-[#0F4C81]" />
            <p className="text-lg font-bold text-slate-950">Persona Moral</p>
            <p className="mt-1 text-sm text-slate-500">Carga y validación inicial de INE del representante legal.</p>
          </button>
        </div>
        <div className="mt-6">
          <Button icon={<IdCard className="h-4 w-4" />} loading={loading} type="button" onClick={start}>
            Comenzar con carga de INE
          </Button>
        </div>
      </Card>
    </>
  );
}
