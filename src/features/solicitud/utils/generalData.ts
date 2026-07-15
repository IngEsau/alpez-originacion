import type { AddressCatalogResult, SaveGeneralDataPayload, StatesCatalogResult } from "../../../services/api/onboarding.types";
import type { BasicData, FiscalIdentity, OnboardingGeneralData } from "../types/solicitud.types";

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

export const EMPTY_FISCAL_IDENTITY: FiscalIdentity = {
  rfc: "",
  curp: "",
  source: "empty",
  confirmed: false,
};

export const FALLBACK_STATES: StateOption[] = [
  { id: "1", name: "Aguascalientes" },
  { id: "2", name: "Baja California" },
  { id: "3", name: "Baja California Sur" },
  { id: "4", name: "Campeche" },
  { id: "5", name: "Coahuila" },
  { id: "6", name: "Colima" },
  { id: "7", name: "Chiapas" },
  { id: "8", name: "Chihuahua" },
  { id: "9", name: "Ciudad de México" },
  { id: "10", name: "Durango" },
  { id: "11", name: "Guanajuato" },
  { id: "12", name: "Guerrero" },
  { id: "13", name: "Hidalgo" },
  { id: "14", name: "Jalisco" },
  { id: "15", name: "Estado de México" },
  { id: "16", name: "Michoacán" },
  { id: "17", name: "Morelos" },
  { id: "18", name: "Nayarit" },
  { id: "19", name: "Nuevo León" },
  { id: "20", name: "Oaxaca" },
  { id: "21", name: "Puebla" },
  { id: "22", name: "Querétaro" },
  { id: "23", name: "Quintana Roo" },
  { id: "24", name: "San Luis Potosí" },
  { id: "25", name: "Sinaloa" },
  { id: "26", name: "Sonora" },
  { id: "27", name: "Tabasco" },
  { id: "28", name: "Tamaulipas" },
  { id: "29", name: "Tlaxcala" },
  { id: "30", name: "Veracruz" },
  { id: "31", name: "Yucatán" },
  { id: "32", name: "Zacatecas" },
  { id: "33", name: "Nacido en el extranjero" },
];

const CURP_STATE_CODE_BY_ID: Record<number, string> = {
  1: "AS", 2: "BC", 3: "BS", 4: "CC", 5: "CL", 6: "CM", 7: "CS", 8: "CH",
  9: "DF", 10: "DG", 11: "GT", 12: "GR", 13: "HG", 14: "JC", 15: "MC", 16: "MN",
  17: "MS", 18: "NT", 19: "NL", 20: "OC", 21: "PL", 22: "QT", 23: "QR", 24: "SP",
  25: "SL", 26: "SR", 27: "TC", 28: "TS", 29: "TL", 30: "VZ", 31: "YN", 32: "ZS", 33: "NE",
};

const CURP_STATE_ID_BY_CODE = Object.fromEntries(
  Object.entries(CURP_STATE_CODE_BY_ID).map(([id, code]) => [code, Number(id)]),
) as Record<string, number>;

export function stateIdFromCurp(curp: string | undefined): number | undefined {
  const normalized = cleanIdentityCode(curp ?? "");
  if (normalized.length !== 18) return undefined;
  return CURP_STATE_ID_BY_CODE[normalized.slice(11, 13)];
}

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

function cleanOptionalIdentityCode(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const cleaned = cleanIdentityCode(String(value));
  return cleaned || undefined;
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
    codigoPostal: onlyDigits(data.codigoPostal).slice(0, 5),
    direccion: data.direccion.replace(/\s+/g, " ").trim(),
    numExt: data.numExt.replace(/\s+/g, " ").trim(),
    numInt: data.numInt.replace(/\s+/g, " ").trim(),
  };
}

export function normalizeFiscalIdentity(fiscalIdentity: FiscalIdentity): FiscalIdentity {
  return {
    ...fiscalIdentity,
    rfc: cleanIdentityCode(fiscalIdentity.rfc).slice(0, 13),
    curp: cleanIdentityCode(fiscalIdentity.curp).slice(0, 18),
  };
}

