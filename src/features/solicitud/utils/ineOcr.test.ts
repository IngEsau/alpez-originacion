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
