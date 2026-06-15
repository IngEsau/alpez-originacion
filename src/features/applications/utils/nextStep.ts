import type { ApplicationStatus } from "../types/application.types";

export const nextStepLabels: Record<ApplicationStatus, string> = {
  nueva: "Continuar captura de datos",
  captura_datos: "Validar INE",
  validacion_ine: "Solicitar documentos",
  documentos_pendientes: "Completar documentos requeridos",
  documentos_revision: "Revisar documentos cargados",
  sms_pendiente: "Enviar SMS",
  consulta_buro: "Consultar Buró",
  validacion_listas: "Validar listas",
  modelo_decision: "Ejecutar modelo de decisión",
  analisis_credito: "Revisar análisis de crédito",
  investigacion_legal: "Validar investigación legal",
  contratos: "Preparar firma de contratos",
  aprobada: "Solicitud aprobada",
  rechazada: "Revisar motivo de rechazo",
};
