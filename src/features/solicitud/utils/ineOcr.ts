import type { FiscalIdentity, OnboardingGeneralData } from "../types/solicitud.types";
import { EMPTY_ONBOARDING_GENERAL_DATA, normalizeGeneralDataInput, normalizeFiscalIdentity, toTitleCase } from "./generalData";

export { toTitleCase } from "./generalData";

const KEY_ALIASES = {
  fullName: ["nombrecompleto", "nombre_completo", "fullname", "nombre"],
  firstName: ["primernombre", "primer_nombre", "nombres", "nombrepropio", "nombre_propio"],
  middleName: ["segundonombre", "segundo_nombre"],
  paternalLastName: ["apellidopaterno", "apellido_paterno", "primerapellido", "primer_apellido"],
  maternalLastName: ["apellidomaterno", "apellido_materno", "segundoapellido", "segundo_apellido"],
  curp: ["curp"],
  rfc: ["rfc"],
  birthDate: ["fechanacimiento", "fecha_nacimiento", "birthdate", "fecha_de_nacimiento"],
  gender: ["sexo", "genero", "género", "gender"],
  address: ["direccion", "domicilio", "calle"],
  zipCode: ["codigopostal", "codigo_postal", "cp"],
  state: ["estado", "entidad", "entidadfederativa", "entidad_federativa"],
  municipality: ["municipio", "delegacion", "alcaldia"],
  neighborhood: ["colonia", "asentamiento"],
} as const;

function normalizeKey(key: string): string {
  return key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toLowerCase();
}

function cleanText(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text || undefined;
}

function findValueByAliases(source: unknown, aliases: readonly string[]): string | undefined {
  const normalizedAliases = new Set(aliases.map(normalizeKey));
  const visited = new Set<unknown>();

  function walk(value: unknown): string | undefined {
    if (!value || typeof value !== "object" || visited.has(value)) return undefined;
    visited.add(value);

    for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
      if (normalizedAliases.has(normalizeKey(key))) {
        const direct = cleanText(entryValue);
        if (direct) return direct;
      }
    }

    for (const entryValue of Object.values(value as Record<string, unknown>)) {
      const nested = walk(entryValue);
      if (nested) return nested;
    }

    return undefined;
  }

  return walk(source);
}

function cleanIdentityCode(value: string | undefined): string | undefined {
  return value?.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function normalizeGender(value: string | undefined): "M" | "F" | "O" | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return undefined;
  if (["h", "hombre", "m", "masculino"].includes(normalized)) return "M";
  if (["mujer", "f", "femenino"].includes(normalized)) return "F";
  return "O";
}

export function mapIneOcrToGeneralData(ocr: unknown): Partial<OnboardingGeneralData> {
  const firstName = cleanText(findValueByAliases(ocr, KEY_ALIASES.firstName));
  const middleName = cleanText(findValueByAliases(ocr, KEY_ALIASES.middleName));
  const paternalLastName = cleanText(findValueByAliases(ocr, KEY_ALIASES.paternalLastName));
  const maternalLastName = cleanText(findValueByAliases(ocr, KEY_ALIASES.maternalLastName));
  const explicitFullName = cleanText(findValueByAliases(ocr, KEY_ALIASES.fullName));
  const composedName = [firstName, middleName, paternalLastName, maternalLastName].filter(Boolean).join(" ");
  const fullName = explicitFullName ?? composedName;
  const result: Partial<OnboardingGeneralData> = {};

  if (firstName) result.primerNombre = toTitleCase(firstName);
  if (middleName) result.segundoNombre = toTitleCase(middleName);
  if (paternalLastName) result.apellidoPaterno = toTitleCase(paternalLastName);
  if (maternalLastName) result.apellidoMaterno = toTitleCase(maternalLastName);
  if (fullName && !firstName && !paternalLastName) {
    const parts = toTitleCase(fullName).split(/\s+/).filter(Boolean);
    result.primerNombre = parts[0] ?? "";
    result.segundoNombre = parts.length > 3 ? parts.slice(1, -2).join(" ") : "";
    result.apellidoPaterno = parts.length >= 2 ? parts[parts.length - 2] : "";
    result.apellidoMaterno = parts.length >= 3 ? parts[parts.length - 1] : "";
  }

  const curp = cleanIdentityCode(findValueByAliases(ocr, KEY_ALIASES.curp));
  const rfc = cleanIdentityCode(findValueByAliases(ocr, KEY_ALIASES.rfc));
  const birthDate = cleanText(findValueByAliases(ocr, KEY_ALIASES.birthDate));
  const gender = normalizeGender(cleanText(findValueByAliases(ocr, KEY_ALIASES.gender)));
  const address = cleanText(findValueByAliases(ocr, KEY_ALIASES.address));
  const zipCode = findValueByAliases(ocr, KEY_ALIASES.zipCode)?.replace(/\D/g, "").slice(0, 5);
  const state = cleanText(findValueByAliases(ocr, KEY_ALIASES.state));
  const municipality = cleanText(findValueByAliases(ocr, KEY_ALIASES.municipality));
  const neighborhood = cleanText(findValueByAliases(ocr, KEY_ALIASES.neighborhood));

  if (birthDate) result.fechaNacimiento = birthDate;
  if (gender) result.genero = gender;
  if (address) result.direccion = toTitleCase(address);
  if (zipCode) result.codigoPostal = zipCode;
  if (state) result.estadoNombre = toTitleCase(state);
  if (municipality) result.municipioNombre = toTitleCase(municipality);
  if (neighborhood) result.coloniaNombre = toTitleCase(neighborhood);

  return result;
}

export function extractFiscalIdentityFromOcr(ocr: unknown): Partial<Pick<FiscalIdentity, "rfc" | "curp">> {
  const curp = cleanIdentityCode(findValueByAliases(ocr, KEY_ALIASES.curp));
  const rfc = cleanIdentityCode(findValueByAliases(ocr, KEY_ALIASES.rfc));

  return {
    ...(rfc ? { rfc } : {}),
    ...(curp ? { curp } : {}),
  };
}

export function applyIneOcrToGeneralData(
  generalData: OnboardingGeneralData | undefined,
  ocr: unknown,
): { generalData: OnboardingGeneralData; prefilledFields: Array<keyof OnboardingGeneralData> } {
  const mapped = mapIneOcrToGeneralData(ocr);
  const nextData = { ...EMPTY_ONBOARDING_GENERAL_DATA, ...generalData };
  const prefilledFields: Array<keyof OnboardingGeneralData> = [];

  for (const [field, value] of Object.entries(mapped) as Array<[keyof OnboardingGeneralData, string | number | null]>) {
    const currentValue = nextData[field];
    if (value !== undefined && value !== null && String(value).trim() && !String(currentValue ?? "").trim()) {
      (nextData[field] as string | number | null) = value;
      prefilledFields.push(field);
    }
  }

  return { generalData: normalizeGeneralDataInput(nextData), prefilledFields };
}

export function fiscalIdentityFromOcr(ocr: unknown): FiscalIdentity {
  const fiscal = normalizeFiscalIdentity({
    rfc: extractFiscalIdentityFromOcr(ocr).rfc ?? "",
    curp: extractFiscalIdentityFromOcr(ocr).curp ?? "",
    source: "ocr",
    confirmed: false,
  });
  return fiscal.rfc || fiscal.curp ? fiscal : { rfc: "", curp: "", source: "empty", confirmed: false };
}
