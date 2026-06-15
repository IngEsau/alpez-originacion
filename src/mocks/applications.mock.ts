import type {
  Application,
  ApplicationStatus,
  CreditDecision,
  DocumentStatus,
  PersonType,
  TimelineEvent,
  ValidationItem,
  ValidationStatus,
  ValidationType,
} from "../features/applications/types/application.types";
import { VALIDATION_LABELS, VALIDATION_TYPES } from "./catalogs.mock";
import { createDocumentsForApplication } from "./documents.mock";

const baseAddress = {
  street: "Av. Reforma",
  exteriorNumber: "120",
  neighborhood: "Centro",
  municipality: "Puebla",
  state: "Puebla",
  zipCode: "72000",
  country: "México",
};

function timeline(
  applicationId: string,
  status: ApplicationStatus,
  title: string,
  createdAt: string,
  description = "Evento generado para demo.",
): TimelineEvent[] {
  return [
    {
      id: `${applicationId}_tl_1`,
      applicationId,
      status: "nueva",
      title: "Solicitud creada",
      description: "Se generó el folio de originación.",
      actor: "Ejecutivo Demo",
      createdAt,
    },
    {
      id: `${applicationId}_tl_2`,
      applicationId,
      status,
      title,
      description,
      actor: "Sistema Demo",
      createdAt,
    },
  ];
}

function validations(
  applicationId: string,
  statuses: Partial<Record<ValidationType, ValidationStatus>> = {},
): ValidationItem[] {
  return VALIDATION_TYPES.map((type) => ({
    id: `${applicationId}_${type}`,
    applicationId,
    type,
    label: VALIDATION_LABELS[type],
    status: statuses[type] ?? "pendiente",
    result: statuses[type] ? VALIDATION_LABELS[type] : undefined,
    detail: statuses[type] ? "Resultado precargado para el caso demo." : undefined,
    completedAt: statuses[type] ? "2026-06-11T15:40:00.000Z" : undefined,
  }));
}

function decisionResult(application: Application, message: string): CreditDecision {
  return {
    applicationId: application.id,
    decision: application.decision,
    status: application.status,
    requestedAmount: application.requestedAmount,
    assignedCreditLine: application.assignedCreditLine,
    bureauScore: application.bureauScore,
    finalScore: application.finalScore,
    riskLevel: application.riskLevel,
    rejectionReason: application.rejectionReason,
    message,
    evaluatedAt: "2026-06-11T16:00:00.000Z",
  };
}

function physicalPersonApplication(params: {
  id: string;
  folio: string;
  trace_id?: string;
  applicantName: string;
  status: ApplicationStatus;
  decision: Application["decision"];
  requestedAmount: number;
  assignedCreditLine: number | null;
  bureauScore: number | null;
  riskLevel: Application["riskLevel"];
  rejectionReason?: Application["rejectionReason"];
  createdAt: string;
  docStatus?: DocumentStatus;
  docOverrides?: Parameters<typeof createDocumentsForApplication>[3];
  validationStatuses?: Partial<Record<ValidationType, ValidationStatus>>;
}): Application {
  const [firstName, lastName, secondLastName = ""] = params.applicantName.split(" ");
  return {
    id: params.id,
    folio: params.folio,
    trace_id: params.trace_id ?? `TRC-20260613-${params.id.replace("app_", "").padStart(4, "0")}`,
    personType: "fisica",
    scenario: "persona_fisica_hit_buro",
    status: params.status,
    decision: params.decision,
    rejectionReason: params.rejectionReason,
    applicantName: params.applicantName,
    applicantRfc: "MEOJ850612AB1",
    applicantCurp: "MEOJ850612HPLNRN07",
    requestedAmount: params.requestedAmount,
    assignedCreditLine: params.assignedCreditLine,
    bureauScore: params.bureauScore,
    finalScore: null,
    riskLevel: params.riskLevel,
    executiveName: "Ejecutivo Demo",
    physicalPerson: {
      firstName,
      lastName,
      secondLastName,
      rfc: "MEOJ850612AB1",
      curp: "MEOJ850612HPLNRN07",
      birthDate: "1985-06-12",
      phone: "2225550188",
      email: "prospecto@alpez.demo",
      personalAddress: baseAddress,
      businessAddress: { ...baseAddress, street: "Calle Negocio", exteriorNumber: "45" },
      businessActivity: "Abarrotes y miscelánea",
      businessSeniorityYears: 4,
      averageMonthlyIncome: 42000,
    },
    guarantor: {
      fullName: "María Aval Demo",
      rfc: "AADM800101XY1",
      curp: "AADM800101MPLVLN05",
      phone: "2225550199",
      email: "aval@alpez.demo",
      address: baseAddress,
    },
    documents: createDocumentsForApplication(
      params.id,
      "fisica",
      params.docStatus ?? "validado",
      params.docOverrides,
    ),
    validations: validations(params.id, params.validationStatuses),
    timeline: timeline(params.id, params.status, `Estado ${params.status}`, params.createdAt),
    createdAt: params.createdAt,
    updatedAt: "2026-06-12T12:00:00.000Z",
  };
}

