import { afterEach, describe, expect, it, vi } from "vitest";
import { fileToBase64 } from "./fileToBase64";

describe("fileToBase64", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a data URL from FileReader", async () => {
    class FakeFileReader {
      result: string | ArrayBuffer | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      readAsDataURL() {
        this.result = "data:text/plain;base64,SG9sYQ==";
        this.onload?.();
      }
    }

    vi.stubGlobal("FileReader", FakeFileReader);

    await expect(fileToBase64(new File(["Hola"], "hola.txt", { type: "text/plain" }))).resolves.toBe(
      "data:text/plain;base64,SG9sYQ==",
    );
  });

  it("rejects when FileReader fails", async () => {
    class FailingFileReader {
      result: string | ArrayBuffer | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      readAsDataURL() {
        this.onerror?.();
      }
    }

    vi.stubGlobal("FileReader", FailingFileReader);

    await expect(fileToBase64(new File(["error"], "error.txt"))).rejects.toThrow("No pudimos leer el archivo.");
  });
});
