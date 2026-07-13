import type {
  Application,
  ApplicationFilters,
  ApplicationStatus,
  CreateApplicationPayload,
  DashboardSummary,
  DocumentStatus,
  TimelineEvent,
  ValidationItem,
} from "../types/application.types";
import { APPLICATIONS_MOCK } from "../../../mocks/applications.mock";
import { APPLICATION_STATUS_ORDER, VALIDATION_LABELS, VALIDATION_TYPES } from "../../../mocks/catalogs.mock";
import { createDocumentsForApplication } from "../../../mocks/documents.mock";
import { createFolio, createId } from "../../../shared/lib/ids";
import { wait } from "../../../shared/lib/mockDelay";
import { productizeStoredCopy } from "../../../shared/lib/productCopy";
import { getTracesStoreSnapshot } from "../../traces/services/traceMockService";

const STORAGE_KEY = "alpez_applications";

function cloneApplications(applications: Application[]): Application[] {
  return structuredClone(applications);
}

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function normalizeStoredCopy(application: Application): Application {
  const clean = productizeStoredCopy;
  const cleanOptional = (value?: string) => value ? clean(value) : value;
  return {
    ...application,
    applicantName: clean(application.applicantName),
    executiveName: clean(application.executiveName),
    physicalPerson: application.physicalPerson
      ? {
          ...application.physicalPerson,
          firstName: clean(application.physicalPerson.firstName),
          lastName: clean(application.physicalPerson.lastName),
          email: clean(application.physicalPerson.email),
        }
      : undefined,
    moralPerson: application.moralPerson
      ? {
          ...application.moralPerson,
          legalName: clean(application.moralPerson.legalName),
          commercialName: cleanOptional(application.moralPerson.commercialName),
        }
      : undefined,
    legalRepresentative: application.legalRepresentative
      ? {
          ...application.legalRepresentative,
          fullName: clean(application.legalRepresentative.fullName),
          email: clean(application.legalRepresentative.email),
        }
      : undefined,
    guarantor: application.guarantor
      ? {
          ...application.guarantor,
          fullName: clean(application.guarantor.fullName),
          email: cleanOptional(application.guarantor.email),
        }
      : undefined,
    timeline: application.timeline.map((event) => ({
      ...event,
      title: clean(event.title),
      description: event.description ? clean(event.description) : event.description,
      actor: clean(event.actor),
    })),
    validations: application.validations.map((validation) => ({
      ...validation,
      detail: validation.detail ? clean(validation.detail) : validation.detail,
    })),
  };
}

function readStore(): Application[] {
  if (!canUseLocalStorage()) return cloneApplications(APPLICATIONS_MOCK);

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(APPLICATIONS_MOCK));
    return cloneApplications(APPLICATIONS_MOCK);
  }

  try {
    return (JSON.parse(saved) as Application[]).map((application, index) => normalizeStoredCopy({
      ...application,
      trace_id: application.trace_id ?? `TRC-LEGACY-${String(index + 1).padStart(4, "0")}`,
    }));
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(APPLICATIONS_MOCK));
    return cloneApplications(APPLICATIONS_MOCK);
  }
}

function writeStore(applications: Application[]): void {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
  }
}

export function getApplicationsStoreSnapshot(): Application[] {
  return readStore();
}

export function replaceApplicationInStore(application: Application): Application {
  const applications = readStore();
  const nextApplications = applications.map((item) => (item.id === application.id ? application : item));
  writeStore(nextApplications);
  return structuredClone(application);
}

export function appendTimeline(application: Application, event: Omit<TimelineEvent, "id" | "applicationId" | "createdAt">): Application {
  const now = new Date().toISOString();
  return {
    ...application,
    timeline: [
      ...application.timeline,
      {
        id: createId("tl"),
        applicationId: application.id,
        createdAt: now,
        ...event,
      },
    ],
    updatedAt: now,
  };
}

export function updateValidationInApplication(
  application: Application,
  type: ValidationItem["type"],
  patch: Partial<ValidationItem>,
): Application {
  const now = new Date().toISOString();
  return {
    ...application,
    validations: application.validations.map((validation) =>
      validation.type === type
        ? {
            ...validation,
            ...patch,
            completedAt: patch.status && patch.status !== "pendiente" ? now : validation.completedAt,
          }
        : validation,
    ),
    updatedAt: now,
  };
}

function applyFilters(applications: Application[], filters?: ApplicationFilters): Application[] {
  const search = filters?.search?.trim().toLowerCase();

  return applications.filter((application) => {
    const matchesSearch =
      !search ||
      application.folio.toLowerCase().includes(search) ||
      application.applicantName.toLowerCase().includes(search) ||
      application.applicantRfc?.toLowerCase().includes(search);
    const matchesStatus = !filters?.status || filters.status === "todos" || application.status === filters.status;
    const matchesPersonType =
      !filters?.personType || filters.personType === "todos" || application.personType === filters.personType;
    const matchesDecision =
      !filters?.decision || filters.decision === "todas" || application.decision === filters.decision;
    const matchesScenario =
      !filters?.scenario || filters.scenario === "todos" || application.scenario === filters.scenario;

    return matchesSearch && matchesStatus && matchesPersonType && matchesDecision && matchesScenario;
  });
}