export function basicDataFromGeneralData(
  data: OnboardingGeneralData,
  companyName = "",
  fiscalIdentity: FiscalIdentity = EMPTY_FISCAL_IDENTITY,
): BasicData {
  const nameParts = [data.primerNombre, data.segundoNombre, data.apellidoPaterno, data.apellidoMaterno].filter(Boolean);
  const fiscal = normalizeFiscalIdentity(fiscalIdentity);
  return {
    fullName: nameParts.join(" "),
    representativeName: nameParts.join(" "),
    companyName,
    phone: data.telefono,
    email: data.correo,
    rfc: fiscal.rfc,
    curp: fiscal.curp,
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
  };
}

export function fiscalIdentityFromBasicData(data: BasicData): FiscalIdentity {
  const fiscal = normalizeFiscalIdentity({
    rfc: data.rfc,
    curp: data.curp,
    source: data.rfc || data.curp ? "manual" : "empty",
    confirmed: Boolean(data.rfc && data.curp),
  });
  return fiscal.rfc || fiscal.curp ? fiscal : EMPTY_FISCAL_IDENTITY;
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
  if (!normalized.fechaNacimiento) {
    errors.fechaNacimiento = "Selecciona tu fecha de nacimiento.";
  } else {
    const birthDate = new Date(`${normalized.fechaNacimiento}T00:00:00`);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (Number.isNaN(birthDate.getTime())) {
      errors.fechaNacimiento = "Selecciona una fecha de nacimiento válida.";
    } else if (birthDate >= todayStart) {
      errors.fechaNacimiento = "La fecha de nacimiento debe ser anterior a hoy.";
    } else {
      const adultDate = new Date(todayStart.getFullYear() - 18, todayStart.getMonth(), todayStart.getDate());
      if (birthDate > adultDate) {
        errors.fechaNacimiento = "Debes tener al menos 18 años para solicitar una línea de crédito.";
      }
    }
  }
  if (!normalized.genero) errors.genero = "Selecciona una opción.";
  if (normalized.telefono && normalized.telefono.length !== 10) {
    errors.telefono = "Ingresa un celular válido de 10 dígitos.";
  } else if (!normalized.telefono) {
    errors.telefono = "Ingresa tu celular.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.correo)) {
    errors.correo = normalized.correo ? "Ingresa un correo válido." : "Ingresa tu correo.";
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

export function validateFiscalIdentity(fiscalIdentity: FiscalIdentity): Partial<Record<"rfc" | "curp", string>> {
  const normalized = normalizeFiscalIdentity(fiscalIdentity);
  const errors: Partial<Record<"rfc" | "curp", string>> = {};

  if (!/^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/.test(normalized.rfc)) {
    errors.rfc = "Revisa que el RFC tenga el formato correcto.";
  }
  if (!/^[A-Z][AEIOUX][A-Z]{2}\d{6}[HM][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9]\d$/.test(normalized.curp)) {
    errors.curp = normalized.curp.length === 18
      ? "Revisa que la CURP tenga el formato correcto."
      : "Revisa que la CURP tenga 18 caracteres.";
  }

  return errors;
}

export function isFiscalIdentityComplete(fiscalIdentity: FiscalIdentity): boolean {
  return Object.keys(validateFiscalIdentity(fiscalIdentity)).length === 0;
}

export function validateFiscalIdentityConsistency(
  fiscalIdentity: FiscalIdentity,
  generalData: OnboardingGeneralData,
): Partial<Record<"rfc" | "curp" | "estadoNacimientoId", string>> {
  const fiscal = normalizeFiscalIdentity(fiscalIdentity);
  const general = normalizeGeneralDataInput(generalData);
  const errors: Partial<Record<"rfc" | "curp" | "estadoNacimientoId", string>> = {};
  const expectedDate = general.fechaNacimiento.replace(/-/g, "").slice(2);

  if (expectedDate.length === 6 && fiscal.rfc.length === 13 && fiscal.rfc.slice(4, 10) !== expectedDate) {
    errors.rfc = "El RFC no coincide con la fecha de nacimiento capturada.";
  }
  if (expectedDate.length === 6 && fiscal.curp.length === 18 && fiscal.curp.slice(4, 10) !== expectedDate) {
    errors.curp = "La CURP no coincide con la fecha de nacimiento capturada.";
  }
  const curpGender = fiscal.curp.slice(10, 11);
  const expectedGender = general.genero === "M" ? "H" : general.genero === "F" ? "M" : "";
  if (expectedGender && curpGender && curpGender !== expectedGender) {
    errors.curp = "La CURP no coincide con el género capturado.";
  }

  const expectedStateCode = general.estadoNacimientoId
    ? CURP_STATE_CODE_BY_ID[Number(general.estadoNacimientoId)]
    : undefined;
  const curpStateCode = fiscal.curp.slice(11, 13);
  if (expectedStateCode && curpStateCode && expectedStateCode !== curpStateCode) {
    errors.estadoNacimientoId = "El estado de nacimiento no coincide con la CURP de tu identificación.";
  }

  return errors;
}

export function isFiscalIdentityConsistent(
  fiscalIdentity: FiscalIdentity,
  generalData: OnboardingGeneralData,
): boolean {
  return Object.keys(validateFiscalIdentityConsistency(fiscalIdentity, generalData)).length === 0;
}

function readNestedRecord(source: unknown, path: string[]): unknown {
  return path.reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, source);
}

export function extractFiscalIdentityFromGeneralDataResponse(
  response: unknown,
): Partial<Pick<FiscalIdentity, "rfc" | "curp">> & { etapaActual?: string } {
  const data = response && typeof response === "object" && "data" in response
    ? (response as { data?: unknown }).data
    : response;

  const rfc =
    cleanOptionalIdentityCode(readNestedRecord(data, ["rfc"])) ??
    cleanOptionalIdentityCode(readNestedRecord(data, ["fiscal", "rfc"])) ??
    cleanOptionalIdentityCode(readNestedRecord(data, ["identificacion_fiscal", "rfc"]));
  const curp =
    cleanOptionalIdentityCode(readNestedRecord(data, ["curp"])) ??
    cleanOptionalIdentityCode(readNestedRecord(data, ["fiscal", "curp"])) ??
    cleanOptionalIdentityCode(readNestedRecord(data, ["identificacion_fiscal", "curp"]));
  const etapaActual =
    readNestedRecord(data, ["etapa_actual"]) ??
    readNestedRecord(data, ["etapaActual"]);

  return {
    ...(rfc ? { rfc } : {}),
    ...(curp ? { curp } : {}),
    ...(typeof etapaActual === "string" ? { etapaActual } : {}),
  };
}

export function resolveFiscalIdentityAfterGeneralData(input: {
  response: unknown;
  ocrFiscalIdentity?: Partial<Pick<FiscalIdentity, "rfc" | "curp">>;
  current?: FiscalIdentity;
}): FiscalIdentity {
  const current = input.current ? normalizeFiscalIdentity(input.current) : EMPTY_FISCAL_IDENTITY;
  if (current.source === "manual") return current;

  const backend = extractFiscalIdentityFromGeneralDataResponse(input.response);
  const backendRfc = backend.rfc || "";
  const backendCurp = backend.curp || "";
  if (backendRfc || backendCurp) {
    return normalizeFiscalIdentity({
      rfc: backendRfc || current.rfc,
      curp: backendCurp || current.curp,
      source: "backend",
      confirmed: false,
    });
  }

  const ocrRfc = input.ocrFiscalIdentity?.rfc || "";
  const ocrCurp = input.ocrFiscalIdentity?.curp || "";
  if (ocrRfc || ocrCurp) {
    return normalizeFiscalIdentity({
      rfc: current.rfc || ocrRfc,
      curp: current.curp || ocrCurp,
      source: current.rfc || current.curp ? current.source : "ocr",
      confirmed: false,
    });
  }

  return current.rfc || current.curp ? current : EMPTY_FISCAL_IDENTITY;
}

export function mockFiscalIdentityFromGeneralData(data: OnboardingGeneralData): Partial<Pick<FiscalIdentity, "rfc" | "curp">> {
  const normalized = normalizeGeneralDataInput(data);
  if (!normalized.primerNombre || !normalized.apellidoPaterno || !normalized.fechaNacimiento || !normalized.genero) {
    return {};
  }
  const date = normalized.fechaNacimiento.replace(/-/g, "").slice(2);
  const first = normalized.primerNombre[0] ?? "X";
  const paternal = normalized.apellidoPaterno.slice(0, 2).padEnd(2, "X");
  const maternal = normalized.apellidoMaterno[0] ?? "X";
  const base = `${paternal}${maternal}${first}${date}`.toUpperCase().replace(/Ñ/g, "X");
  const gender = normalized.genero === "F" ? "M" : "H";

  return {
    rfc: `${base}XXX`.slice(0, 13),
    curp: `${base}${gender}PLXXXA00`.slice(0, 18),
  };
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