function moralPersonApplication(params: {
  id: string;
  folio: string;
  trace_id?: string;
  applicantName: string;
  scenario: "persona_moral_hit_buro" | "persona_moral_no_hit_buro";
  status: ApplicationStatus;
  decision: Application["decision"];
  requestedAmount: number;
  assignedCreditLine: number | null;
  bureauScore: number | null;
  finalScore: number | null;
  riskLevel: Application["riskLevel"];
  rejectionReason?: Application["rejectionReason"];
  createdAt: string;
  docStatus?: DocumentStatus;
  validationStatuses?: Partial<Record<ValidationType, ValidationStatus>>;
}): Application {
  return {
    id: params.id,
    folio: params.folio,
    trace_id: params.trace_id ?? `TRC-20260613-${params.id.replace("app_", "").padStart(4, "0")}`,
    personType: "moral",
    scenario: params.scenario,
    status: params.status,
    decision: params.decision,
    rejectionReason: params.rejectionReason,
    applicantName: params.applicantName,
    applicantRfc: "TCO2104138P6",
    requestedAmount: params.requestedAmount,
    assignedCreditLine: params.assignedCreditLine,
    bureauScore: params.bureauScore,
    finalScore: params.finalScore,
    riskLevel: params.riskLevel,
    executiveName: "Ejecutivo Demo",
    moralPerson: {
      legalName: params.applicantName,
      commercialName: params.applicantName.replace("S.A. de C.V.", "").trim(),
      rfc: "TCO2104138P6",
      businessLine: "Comercio al por menor",
      constitutionDate: "2021-04-13",
      companySeniorityYears: 5,
      companyAddress: { ...baseAddress, street: "Blvd. Empresarial", exteriorNumber: "818" },
      averageMonthlyIncome: 120000,
      annualSales: 1450000,
      currentAssets: 430000,
      currentLiabilities: 180000,
      totalAssets: 980000,
      totalLiabilities: 390000,
      annualOperatingProfit: 280000,
      bankAccountSeniorityMonths: 38,
      averageBankBalance: 78000,
    },
    legalRepresentative: {
      fullName: "Daniela Ruiz Legal",
      rfc: "RULD870930Q81",
      curp: "RULD870930MPLZGL02",
      phone: "2225550123",
      email: "legal@alpez.demo",
      address: baseAddress,
    },
    guarantor: {
      fullName: "Socio Aval Demo",
      rfc: "SADM790201QW2",
      curp: "SADM790201HPLCLM08",
      phone: "2225550177",
      email: "socio.aval@alpez.demo",
      address: baseAddress,
    },
    documents: createDocumentsForApplication(params.id, "moral", params.docStatus ?? "validado"),
    validations: validations(params.id, params.validationStatuses),
    timeline: timeline(params.id, params.status, `Estado ${params.status}`, params.createdAt),
    createdAt: params.createdAt,
    updatedAt: "2026-06-12T12:30:00.000Z",
  };
}

