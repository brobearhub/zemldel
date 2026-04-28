import { describe, expect, it } from "vitest";
import { normalizeContractEditorContent } from "./ContractRichEditor";

describe("normalizeContractEditorContent", () => {
  it("keeps tiptap document content intact", () => {
    const document = { type: "doc", content: [{ type: "paragraph" }] };

    expect(normalizeContractEditorContent({ format: "tiptap", version: 1, document })).toEqual({
      format: "tiptap",
      version: 1,
      document,
    });
  });

  it("converts legacy markdown content to editable document JSON", () => {
    const result = normalizeContractEditorContent({ format: "markdown", markdown: "# Договор\n\nТекст" });

    expect(result.format).toBe("tiptap");
    expect(result.document.content?.[0]?.type).toBe("heading");
    expect(result.document.content?.[1]?.type).toBe("paragraph");
  });
});
