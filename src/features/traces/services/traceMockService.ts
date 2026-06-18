import type {
  AddTraceEventPayload,
  CreateTracePayload,
  ExistingClientInitialValidationResult,
  IneInitialValidationResult,
  KnockoutValidationResult,
  Trace,
  TraceStatus,
  TraceStep,
} from "../types/trace.types";
import { TRACES_MOCK } from "../../../mocks/traces.mock";
import { createId } from "../../../shared/lib/ids";
import { wait } from "../../../shared/lib/mockDelay";

const STORAGE_KEY = "alpez_traces";

function cloneTraces(traces: Trace[]): Trace[] {
  return structuredClone(traces);
}

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function readStore(): Trace[] {
  if (!canUseLocalStorage()) return cloneTraces(TRACES_MOCK);

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(TRACES_MOCK));
    return cloneTraces(TRACES_MOCK);
  }

  try {
    return JSON.parse(saved) as Trace[];
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(TRACES_MOCK));
    return cloneTraces(TRACES_MOCK);
  }
}

function writeStore(traces: Trace[]): void {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(traces));
  }
}

export function getTracesStoreSnapshot(): Trace[] {
  return readStore();
}

function replaceTrace(trace: Trace): Trace {
  const traces = readStore();
  const nextTraces = traces.map((item) => (item.trace_id === trace.trace_id ? trace : item));
  writeStore(nextTraces);
  return structuredClone(trace);
}

function nextTraceId(): string {
  const traces = readStore();
  const date = new Date();
  const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const todayCount = traces.filter((trace) => trace.trace_id.startsWith(`TRC-${datePart}`)).length + 1;
  return `TRC-${datePart}-${String(todayCount).padStart(4, "0")}`;
}

