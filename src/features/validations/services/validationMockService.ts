import type {
  BureauResult,
  CreditDecision,
  ExistingClientResult,
  IneValidationResult,
  KnockoutResult,
  ListsValidationResult,
} from "../types/validation.types";
import {
  appendTimeline,
  getApplicationById,
  replaceApplicationInStore,
  updateValidationInApplication,
} from "../../applications/services/applicationMockService";
import { wait } from "../../../shared/lib/mockDelay";
import { runDecisionRules } from "../utils/decisionRules";

async function getApplicationOrThrow(applicationId: string) {
  const application = await getApplicationById(applicationId);
  if (!application) throw new Error("Solicitud no encontrada.");
  return application;
}

export async function runIneValidation(applicationId: string): Promise<IneValidationResult> {
  await wait();
  const application = await getApplicationOrThrow(applicationId);
  const isRejectedCase = application.rejectionReason === "ine_vencida" || application.id === "app_002";
  const result: IneValidationResult = isRejectedCase
    ? {
        imageQuality: "ok",
        isExpired: true,
        existsInRegistry: true,
        status: "rechazado",
        message: "La INE se encuentra vencida.",
      }
    : {
        imageQuality: "ok",
        isExpired: false,
        existsInRegistry: true,
        status: "aprobado",
        message: "INE validada correctamente.",
      };

  const status = result.status === "rechazado" ? "rechazada" : "documentos_pendientes";
  const updated = appendTimeline(
    updateValidationInApplication(
      {
        ...application,
        status,
        decision: result.status === "rechazado" ? "rechazada" : application.decision,
        rejectionReason: result.status === "rechazado" ? "ine_vencida" : application.rejectionReason,
      },
      "ine",
      { status: result.status, result: result.message, detail: result.message },
    ),
    {
      status,
      title: "Validación INE ejecutada",
      description: result.message,
      actor: "Sistema Demo",
    },
  );
  replaceApplicationInStore(updated);
  return result;
}

export async function runKnockoutValidation(applicationId: string): Promise<KnockoutResult> {
  await wait();
  const application = await getApplicationOrThrow(applicationId);
  const failed = application.applicantName.toLowerCase().includes("bloqueo");
  const result: KnockoutResult = {
    passed: !failed,
    reasons: failed ? ["Cliente con bloqueo interno"] : [],
  };
  const updated = appendTimeline(
    updateValidationInApplication(application, "knockouts", {
      status: result.passed ? "aprobado" : "rechazado",
      result: result.passed ? "Reglas knockout aprobadas" : "Reglas knockout rechazadas",
      detail: result.reasons.join(", ") || "Sin reglas eliminatorias detectadas.",
    }),
    {
      status: result.passed ? application.status : "rechazada",
      title: "Knockouts ejecutados",
      description: result.passed ? "Sin reglas eliminatorias detectadas." : result.reasons.join(", "),
      actor: "Sistema Demo",
    },
  );
  replaceApplicationInStore(result.passed ? updated : { ...updated, status: "rechazada", decision: "rechazada" });
  return result;
}

export async function runExistingClientValidation(applicationId: string): Promise<ExistingClientResult> {
  await wait();
  const application = await getApplicationOrThrow(applicationId);
  const exists = application.applicantRfc?.endsWith("000") ?? false;
  const result: ExistingClientResult = {
    exists,
    customerId: exists ? "CUS-DEMO-001" : undefined,
    message: exists ? "Prospecto detectado como cliente existente." : "No se encontró cliente existente.",
  };
  const updated = appendTimeline(
    updateValidationInApplication(application, "cliente_existente", {
      status: exists ? "rechazado" : "aprobado",
      result: result.message,
      detail: result.message,
    }),
    {
      status: exists ? "rechazada" : application.status,
      title: "Cliente existente validado",
      description: result.message,
      actor: "Sistema Demo",
    },
  );
  replaceApplicationInStore(exists ? { ...updated, status: "rechazada", decision: "rechazada" } : updated);
  return result;
}

export async function sendSmsCode(applicationId: string): Promise<{ code: string; message: string }> {
  await wait();
  const application = await getApplicationOrThrow(applicationId);
  const updated = appendTimeline(
    updateValidationInApplication({ ...application, status: "sms_pendiente" }, "sms", {
      status: "procesando",
      result: "Código enviado",
      detail: "Código demo: 123456",
    }),
    {
      status: "sms_pendiente",
      title: "SMS enviado",
      description: "Código demo generado: 123456",
      actor: "Sistema Demo",
    },
  );
  replaceApplicationInStore(updated);
  return { code: "123456", message: "Código SMS demo enviado." };
}

