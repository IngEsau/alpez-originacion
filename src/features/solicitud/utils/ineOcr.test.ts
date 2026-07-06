import { describe, expect, it } from "vitest";
import { EMPTY_ONBOARDING_GENERAL_DATA } from "./generalData";
import { applyIneOcrToGeneralData, extractFiscalIdentityFromOcr, mapIneOcrToGeneralData, toTitleCase } from "./ineOcr";

describe("mapIneOcrToGeneralData", () => {
  it("maps nested OCR fields into safe public data", () => {
    const result = mapIneOcrToGeneralData({
      data: {
        ine: {
          nombres: "JUAN CARLOS",
          apellidoPaterno: "PEREZ",
          apellidoMaterno: "LOPEZ",
          curp: "pelj900101hplrpn09",
          rfc: "pelj900101abc",
        },
      },
    });

    expect(result).toMatchObject({
      primerNombre: "Juan Carlos",
      apellidoPaterno: "Perez",
      apellidoMaterno: "Lopez",
    });
    expect(extractFiscalIdentityFromOcr(result)).toEqual({});
  });

  it("returns empty data when OCR is unavailable", () => {
    expect(mapIneOcrToGeneralData(null)).toEqual({});
  });

  it("maps real INE OCR response fields into general data", () => {
    const result = mapIneOcrToGeneralData({
      ocr: {
        calle: "C 5 DE MAYO 16",
        colonia: "PBLO SANTIAGO MOMOXPAN 72760",
        curp: "PETL551201MPLTPL00",
        estado: "21",
        fechaNacimiento: "01/12/1955",
        municipio: "141",
        nombres: "MARIA LILIA MARGARITA",
        primerApellido: "PETLACALCO",
        segundoApellido: "TEPOZ",
        sexo: "M",
      },
    });

    expect(result).toMatchObject({
      primerNombre: "Maria Lilia Margarita",
      apellidoPaterno: "Petlacalco",
      apellidoMaterno: "Tepoz",
      fechaNacimiento: "1955-12-01",
      genero: "F",
      direccion: "C 5 De Mayo 16",
      codigoPostal: "72760",
      estadoNacimientoId: 21,
      estadoId: "21",
      municipioId: "141",
      coloniaNombre: "Pblo Santiago Momoxpan 72760",
    });
  });
});

describe("applyIneOcrToGeneralData", () => {
  it("prefills only empty fields and keeps phone and email empty", () => {
    const result = applyIneOcrToGeneralData(EMPTY_ONBOARDING_GENERAL_DATA, {
      nombreCompleto: "ANA MARIA RUIZ",
      curp: "RURA900101MPLZSN01",
      rfc: "RURA900101AA1",
      telefono: "2221112233",
      correo: "ana@example.com",
    });

    expect(result.generalData.primerNombre).toBe("Ana");
    expect(result.generalData.apellidoPaterno).toBe("Maria");
    expect(result.generalData.apellidoMaterno).toBe("Ruiz");
    expect(result.generalData.telefono).toBe("");
    expect(result.generalData.correo).toBe("");
    expect(result.prefilledFields).toEqual(["primerNombre", "apellidoPaterno", "apellidoMaterno"]);
  });

  it("does not overwrite user-entered values", () => {
    const result = applyIneOcrToGeneralData(
      { ...EMPTY_ONBOARDING_GENERAL_DATA, primerNombre: "Nombre", apellidoPaterno: "Manual" },
      { nombreCompleto: "OTRO NOMBRE", rfc: "OTRO123", curp: "CURP123" },
    );

    expect(result.generalData.primerNombre).toBe("Nombre");
    expect(result.generalData.apellidoPaterno).toBe("Manual");
  });

  it("replaces fields that were previously prefilled from another INE", () => {
    const result = applyIneOcrToGeneralData(
      {
        ...EMPTY_ONBOARDING_GENERAL_DATA,
        primerNombre: "Daniel Esau",
        apellidoPaterno: "Negrete",
        apellidoMaterno: "Aguilar",
      },
      {
        nombres: "MARIA LILIA MARGARITA",
        primerApellido: "PETLACALCO",
        segundoApellido: "TEPOZ",
      },
      { replaceFields: ["primerNombre", "apellidoPaterno", "apellidoMaterno"] },
    );

    expect(result.generalData.primerNombre).toBe("Maria Lilia Margarita");
    expect(result.generalData.apellidoPaterno).toBe("Petlacalco");
    expect(result.generalData.apellidoMaterno).toBe("Tepoz");
  });
});

describe("extractFiscalIdentityFromOcr", () => {
  it("extracts fiscal identity separately from general data", () => {
    expect(
      extractFiscalIdentityFromOcr({
        fiscal: {
          rfc: "gage950615gt1",
          curp: "gage950615hplnyr01",
        },
      }),
    ).toEqual({ rfc: "GAGE950615GT1", curp: "GAGE950615HPLNYR01" });
  });
});

describe("toTitleCase", () => {
  it("normalizes uppercase names", () => {
    expect(toTitleCase("MARIA DEL CARMEN")).toBe("Maria Del Carmen");
  });
});
