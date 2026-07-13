import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../shared/components/Button";
import { EmptyState } from "../../../shared/components/EmptyState";

export function ApplicationsEmptyState() {
  const navigate = useNavigate();

  return (
    <EmptyState
      title="No hay solicitudes con esos filtros"
      description="Ajusta la búsqueda o inicia una nueva solicitud."
      action={
        <Button icon={<Plus className="h-4 w-4" />} type="button" onClick={() => navigate("/solicitud")}>
          Iniciar originación
        </Button>
      }
    />
  );
}