export async function verifySmsCode(applicationId: string, code: string): Promise<{ valid: boolean; message: string }> {
  await wait();
  const application = await getApplicationOrThrow(applicationId);
  const valid = code === "123456";
  const updated = appendTimeline(
    updateValidationInApplication({ ...application, status: valid ? "consulta_buro" : application.status }, "sms", {
      status: valid ? "aprobado" : "observado",
      result: valid ? "Código validado" : "Código incorrecto",
      detail: valid ? "Validación SMS aprobada." : "El código capturado no coincide con el código demo.",
    }),
    {
      status: valid ? "consulta_buro" : application.status,
      title: "SMS validado",
      description: valid ? "Código validado correctamente." : "Código incorrecto.",
      actor: "Ejecutivo Demo",
    },
  );
  replaceApplicationInStore(updated);
  return { valid, message: valid ? "Código validado correctamente." : "Código incorrecto." };
}

function defaultBureauScore(applicationId: string, scenario: string): number {
  if (applicationId === "app_004") return 610;
  if (applicationId === "app_006") return 480;
  if (scenario === "persona_fisica_hit_buro") return 680;
  return 710;
}

export async function runBureauQuery(applicationId: string): Promise<BureauResult> {
  await wait();
  const application = await getApplicationOrThrow(applicationId);
  const hasHit = application.scenario !== "persona_moral_no_hit_buro";
  const score = hasHit ? application.bureauScore ?? defaultBureauScore(application.id, application.scenario) : null;
  const result: BureauResult = {
    hasHit,
    score,
    status: hasHit ? "aprobado" : "observado",
    message: hasHit ? `Hit Buró encontrado. Score ${score}.` : "Sin historial crediticio disponible.",
  };
  const updated = appendTimeline(
    updateValidationInApplication(
      {
        ...application,
        status: hasHit ? "validacion_listas" : "modelo_decision",
        bureauScore: score,
      },
      "buro",
      { status: result.status, result: result.message, detail: result.message },
    ),
    {
      status: hasHit ? "validacion_listas" : "modelo_decision",
      title: "Consulta Buró ejecutada",
      description: result.message,
      actor: "Sistema Demo",
    },
  );
  replaceApplicationInStore(updated);
  return result;
}

export async function runListsValidation(applicationId: string): Promise<ListsValidationResult> {
  await wait();
  const application = await getApplicationOrThrow(applicationId);
  const failed = application.applicantName.toLowerCase().includes("sancion");
  const result: ListsValidationResult = {
    blacklists: failed,
    curp: false,
    sat: false,
    judicialRecords: false,
    publicCommerceRegistry: false,
    satSanctions: false,
    status: failed ? "rechazado" : "aprobado",
    message: failed ? "Se encontró coincidencia en listas." : "Validación de listas aprobada.",
  };
  const updated = appendTimeline(
    updateValidationInApplication(
      {
        ...application,
        status: failed ? "rechazada" : "modelo_decision",
        decision: failed ? "rechazada" : application.decision,
        rejectionReason: failed ? "validacion_listas_rechazada" : application.rejectionReason,
      },
      "listas",
      { status: result.status, result: result.message, detail: result.message },
    ),
    {
      status: failed ? "rechazada" : "modelo_decision",
      title: "Listas validadas",
      description: result.message,
      actor: "Sistema Demo",
    },
  );
  replaceApplicationInStore(updated);
  return result;
}

export async function runDecisionModel(applicationId: string): Promise<CreditDecision> {
  await wait();
  const application = await getApplicationOrThrow(applicationId);
  const preparedApplication = {
    ...application,
    bureauScore:
      application.scenario === "persona_moral_no_hit_buro"
        ? null
        : application.bureauScore ?? defaultBureauScore(application.id, application.scenario),
  };
  const decision = runDecisionRules(preparedApplication);
  const updated = appendTimeline(
    updateValidationInApplication(
      {
        ...preparedApplication,
        decision: decision.decision,
        status: decision.status,
        assignedCreditLine: decision.assignedCreditLine,
        bureauScore: decision.bureauScore,
        finalScore: decision.finalScore,
        riskLevel: decision.riskLevel,
        rejectionReason: decision.rejectionReason,
        decisionResult: decision,
      },
      "modelo_decision",
      {
        status: decision.decision === "aprobada" ? "aprobado" : decision.decision === "observada" ? "observado" : "rechazado",
        result: decision.message,
        detail: decision.message,
      },
    ),
    {
      status: decision.status,
      title: "Modelo de decisión ejecutado",
      description: decision.message,
      actor: "Sistema Demo",
    },
  );
  replaceApplicationInStore(updated);
  return decision;
}
