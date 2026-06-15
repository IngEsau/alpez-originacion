import type {
  ApplicationStatus,
  DocumentType,
  ValidationType,
} from "../features/applications/types/application.types";

export const APPLICATION_STATUS_ORDER: ApplicationStatus[] = [
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

export const PHYSICAL_PERSON_DOCUMENTS: DocumentType[] = [
  "ine_titular",
  "curp",
  "constancia_situacion_fiscal",
  "comprobante_domicilio_titular",
  "comprobante_domicilio_negocio",
  "estados_cuenta_bancarios",
  "opinion_positiva_sat",
  "garantia",
  "ine_aval",
  "comprobante_domicilio_aval",
];

export const MORAL_PERSON_DOCUMENTS: DocumentType[] = [
  "ine_representante_legal",
  "constancia_situacion_fiscal",
  "comprobante_domicilio_empresa",
  "comprobante_domicilio_representante",
  "estados_cuenta_bancarios",
  "estados_financieros",
  "declaracion_anual",
  "poder_representante_legal",
  "acta_constitutiva",
  "opinion_positiva_sat",
  "garantia",
  "ine_aval",
  "comprobante_domicilio_aval",
];

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  ine_titular: "INE titular",
  curp: "CURP",
  constancia_situacion_fiscal: "Constancia de Situación Fiscal",
  comprobante_domicilio_titular: "Comprobante domicilio titular",
  comprobante_domicilio_negocio: "Comprobante domicilio negocio",
  comprobante_domicilio_empresa: "Comprobante domicilio empresa",
  comprobante_domicilio_representante: "Comprobante domicilio representante legal",
  ine_representante_legal: "INE representante legal",
  opinion_positiva_sat: "Opinión positiva SAT",
  estados_cuenta_bancarios: "Estados de cuenta bancarios",
  declaracion_anual: "Declaración anual",
  estados_financieros: "Estados financieros",
  poder_representante_legal: "Poder representante legal",
  acta_constitutiva: "Acta constitutiva",
  garantia: "Garantía",
  ine_aval: "INE aval",
  comprobante_domicilio_aval: "Comprobante domicilio aval",
};

export const VALIDATION_TYPES: ValidationType[] = [
  "ine",
  "knockouts",
  "cliente_existente",
  "sms",
  "buro",
  "listas",
  "documentos",
  "modelo_decision",
  "investigacion_legal",
  "contratos",
];

export const VALIDATION_LABELS: Record<ValidationType, string> = {
  ine: "Validación INE",
  knockouts: "Knockouts",
  cliente_existente: "Cliente existente",
  sms: "SMS",
  buro: "Consulta Buró",
  listas: "Validación de listas",
  documentos: "Validación documental",
  modelo_decision: "Modelo de decisión",
  investigacion_legal: "Investigación legal",
  contratos: "Contratos",
};
