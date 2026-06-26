import { ClipboardList, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../shared/components/Button";
import { PageHeader } from "../../../shared/components/PageHeader";

export function DashboardHeader() {
  const navigate = useNavigate();

  return (
    <PageHeader
      title="Dashboard operativo"
      description="Resumen general de solicitudes de originación"
      actions={
        <>
          <Button icon={<Play className="h-4 w-4" />} type="button" onClick={() => navigate("/solicitud")}>
            Iniciar originación
          </Button>
          <Button
            icon={<ClipboardList className="h-4 w-4" />}
            type="button"
            variant="outline"
            onClick={() => navigate("/solicitudes")}
          >
            Ver solicitudes
          </Button>
        </>
      }
    />
  );
}
