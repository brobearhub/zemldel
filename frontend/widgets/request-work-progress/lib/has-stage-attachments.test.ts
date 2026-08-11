import { describe, expect, it } from "vitest";
import { hasStageAttachments, hasStageExpandableContent } from "./has-stage-attachments";

describe("hasStageAttachments", () => {
  it("returns false when both lists are empty", () => {
    expect(hasStageAttachments({ files: [], docSlots: [] })).toBe(false);
  });

  it("returns true when there is at least one file", () => {
    expect(hasStageAttachments({ files: [{}], docSlots: [] })).toBe(true);
  });

  it("returns true when there is at least one doc slot", () => {
    expect(hasStageAttachments({ files: [], docSlots: [{}] })).toBe(true);
  });

  it("returns true when both lists have items", () => {
    expect(hasStageAttachments({ files: [{}], docSlots: [{}] })).toBe(true);
  });
});

describe("hasStageExpandableContent", () => {
  it("returns false when description, files and docSlots are empty", () => {
    expect(hasStageExpandableContent({ description: "  ", files: [], docSlots: [] })).toBe(false);
  });

  it("returns true when description is present", () => {
    expect(hasStageExpandableContent({ description: "Текст", files: [], docSlots: [] })).toBe(true);
  });

  it("returns true when attachments are present", () => {
    expect(hasStageExpandableContent({ description: "", files: [], docSlots: [{}] })).toBe(true);
  });
});
