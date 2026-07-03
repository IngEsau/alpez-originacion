import type { AddressCatalogResult, SaveGeneralDataPayload, StatesCatalogResult } from "../../../services/api/onboarding.types";
import type { BasicData, OnboardingGeneralData } from "../types/solicitud.types";

export interface StateOption {
  id: string;
  name: string;
}

export interface ColonyOption {
  id: string;
  name: string;
}

export interface AddressLookupData {
  codigoPostal: string;
  estadoId: string;
  estadoNombre: string;
  municipioId: string;
  municipioNombre: string;
  colonias: ColonyOption[];
}

export const EMPTY_ONBOARDING_GENERAL_DATA: OnboardingGeneralData = {
  primerNombre: "",
  segundoNombre: "",
  apellidoPaterno: "",
  apellidoMaterno: "",
  fechaNacimiento: "",
  genero: "",
  telefono: "",
  correo: "",
  rfc: "",
  curp: "",
  estadoNacimientoId: null,
  direccion: "",
  numExt: "",
  numInt: "",
  codigoPostal: "",
  estadoId: "",
  estadoNombre: "",
  municipioId: "",
  municipioNombre: "",
  coloniaId: "",
  coloniaNombre: "",
};

export const FALLBACK_STATES: StateOption[] = [
  { id: "1", name: "Aguascalientes" },
  { id: "9", name: "Ciudad de México" },
  { id: "14", name: "Jalisco" },
  { id: "15", name: "Estado de México" },
  { id: "19", name: "Nuevo León" },
  { id: "21", name: "Puebla" },
  { id: "22", name: "Querétaro" },
  { id: "30", name: "Veracruz" },
];

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function toTitleCase(value: string): string {
  return value
    .toLocaleLowerCase("es-MX")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|\s|[-'])\p{L}/gu, (letter) => letter.toLocaleUpperCase("es-MX"));
}

function cleanIdentityCode(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function normalizeGeneralDataInput(data: OnboardingGeneralData): OnboardingGeneralData {
  return {
    ...data,
    primerNombre: toTitleCase(data.primerNombre),
    segundoNombre: toTitleCase(data.segundoNombre),
    apellidoPaterno: toTitleCase(data.apellidoPaterno),
    apellidoMaterno: toTitleCase(data.apellidoMaterno),
    telefono: onlyDigits(data.telefono).slice(0, 10),
    correo: data.correo.trim().toLowerCase(),
    rfc: cleanIdentityCode(data.rfc).slice(0, 13),
    curp: cleanIdentityCode(data.curp).slice(0, 18),
    codigoPostal: onlyDigits(data.codigoPostal).slice(0, 5),
    direccion: data.direccion.replace(/\s+/g, " ").trim(),
    numExt: data.numExt.replace(/\s+/g, " ").trim(),
    numInt: data.numInt.replace(/\s+/g, " ").trim(),
  };
}

export function basicDataFromGeneralData(data: OnboardingGeneralData, companyName = ""): BasicData {
  const nameParts = [data.primerNombre, data.segundoNombre, data.apellidoPaterno, data.apellidoMaterno].filter(Boolean);
  return {
    fullName: nameParts.join(" "),
    representativeName: nameParts.join(" "),
    companyName,
    phone: data.telefono,
    email: data.correo,
    rfc: data.rfc,
    curp: data.curp,
  };
}

export function generalDataFromBasicData(data: BasicData): OnboardingGeneralData {
  const parts = (data.fullName || data.representativeName).trim().split(/\s+/).filter(Boolean);
  return {
    ...EMPTY_ONBOARDING_GENERAL_DATA,
    primerNombre: parts[0] ?? "",
    segundoNombre: parts.length > 3 ? parts.slice(1, -2).join(" ") : "",
    apellidoPaterno: parts.length >= 2 ? parts[parts.length - 2] : "",
    apellidoMaterno: parts.length >= 3 ? parts[parts.length - 1] : "",
    telefono: data.phone,
    correo: data.email,
    rfc: data.rfc,
    curp: data.curp,
  };
}

export function mapGeneralDataToBackendPayload(
  generalData: OnboardingGeneralData,
  backendTraceId: string,
): SaveGeneralDataPayload {
  const normalized = normalizeGeneralDataInput(generalData);
  return {
    trace_id: backendTraceId,
    primer_nombre: normalized.primerNombre.trim(),
    segundo_nombre: normalized.segundoNombre.trim(),
    apellido_paterno: normalized.apellidoPaterno.trim(),
    apellido_materno: normalized.apellidoMaterno.trim(),
    fecha_nacimiento: normalized.fechaNacimiento,
    genero: normalized.genero || "O",
    telefono: onlyDigits(normalized.telefono),
    correo: normalized.correo.trim().toLowerCase(),
    rfc: normalized.rfc.trim().toUpperCase(),
    curp: normalized.curp.trim().toUpperCase(),
    estado_nacimiento_id: Number(normalized.estadoNacimientoId),
    direccion: normalized.direccion.trim(),
    num_ext: normalized.numExt.trim(),
    num_int: normalized.numInt.trim(),
    colonia_id: String(normalized.coloniaId),
    estado_id: String(normalized.estadoId),
    municipio_id: String(normalized.municipioId),
    codigo_postal: onlyDigits(normalized.codigoPostal),
  };
}

export function validateGeneralData(data: OnboardingGeneralData): Partial<Record<keyof OnboardingGeneralData, string>> {
  const normalized = normalizeGeneralDataInput(data);
  const errors: Partial<Record<keyof OnboardingGeneralData, string>> = {};

  if (!normalized.primerNombre) errors.primerNombre = "Ingresa tu primer nombre.";
  if (!normalized.apellidoPaterno) errors.apellidoPaterno = "Ingresa tu apellido paterno.";
  if (!normalized.fechaNacimiento) errors.fechaNacimiento = "Selecciona tu fecha de nacimiento.";
  if (!normalized.genero) errors.genero = "Selecciona una opción.";
  if (normalized.telefono && normalized.telefono.length !== 10) {
    errors.telefono = "Ingresa un celular válido de 10 dígitos.";
  } else if (!normalized.telefono) {
    errors.telefono = "Ingresa tu celular.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.correo)) {
    errors.correo = normalized.correo ? "Ingresa un correo válido." : "Ingresa tu correo.";
  }
  if (normalized.rfc.length < 12 || normalized.rfc.length > 13) {
    errors.rfc = "Revisa que el RFC tenga el formato correcto.";
  }
  if (normalized.curp.length !== 18) {
    errors.curp = "Revisa que la CURP tenga 18 caracteres.";
  }
  if (!normalized.estadoNacimientoId) errors.estadoNacimientoId = "Selecciona tu estado de nacimiento.";
  if (normalized.codigoPostal.length !== 5) errors.codigoPostal = "Ingresa un código postal válido.";
  if (!normalized.direccion) errors.direccion = "Ingresa la calle.";
  if (!normalized.numExt) errors.numExt = "Ingresa el número exterior.";
  if (!normalized.estadoId || !normalized.estadoNombre) errors.estadoId = "Ingresa el estado.";
  if (!normalized.municipioId || !normalized.municipioNombre) errors.municipioId = "Ingresa el municipio.";
  if (!normalized.coloniaId || !normalized.coloniaNombre) errors.coloniaId = "Selecciona o escribe la colonia.";

  return errors;
}

export function isGeneralDataComplete(data: OnboardingGeneralData): boolean {
  return Object.keys(validateGeneralData(data)).length === 0;
}

function readString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" || typeof value === "number") return String(value);
  }
  return "";
}