const apps = [
  physicalPersonApplication({
    id: "app_001",
    folio: "ALP-000001",
    trace_id: "TRC-20260613-0006",
    applicantName: "Luis Mendoza Ortega",
    status: "contratos",
    decision: "aprobada",
    requestedAmount: 50000,
    assignedCreditLine: 30000,
    bureauScore: 680,
    riskLevel: "medio",
    createdAt: "2026-06-06T09:00:00.000Z",
    validationStatuses: {
      ine: "aprobado",
      knockouts: "aprobado",
      cliente_existente: "aprobado",
      sms: "aprobado",
      buro: "aprobado",
      listas: "aprobado",
      documentos: "aprobado",
      modelo_decision: "aprobado",
      investigacion_legal: "aprobado",
      contratos: "pendiente",
    },
  }),
  physicalPersonApplication({
    id: "app_002",
    folio: "ALP-000002",
    trace_id: "TRC-20260613-0002",
    applicantName: "Ana Silva Rojas",
    status: "rechazada",
    decision: "rechazada",
    requestedAmount: 35000,
    assignedCreditLine: null,
    bureauScore: null,
    riskLevel: "no_aplica",
    rejectionReason: "ine_vencida",
    createdAt: "2026-06-07T10:30:00.000Z",
    docStatus: "cargado",
    validationStatuses: { ine: "rechazado", knockouts: "aprobado" },
  }),
  physicalPersonApplication({
    id: "app_003",
    folio: "ALP-000003",
    trace_id: "TRC-20260613-0001",
    applicantName: "Carla Vega Torres",
    status: "documentos_pendientes",
    decision: "observada",
    requestedAmount: 40000,
    assignedCreditLine: null,
    bureauScore: 662,
    riskLevel: "no_aplica",
    rejectionReason: "documentos_incompletos",
    createdAt: "2026-06-08T11:20:00.000Z",
    docStatus: "pendiente",
    docOverrides: {
      ine_titular: "cargado",
      curp: "validado",
      constancia_situacion_fiscal: "cargado",
    },
    validationStatuses: { ine: "aprobado", documentos: "observado" },
  }),
  physicalPersonApplication({
    id: "app_004",
    folio: "ALP-000004",
    applicantName: "Roberto León Márquez",
    status: "rechazada",
    decision: "rechazada",
    requestedAmount: 45000,
    assignedCreditLine: null,
    bureauScore: 610,
    riskLevel: "no_aplica",
    rejectionReason: "score_insuficiente",
    createdAt: "2026-06-09T12:15:00.000Z",
    validationStatuses: {
      ine: "aprobado",
      knockouts: "aprobado",
      cliente_existente: "aprobado",
      sms: "aprobado",
      buro: "aprobado",
      listas: "aprobado",
      documentos: "aprobado",
      modelo_decision: "rechazado",
    },
  }),
  moralPersonApplication({
    id: "app_005",
    folio: "ALP-000005",
    applicantName: "Textiles Corona S.A. de C.V.",
    scenario: "persona_moral_hit_buro",
    status: "investigacion_legal",
    decision: "aprobada",
    requestedAmount: 80000,
    assignedCreditLine: 60000,
    bureauScore: 710,
    finalScore: null,
    riskLevel: "bajo",
    createdAt: "2026-06-09T15:00:00.000Z",
    validationStatuses: {
      ine: "aprobado",
      knockouts: "aprobado",
      cliente_existente: "aprobado",
      sms: "aprobado",
      buro: "aprobado",
      listas: "aprobado",
      documentos: "aprobado",
      modelo_decision: "aprobado",
      investigacion_legal: "pendiente",
    },
  }),
  moralPersonApplication({
    id: "app_006",
    folio: "ALP-000006",
    applicantName: "Distribuidora Nopal S.A. de C.V.",
    scenario: "persona_moral_hit_buro",
    status: "rechazada",
    decision: "rechazada",
    requestedAmount: 70000,
    assignedCreditLine: null,
    bureauScore: 480,
    finalScore: null,
    riskLevel: "no_aplica",
    rejectionReason: "score_insuficiente",
    createdAt: "2026-06-10T09:45:00.000Z",
    validationStatuses: {
      ine: "aprobado",
      knockouts: "aprobado",
      cliente_existente: "aprobado",
      sms: "aprobado",
      buro: "aprobado",
      listas: "aprobado",
      documentos: "aprobado",
      modelo_decision: "rechazado",
    },
  }),
  moralPersonApplication({
    id: "app_007",
    folio: "ALP-000007",
    applicantName: "Cafetería Puebla Centro S.A. de C.V.",
    scenario: "persona_moral_no_hit_buro",
    status: "modelo_decision",
    decision: "pendiente",
    requestedAmount: 30000,
    assignedCreditLine: null,
    bureauScore: null,
    finalScore: null,
    riskLevel: "no_aplica",
    createdAt: "2026-06-11T14:25:00.000Z",
    docStatus: "cargado",
    validationStatuses: {
      ine: "aprobado",
      knockouts: "aprobado",
      cliente_existente: "aprobado",
      sms: "aprobado",
      buro: "observado",
      listas: "aprobado",
      documentos: "aprobado",
      modelo_decision: "pendiente",
    },
  }),
  moralPersonApplication({
    id: "app_008",
    folio: "ALP-000008",
    applicantName: "Servicios Alba S.A. de C.V.",
    scenario: "persona_moral_no_hit_buro",
    status: "contratos",
    decision: "aprobada",
    requestedAmount: 50000,
    assignedCreditLine: 20000,
    bureauScore: null,
    finalScore: 78,
    riskLevel: "medio",
    createdAt: "2026-06-12T08:10:00.000Z",
    validationStatuses: {
      ine: "aprobado",
      knockouts: "aprobado",
      cliente_existente: "aprobado",
      sms: "aprobado",
      buro: "observado",
      listas: "aprobado",
      documentos: "aprobado",
      modelo_decision: "aprobado",
      investigacion_legal: "aprobado",
      contratos: "pendiente",
    },
  }),
];

export const APPLICATIONS_MOCK: Application[] = apps.map((app) => ({
  ...app,
  decisionResult:
    app.decision !== "pendiente"
      ? decisionResult(
          app,
          app.decision === "aprobada"
            ? "Solicitud aprobada en modelo de decisión."
            : app.decision === "observada"
              ? "Solicitud observada por documentos pendientes."
              : "Solicitud rechazada por regla demo.",
        )
      : undefined,
}));
