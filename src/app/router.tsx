import { Navigate, Route, Routes } from "react-router-dom";
import { AuthLayout } from "../layouts/AuthLayout";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { OriginacionLayout } from "../layouts/OriginacionLayout";
import { PublicPortalLayout } from "../layouts/PublicPortalLayout";
import { ApplicationsPage } from "../pages/ApplicationsPage";
import { ApplicationDetailPage } from "../pages/ApplicationDetailPage";
import { DashboardPage } from "../pages/DashboardPage";
import { IneCapturePage } from "../pages/IneCapturePage";
import { LoginPage } from "../pages/LoginPage";
import { NewApplicationPage } from "../pages/NewApplicationPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { OriginacionFlowPage } from "../pages/OriginacionFlowPage";
import { OriginacionStartPage } from "../pages/OriginacionStartPage";
import { PortalPage } from "../pages/PortalPage";
import { TraceDetailPage } from "../pages/TraceDetailPage";
import { TracesPage } from "../pages/TracesPage";
import { hasDemoSession } from "../shared/lib/session";

function PrivateRoute() {
  return hasDemoSession() ? <DashboardLayout /> : <Navigate replace to="/login" />;
}

function PublicRoute() {
  return hasDemoSession() ? <Navigate replace to="/dashboard" /> : <AuthLayout />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicPortalLayout />}>
        <Route path="/" element={<PortalPage />} />
      </Route>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route element={<OriginacionLayout />}>
        <Route path="/originacion/iniciar" element={<OriginacionStartPage />} />
        <Route path="/originacion/nueva" element={<Navigate replace to="/originacion/iniciar" />} />
        <Route path="/originacion/:traceId/ine" element={<IneCapturePage />} />
        <Route path="/originacion/:traceId" element={<OriginacionFlowPage />} />
        <Route path="/originacion/:traceId/captura" element={<OriginacionFlowPage />} />
        <Route path="/originacion/:traceId/documentos" element={<OriginacionFlowPage />} />
        <Route path="/originacion/:traceId/buro" element={<OriginacionFlowPage />} />
        <Route path="/originacion/:traceId/listas" element={<OriginacionFlowPage />} />
        <Route path="/originacion/:traceId/decision" element={<OriginacionFlowPage />} />
        <Route path="/originacion/:traceId/resumen" element={<OriginacionFlowPage />} />
      </Route>
      <Route element={<PrivateRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/solicitudes" element={<ApplicationsPage />} />
        <Route path="/solicitudes/nueva" element={<NewApplicationPage />} />
        <Route path="/solicitudes/:id" element={<ApplicationDetailPage />} />
        <Route path="/trazas" element={<TracesPage />} />
        <Route path="/trazas/:traceId" element={<TraceDetailPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