export function mapStatesCatalog(result: StatesCatalogResult | unknown): StateOption[] {
  const source = result && typeof result === "object" && "estados" in result
    ? (result as StatesCatalogResult).estados
    : Array.isArray(result) ? result : [];

  return source
    .map((state) => {
      if (!state || typeof state !== "object") return null;
      const record = state as Record<string, unknown>;
      const id = readString(record, ["id", "estado_id", "clave"]);
      const name = readString(record, ["nombre", "estado", "name"]);
      return id && name ? { id, name } : null;
    })
    .filter((state): state is StateOption => Boolean(state));
}

export function mapAddressCatalog(result: AddressCatalogResult | unknown): AddressLookupData {
  const data = result && typeof result === "object" && "data" in result
    ? (result as { data?: unknown }).data
    : result;
  const record = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const coloniasRaw = Array.isArray(record.colonias) ? record.colonias : [];

  return {
    codigoPostal: readString(record, ["codigo_postal", "cp"]),
    estadoId: readString(record, ["estado_id", "estadoId"]),
    estadoNombre: readString(record, ["estado", "estado_nombre", "estadoNombre"]),
    municipioId: readString(record, ["municipio_id", "municipioId"]),
    municipioNombre: readString(record, ["municipio", "municipio_nombre", "municipioNombre"]),
    colonias: coloniasRaw
      .map((colonia, index) => {
        if (typeof colonia === "string") return { id: colonia, name: colonia };
        if (!colonia || typeof colonia !== "object") return null;
        const coloniaRecord = colonia as Record<string, unknown>;
        const name = readString(coloniaRecord, ["nombre", "colonia", "name"]);
        const id = readString(coloniaRecord, ["id", "colonia_id", "clave"]) || name || String(index + 1);
        return name ? { id, name } : null;
      })
      .filter((colonia): colonia is ColonyOption => Boolean(colonia)),
  };
}
