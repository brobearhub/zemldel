import { describe, expect, it } from "vitest";
import {
  cadastralCaretFromDigitCount,
  cadastralNspdMapUrl,
  cadastralPartsFromInput,
  formatCadastralInput,
  formatCadastralParts,
} from "./cadastral-number";

describe("formatCadastralInput", () => {
  it("inserts colons after 2, 2 and 7 digits", () => {
    expect(formatCadastralInput("66")).toBe("66");
    expect(formatCadastralInput("6641")).toBe("66:41");
    expect(formatCadastralInput("66410204016")).toBe("66:41:0204016");
    expect(formatCadastralInput("6641020401612")).toBe("66:41:0204016:12");
  });

  it("keeps a pasted number and drops extra characters", () => {
    expect(formatCadastralInput("66:41:0204016:12")).toBe("66:41:0204016:12");
    expect(formatCadastralInput("66-41 abc")).toBe("66:41");
  });

  it("caps the last block at 10 digits", () => {
    expect(formatCadastralInput("664102040161234567890999")).toBe("66:41:0204016:1234567890");
  });
});

describe("cadastralPartsFromInput", () => {
  it("maps a partial mask onto four blocks", () => {
    expect(cadastralPartsFromInput("66:41")).toEqual(["66", "41", "", ""]);
    expect(cadastralPartsFromInput("")).toEqual(["", "", "", ""]);
  });
});

describe("formatCadastralParts", () => {
  it("hides empty trailing blocks", () => {
    expect(formatCadastralParts(["66", "41", "", ""])).toBe("66:41");
    expect(formatCadastralParts(["", "", "", ""])).toBe("");
    expect(formatCadastralParts(["66", "41", "0204016", "12"])).toBe("66:41:0204016:12");
  });
});

describe("cadastralNspdMapUrl", () => {
  it("builds an NSPD map link with the encoded cadastral number", () => {
    expect(cadastralNspdMapUrl("66:41:0110176:18")).toBe(
      "https://nspd.gov.ru/map?thematic=PKK&query=66%3A41%3A0110176%3A18&theme_id=1&is_copy_url=true",
    );
  });
});

describe("cadastralCaretFromDigitCount", () => {
  it("skips colons when restoring the caret", () => {
    expect(cadastralCaretFromDigitCount("66:41", 2)).toBe(2);
    expect(cadastralCaretFromDigitCount("66:41", 4)).toBe(5);
    expect(cadastralCaretFromDigitCount("66:41:0204016:12", 0)).toBe(0);
  });
});