export async function getApplications(filters?: ApplicationFilters): Promise<Application[]> {
  await wait();
  return applyFilters(readStore(), filters).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function getApplicationById(id: string): Promise<Application | null> {
  await wait();
  return readStore().find((application) => application.id === id) ?? null;
}

function initialValidations(applicationId: string): ValidationItem[] {
  return VALIDATION_TYPES.map((type) => ({
    id: `${applicationId}_${type}`,
    applicationId,
    type,
    label: VALIDATION_LABELS[type],
    status: "pendiente",
  }));
}

function getApplicantName(payload: CreateApplicationPayload): string {
  if (payload.personType === "fisica" && payload.physicalPerson) {
    return [
      payload.physicalPerson.firstName,
      payload.physicalPerson.middleName,
      payload.physicalPerson.lastName,
      payload.physicalPerson.secondLastName,
    ]
      .filter(Boolean)
      .join(" ");
  }

  return payload.moralPerson?.legalName ?? "Prospecto ALPEZ";
}

function getApplicantRfc(payload: CreateApplicationPayload): string | undefined {
  return payload.personType === "fisica" ? payload.physicalPerson?.rfc : payload.moralPerson?.rfc;
}

function getApplicantCurp(payload: CreateApplicationPayload): string | undefined {
  return payload.personType === "fisica" ? payload.physicalPerson?.curp : payload.legalRepresentative?.curp;
}

export async function createApplication(payload: CreateApplicationPayload): Promise<Application> {
  await wait();
  const applications = readStore();
  const id = createId("app");
  const createdAt = new Date().toISOString();
  const nextNumber = applications.length + 1;
  const documentStatuses = Object.entries(payload.initialDocumentStatuses ?? {}).reduce<Record<string, DocumentStatus>>(
    (accumulator, [type, status]) => ({ ...accumulator, [type]: status }),
    {},
  );
  const application: Application = {
    id,
    folio: createFolio(nextNumber),
    trace_id: payload.trace_id ?? `TRC-DIRECT-${String(nextNumber).padStart(4, "0")}`,
    personType: payload.personType,
    scenario: payload.scenario,
    status: "captura_datos",
    decision: "pendiente",
    applicantName: getApplicantName(payload),
    applicantRfc: getApplicantRfc(payload),
    applicantCurp: getApplicantCurp(payload),
    requestedAmount: payload.requestedAmount,
    assignedCreditLine: null,
    bureauScore: null,
    finalScore: null,
    riskLevel: "no_aplica",
    executiveName: payload.executiveName,
    physicalPerson: payload.physicalPerson,
    moralPerson: payload.moralPerson,
    legalRepresentative: payload.legalRepresentative,
    guarantor: payload.guarantor,
    documents: createDocumentsForApplication(id, payload.personType, "pendiente", documentStatuses),
    validations: initialValidations(id),
    timeline: [
      {
        id: createId("tl"),
        applicationId: id,
        status: "captura_datos",
        title: "Solicitud creada",
        description: "Captura inicial completada desde el formulario de originación.",
        actor: payload.executiveName,
        createdAt,
      },
    ],
    createdAt,
    updatedAt: createdAt,
  };

  const nextApplications = [application, ...applications];
  writeStore(nextApplications);
  return structuredClone(application);
}

export async function updateApplication(id: string, payload: Partial<Application>): Promise<Application> {
  await wait();
  const application = readStore().find((item) => item.id === id);
  if (!application) throw new Error("Solicitud no encontrada.");

  const updated = {
    ...application,
    ...payload,
    id: application.id,
    updatedAt: new Date().toISOString(),
  };
  return replaceApplicationInStore(updated);
}

export async function updateApplicationStatus(id: string, status: ApplicationStatus): Promise<Application> {
  await wait();
  const application = readStore().find((item) => item.id === id);
  if (!application) throw new Error("Solicitud no encontrada.");

  const updated = appendTimeline(
    {
      ...application,
      status,
    },
    {
      status,
      title: "Estado actualizado",
      description: `La solicitud cambió a ${status}.`,
      actor: "Sistema ALPEZ",
    },
  );
  return replaceApplicationInStore(updated);
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  await wait();
  const applications = readStore();
  const traces = getTracesStoreSnapshot();
  const byStatus = APPLICATION_STATUS_ORDER.map((status) => ({
    status,
    count: applications.filter((application) => application.status === status).length,
  })).filter((item) => item.count > 0);

  return {
    totalApplications: applications.length,
    newApplications: applications.filter((application) => application.status === "nueva").length,
    inValidation: applications.filter((application) =>
      ["validacion_ine", "sms_pendiente", "consulta_buro", "validacion_listas", "modelo_decision", "analisis_credito"].includes(
        application.status,
      ),
    ).length,
    pendingDocuments: applications.filter((application) =>
      ["documentos_pendientes", "documentos_revision"].includes(application.status),
    ).length,
    approved: applications.filter((application) =>
      ["aprobada", "contratos", "investigacion_legal"].includes(application.status),
    ).length,
    rejected: applications.filter((application) => application.status === "rechazada").length,
    runningApplications: applications.filter((application) =>
      !["aprobada", "contratos", "investigacion_legal", "rechazada"].includes(application.status),
    ).length,
    totalTraces: traces.length,
    runningTraces: traces.filter((trace) => trace.status === "running").length,
    failedTraces: traces.filter((trace) => trace.status === "failed" || trace.status === "rejected").length,
    totalRequestedAmount: applications.reduce((total, application) => total + application.requestedAmount, 0),
    totalAssignedCreditLine: applications.reduce(
      (total, application) => total + (application.assignedCreditLine ?? 0),
      0,
    ),
    byStatus,
    byScenario: [
      {
        scenario: "persona_fisica_hit_buro",
        count: applications.filter((application) => application.scenario === "persona_fisica_hit_buro").length,
      },
      {
        scenario: "persona_moral_hit_buro",
        count: applications.filter((application) => application.scenario === "persona_moral_hit_buro").length,
      },
      {
        scenario: "persona_moral_no_hit_buro",
        count: applications.filter((application) => application.scenario === "persona_moral_no_hit_buro").length,
      },
    ],
    recentApplications: applications
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5),
  };
}