export async function getTraces(): Promise<Trace[]> {
  await wait();
  return readStore().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getTraceById(trace_id: string): Promise<Trace | null> {
  await wait();
  return readStore().find((trace) => trace.trace_id === trace_id) ?? null;
}

export async function createTrace(payload: CreateTracePayload): Promise<Trace> {
  await wait();
  const traces = readStore();
  const now = new Date().toISOString();
  const trace_id = nextTraceId();
  const trace: Trace = {
    trace_id,
    person_type: payload.person_type,
    current_step: "ine_carga",
    status: "running",
    ine_front_loaded: false,
    ine_back_loaded: false,
    created_at: now,
    updated_at: now,
    events: [
      {
        id: createId("trace_event"),
        trace_id,
        step: "originacion_iniciada",
        title: "Originación iniciada",
        description: "Se creó la traza y el proceso inicia con carga de INE.",
        status: "success",
        created_at: now,
        metadata: payload.person_type ? { person_type: payload.person_type } : undefined,
      },
    ],
  };
  writeStore([trace, ...traces]);
  return structuredClone(trace);
}

export async function addTraceEvent(trace_id: string, event: AddTraceEventPayload): Promise<Trace> {
  await wait(200);
  const trace = readStore().find((item) => item.trace_id === trace_id);
  if (!trace) throw new Error("Traza no encontrada.");

  const now = new Date().toISOString();
  const updated: Trace = {
    ...trace,
    current_step: event.step,
    events: [
      ...trace.events,
      {
        id: createId("trace_event"),
        trace_id,
        created_at: now,
        ...event,
      },
    ],
    updated_at: now,
  };
  return replaceTrace(updated);
}

export async function updateTraceStatus(trace_id: string, status: TraceStatus, current_step?: TraceStep): Promise<Trace> {
  await wait(200);
  const trace = readStore().find((item) => item.trace_id === trace_id);
  if (!trace) throw new Error("Traza no encontrada.");

  return replaceTrace({
    ...trace,
    status,
    current_step: current_step ?? trace.current_step,
    updated_at: new Date().toISOString(),
  });
}

export async function updateTraceIneUpload(
  trace_id: string,
  side: "front" | "back",
): Promise<Trace> {
  const title = side === "front" ? "Carga frontal INE simulada" : "Carga reverso INE simulada";
  const description = side === "front" ? "Archivo frontal_ine.jpg cargado." : "Archivo reverso_ine.jpg cargado.";
  const trace = await getTraceById(trace_id);
  if (!trace) throw new Error("Traza no encontrada.");

  const updated = replaceTrace({
    ...trace,
    current_step: "ine_carga",
    ine_front_loaded: side === "front" ? true : trace.ine_front_loaded,
    ine_back_loaded: side === "back" ? true : trace.ine_back_loaded,
    updated_at: new Date().toISOString(),
  });
  const withEvent = await addTraceEvent(trace_id, {
    step: "ine_carga",
    title,
    description,
    status: "success",
    metadata: { file_name: side === "front" ? "frontal_ine.jpg" : "reverso_ine.jpg", file_type: "jpg" },
  });

  if (updated.ine_front_loaded && updated.ine_back_loaded) {
    return addTraceEvent(trace_id, {
      step: "ine_carga",
      title: "Documentos INE listos para validación",
      description: "La imagen frontal y el reverso de INE están cargados.",
      status: "success",
    });
  }

  return withEvent;
}

function resultForTrace(trace: Trace): IneInitialValidationResult {
  if (trace.trace_id.endsWith("0002")) {
    return {
      image_quality: "valid",
      is_expired: true,
      exists_in_registry: true,
      status: "rejected",
      rejection_reason: "expired",
      message: "La INE se encuentra vencida.",
    };
  }
  if (trace.trace_id.endsWith("0003")) {
    return {
      image_quality: "invalid",
      is_expired: false,
      exists_in_registry: true,
      status: "observed",
      rejection_reason: "low_quality",
      message: "La imagen no tiene calidad suficiente.",
    };
  }
  if (trace.trace_id.endsWith("0004")) {
    return {
      image_quality: "valid",
      is_expired: false,
      exists_in_registry: false,
      status: "rejected",
      rejection_reason: "not_found_registry",
      message: "No fue posible validar existencia en padrón.",
    };
  }

  return {
    image_quality: "valid",
    is_expired: false,
    exists_in_registry: true,
    status: "approved",
    message: "INE validada correctamente.",
  };
}

export async function runIneInitialValidation(trace_id: string): Promise<IneInitialValidationResult> {
  await wait();
  const trace = readStore().find((item) => item.trace_id === trace_id);
  if (!trace) throw new Error("Traza no encontrada.");
  if (!trace.ine_front_loaded || !trace.ine_back_loaded) {
    const result: IneInitialValidationResult = {
      image_quality: "invalid",
      is_expired: false,
      exists_in_registry: false,
      status: "observed",
      rejection_reason: "low_quality",
      message: "Carga frontal y reverso de INE antes de validar.",
    };
    await addTraceEvent(trace_id, {
      step: "ine_validacion_calidad",
      title: "INE observada",
      description: result.message,
      status: "warning",
      metadata: { ...result },
    });
    return result;
  }

  const result = resultForTrace(trace);
  const eventStep =
    result.rejection_reason === "low_quality"
      ? "ine_validacion_calidad"
      : result.rejection_reason === "expired"
        ? "ine_validacion_vigencia"
        : "ine_validacion_padron";

  if (result.rejection_reason === "low_quality") {
    await addTraceEvent(trace_id, {
      step: "ine_validacion_calidad",
      title: "Calidad de imagen observada",
      description: result.message,
      status: "warning",
      metadata: { ...result },
    });
  } else if (result.rejection_reason === "expired") {
    await addTraceEvent(trace_id, {
      step: "ine_validacion_calidad",
      title: "Calidad de imagen aprobada",
      description: "La imagen tiene calidad suficiente.",
      status: "success",
      metadata: { image_quality: result.image_quality },
    });
    await addTraceEvent(trace_id, {
      step: "ine_validacion_vigencia",
      title: "Vigencia de INE rechazada",
      description: result.message,
      status: "error",
      metadata: { ...result },
    });
  } else if (result.rejection_reason === "not_found_registry") {
    await addTraceEvent(trace_id, {
      step: "ine_validacion_calidad",
      title: "Calidad de imagen aprobada",
      description: "La imagen tiene calidad suficiente.",
      status: "success",
      metadata: { image_quality: result.image_quality },
    });
    await addTraceEvent(trace_id, {
      step: "ine_validacion_vigencia",
      title: "Vigencia de INE aprobada",
      description: "La INE se encuentra vigente.",
      status: "success",
      metadata: { is_expired: result.is_expired },
    });
    await addTraceEvent(trace_id, {
      step: "ine_validacion_padron",
      title: "Padrón rechazado",
      description: result.message,
      status: "error",
      metadata: { ...result },
    });
  } else {
    await addTraceEvent(trace_id, {
      step: "ine_validacion_calidad",
      title: "Calidad de imagen aprobada",
      description: "La imagen tiene calidad suficiente.",
      status: "success",
      metadata: { image_quality: result.image_quality },
    });
    await addTraceEvent(trace_id, {
      step: "ine_validacion_vigencia",
      title: "Vigencia de INE aprobada",
      description: "La INE se encuentra vigente.",
      status: "success",
      metadata: { is_expired: result.is_expired },
    });
    await addTraceEvent(trace_id, {
      step: "ine_validacion_padron",
      title: "INE aprobada",
      description: result.message,
      status: "success",
      metadata: { ...result },
    });
  }

  if (result.status === "approved") {
    await updateTraceStatus(trace_id, "running", "knockouts");
  } else {
    await updateTraceStatus(trace_id, result.status === "observed" ? "failed" : "rejected", eventStep);
  }

  return result;
}

export async function runKnockoutsValidation(trace_id: string): Promise<KnockoutValidationResult> {
  await wait();
  const trace = readStore().find((item) => item.trace_id === trace_id);
  if (!trace) throw new Error("Traza no encontrada.");
  const failed = trace.trace_id.endsWith("0005");
  const result: KnockoutValidationResult = {
    passed: !failed,
    reasons: failed ? ["Actividad no permitida"] : [],
    status: failed ? "rejected" : "approved",
    message: failed ? "Originación rechazada por reglas knockout." : "Knockouts aprobados.",
  };

  await addTraceEvent(trace_id, {
    step: "knockouts",
    title: result.passed ? "Knockouts aprobados" : "Knockouts rechazados",
    description: result.passed ? "Sin reglas eliminatorias detectadas." : result.reasons.join(", "),
    status: result.passed ? "success" : "error",
    metadata: { ...result },
  });
  await updateTraceStatus(trace_id, result.passed ? "running" : "rejected", result.passed ? "cliente_existente" : "knockouts");
  return result;
}

export async function runExistingClientInitialValidation(
  trace_id: string,
): Promise<ExistingClientInitialValidationResult> {
  await wait();
  const trace = readStore().find((item) => item.trace_id === trace_id);
  if (!trace) throw new Error("Traza no encontrada.");
  const exists = trace.trace_id.endsWith("0008");
  const result: ExistingClientInitialValidationResult = {
    exists,
    customer_id: exists ? "CUS-DEMO-001" : undefined,
    status: exists ? "rejected" : "approved",
    message: exists ? "Prospecto detectado como cliente existente." : "No se encontró cliente existente.",
  };

  await addTraceEvent(trace_id, {
    step: "cliente_existente",
    title: result.exists ? "Cliente existente detectado" : "Cliente existente aprobado",
    description: result.message,
    status: result.exists ? "error" : "success",
    metadata: { ...result },
  });
  await updateTraceStatus(trace_id, result.exists ? "rejected" : "running", result.exists ? "cliente_existente" : "captura_datos");
  return result;
}

export async function linkTraceApplication(trace_id: string, application_id: string): Promise<Trace> {
  const trace = readStore().find((item) => item.trace_id === trace_id);
  if (!trace) throw new Error("Traza no encontrada.");
  replaceTrace({
    ...trace,
    application_id,
    current_step: "documentos",
    status: "running",
    updated_at: new Date().toISOString(),
  });
  return addTraceEvent(trace_id, {
    step: "documentos",
    title: "Pre-solicitud ligada a traza",
    description: `La pre-solicitud ${application_id} quedó ligada al trace_id y pasa a expediente documental.`,
    status: "success",
    metadata: { application_id },
  });
}
