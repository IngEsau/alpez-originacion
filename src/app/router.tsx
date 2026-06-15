import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import { ApplicationsPage } from "../pages/ApplicationsPage";
import { ApplicationDetailPage } from "../pages/ApplicationDetailPage";
import { DashboardPage } from "../pages/DashboardPage";
import { LoginPage } from "../pages/LoginPage";
import { NewApplicationPage } from "../pages/NewApplicationPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { OriginacionFlowPage } from "../pages/OriginacionFlowPage";
import { OriginacionStartPage } from "../pages/OriginacionStartPage";
import { TraceDetailPage } from "../pages/TraceDetailPage";
import { TracesPage } from "../pages/TracesPage";
import { hasDemoSession } from "../shared/lib/session";

function PrivateRoute() {
  return hasDemoSession() ? <AppLayout /> : <Navigate replace to="/login" />;
}

function PublicRoute() {
  return hasDemoSession() ? <Navigate replace to="/dashboard" /> : <AuthLayout />;
}

function RootRoute() {
  return <Navigate replace to={hasDemoSession() ? "/dashboard" : "/login"} />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<RootRoute />} />
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route element={<PrivateRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/originacion/nueva" element={<OriginacionStartPage />} />
        <Route path="/originacion/:traceId" element={<OriginacionFlowPage />} />
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
