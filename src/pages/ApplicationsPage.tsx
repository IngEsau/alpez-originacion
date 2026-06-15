import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Application, ApplicationFilters as Filters } from "../features/applications/types/application.types";
import { getApplications } from "../features/applications/services/applicationService";
import { ApplicationFilters } from "../features/applications/components/ApplicationFilters";
import { ApplicationsEmptyState } from "../features/applications/components/ApplicationsEmptyState";
import { ApplicationsTable } from "../features/applications/components/ApplicationsTable";
import { Button } from "../shared/components/Button";
import { EmptyState } from "../shared/components/EmptyState";
import { PageHeader } from "../shared/components/PageHeader";
import { Skeleton } from "../shared/components/Skeleton";

export function ApplicationsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Filters>({
    search: "",
    status: "todos",
    personType: "todos",
    decision: "todas",
    scenario: "todos",
  });
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(nextFilters = filters) {
    setLoading(true);
    setError(null);
    try {
      setApplications(await getApplications(nextFilters));
    } catch {
      setError("No se pudo cargar la bandeja demo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(filters);
  }, [filters]);

  return (
    <>
      <PageHeader
        title="Solicitudes"
        description="Consulta y seguimiento de solicitudes de originación"
        actions={
          <Button icon={<Plus className="h-4 w-4" />} type="button" onClick={() => navigate("/originacion/nueva")}>
            Iniciar originación
          </Button>
        }
      />
      <ApplicationFilters filters={filters} onChange={setFilters} />
      <div className="mt-5">
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="mt-4 h-12 w-full" />
            <Skeleton className="mt-3 h-12 w-full" />
            <Skeleton className="mt-3 h-12 w-full" />
          </div>
        )}
        {!loading && error && (
          <EmptyState title={error} description="Reintenta leer el store local." action={<Button onClick={() => load()}>Reintentar</Button>} />
        )}
        {!loading && !error && applications.length === 0 && <ApplicationsEmptyState />}
        {!loading && !error && applications.length > 0 && <ApplicationsTable applications={applications} />}
      </div>
    </>
  );
}
