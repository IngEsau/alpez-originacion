import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { SolicitudLayout } from "../layouts/SolicitudLayout";
import { SolicitudFlowPage } from "../pages/SolicitudFlowPage";
import { SolicitudSuccessPage } from "../pages/SolicitudSuccessPage";

function RedirectSolicitudLanding() {
  const location = useLocation();
  return <Navigate replace to={`/${location.search}`} />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<SolicitudLayout />}>
        <Route path="/" element={<SolicitudFlowPage />} />
        <Route path="/solicitud" element={<RedirectSolicitudLanding />} />
        <Route path="/solicitud/:flowId" element={<SolicitudFlowPage />} />
        <Route path="/solicitud/:flowId/final" element={<SolicitudSuccessPage />} />
      </Route>
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}
