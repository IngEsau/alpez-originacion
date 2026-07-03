import { describe, expect, it } from "vitest";
import {
  EMPTY_ONBOARDING_GENERAL_DATA,
  mapAddressCatalog,
  extractFiscalIdentityFromGeneralDataResponse,
  isFiscalIdentityComplete,
  mapGeneralDataToBackendPayload,
  mapStatesCatalog,
  normalizeGeneralDataInput,
  normalizeFiscalIdentity,
  resolveFiscalIdentityAfterGeneralData,
  validateGeneralData,
  validateFiscalIdentity,
} from "./generalData";

const completeGeneralData = {
  ...EMPTY_ONBOARDING_GENERAL_DATA,
  primerNombre: "ERICK",
  segundoNombre: "DANIEL",
  apellidoPaterno: "GAONA",
  apellidoMaterno: "GAYTAN",
  fechaNacimiento: "1995-06-15",
  genero: "M" as const,
  telefono: "(221) 124-4333",
  correo: "ERICKGAYTAN53@GMAIL.COM ",
  estadoNacimientoId: 21,
  direccion: " Articulo primero ",
  numExt: "01",
  numInt: "01",
  codigoPostal: "72595",
  estadoId: "21",
  estadoNombre: "Puebla",
  municipioId: "114",
  municipioNombre: "Puebla",
  coloniaId: "206996",
  coloniaNombre: "Artículo Primero",
};

describe("mapGeneralDataToBackendPayload", () => {
  it("builds the exact backend payload with normalized values", () => {
    expect(mapGeneralDataToBackendPayload(completeGeneralData, "trace-123")).toEqual({
      trace_id: "trace-123",
      primer_nombre: "Erick",
      segundo_nombre: "Daniel",
      apellido_paterno: "Gaona",
      apellido_materno: "Gaytan",
      fecha_nacimiento: "1995-06-15",
      genero: "M",
      telefono: "2211244333",
      correo: "erickgaytan53@gmail.com",
      estado_nacimiento_id: 21,
      direccion: "Articulo primero",
      num_ext: "01",
      num_int: "01",
      colonia_id: "206996",
      estado_id: "21",
      municipio_id: "114",
      codigo_postal: "72595",
    });
  });
});

describe("validateGeneralData", () => {
  it("validates phone without requiring RFC or CURP in general data", () => {
    const errors = validateGeneralData({
      ...completeGeneralData,
      telefono: "221",
    });

    expect(errors.telefono).toBe("Ingresa un celular válido de 10 dígitos.");
    expect("rfc" in errors).toBe(false);
    expect("curp" in errors).toBe(false);
  });

  it("normalizes phone and email", () => {
    const normalized = normalizeGeneralDataInput(completeGeneralData);

    expect(normalized.telefono).toBe("2211244333");
    expect(normalized.correo).toBe("erickgaytan53@gmail.com");
  });
});

describe("fiscal identity", () => {
  it("extracts RFC and CURP from general data response variants", () => {
    expect(
      extractFiscalIdentityFromGeneralDataResponse({
        data: {
          identificacion_fiscal: {
            rfc: "gage950615gt1",
            curp: "gage950615hplnyr01",
          },
        },
      }),
    ).toEqual({ rfc: "GAGE950615GT1", curp: "GAGE950615HPLNYR01" });
  });

  it("uses backend identity before OCR", () => {
    const result = resolveFiscalIdentityAfterGeneralData({
      response: { data: { rfc: "BACK950615GT1", curp: "BACK950615HPLNYR01" } },
      ocrFiscalIdentity: { rfc: "OCR950615GT1", curp: "OCR950615HPLNYR01" },
    });

    expect(result).toMatchObject({
      rfc: "BACK950615GT1",
      curp: "BACK950615HPLNYR01",
      source: "backend",
      confirmed: false,
    });
  });

  it("does not overwrite manual identity", () => {
    const result = resolveFiscalIdentityAfterGeneralData({
      response: { data: { rfc: "BACK950615GT1", curp: "BACK950615HPLNYR01" } },
      current: { rfc: "MANUAL1234567", curp: "MANUAL123456789012", source: "manual", confirmed: false },
    });

    expect(result.rfc).toBe("MANUAL1234567");
    expect(result.source).toBe("manual");
  });

  it("validates and normalizes fiscal identity", () => {
    const normalized = normalizeFiscalIdentity({
      rfc: "gage950615gt1",
      curp: "gage950615hplnyr01",
      source: "manual",
      confirmed: false,
    });

    expect(normalized.rfc).toBe("GAGE950615GT1");
    expect(normalized.curp).toBe("GAGE950615HPLNYR01");
    expect(isFiscalIdentityComplete(normalized)).toBe(true);
    expect(validateFiscalIdentity({ ...normalized, rfc: "ABC", curp: "CURP" })).toEqual({
      rfc: "Revisa que el RFC tenga el formato correcto.",
      curp: "Revisa que la CURP tenga 18 caracteres.",
    });
  });
});

describe("catalog mappers", () => {
  it("maps states from backend catalog variants", () => {
    expect(mapStatesCatalog({ estados: [{ id: 21, nombre: "Puebla" }] })).toEqual([{ id: "21", name: "Puebla" }]);
  });

  it("maps zip code lookup response into address options", () => {
    expect(
      mapAddressCatalog({
        codigo_postal: "72595",
        estado: "Puebla",
        estado_id: "21",
        municipio: "Puebla",
        municipio_id: "114",
        colonias: [{ id: "206996", nombre: "Artículo Primero" }],
      }),
    ).toEqual({
      codigoPostal: "72595",
      estadoId: "21",
      estadoNombre: "Puebla",
      municipioId: "114",
      municipioNombre: "Puebla",
      colonias: [{ id: "206996", name: "Artículo Primero" }],
    });
  });
});
