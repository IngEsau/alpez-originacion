import { describe, expect, it } from "vitest";
import {
  EMPTY_ONBOARDING_GENERAL_DATA,
  mapAddressCatalog,
  mapGeneralDataToBackendPayload,
  mapStatesCatalog,
  normalizeGeneralDataInput,
  validateGeneralData,
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
  rfc: "gage950615gt1",
  curp: "gage950615hplnyr01",
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
      rfc: "GAGE950615GT1",
      curp: "GAGE950615HPLNYR01",
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
  it("validates phone, rfc and curp with demo-friendly rules", () => {
    const errors = validateGeneralData({
      ...completeGeneralData,
      telefono: "221",
      rfc: "ABC",
      curp: "CURP",
    });

    expect(errors.telefono).toBe("Ingresa un celular válido de 10 dígitos.");
    expect(errors.rfc).toBe("Revisa que el RFC tenga el formato correcto.");
    expect(errors.curp).toBe("Revisa que la CURP tenga 18 caracteres.");
  });

  it("normalizes phone, rfc, curp and email", () => {
    const normalized = normalizeGeneralDataInput(completeGeneralData);

    expect(normalized.telefono).toBe("2211244333");
    expect(normalized.correo).toBe("erickgaytan53@gmail.com");
    expect(normalized.rfc).toBe("GAGE950615GT1");
    expect(normalized.curp).toBe("GAGE950615HPLNYR01");
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
