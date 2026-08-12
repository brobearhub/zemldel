import { describe, expect, it } from "vitest";
import { getClientStageActions, hasClientStageActions } from "./client-stage-actions";

describe("getClientStageActions", () => {
  it("returns empty when there are no doc slots", () => {
    expect(getClientStageActions({ docSlots: [] })).toEqual([]);
  });

  it("returns empty when all slots are uploaded", () => {
    expect(
      getClientStageActions({
        docSlots: [{ status: "UPLOADED" }, { status: "UPLOADED" }],
      }),
    ).toEqual([]);
  });

  it("returns UPLOAD_REQUIRED_DOCUMENTS when a slot is requested", () => {
    expect(
      getClientStageActions({
        docSlots: [{ status: "UPLOADED" }, { status: "REQUESTED" }],
      }),
    ).toEqual([{ kind: "UPLOAD_REQUIRED_DOCUMENTS" }]);
  });

  it("returns a single action even when several slots are requested", () => {
    expect(
      getClientStageActions({
        docSlots: [{ status: "REQUESTED" }, { status: "REQUESTED" }],
      }),
    ).toEqual([{ kind: "UPLOAD_REQUIRED_DOCUMENTS" }]);
  });
});

describe("hasClientStageActions", () => {
  it("is false without pending actions", () => {
    expect(hasClientStageActions({ docSlots: [{ status: "UPLOADED" }] })).toBe(false);
  });

  it("is true when upload is required", () => {
    expect(hasClientStageActions({ docSlots: [{ status: "REQUESTED" }] })).toBe(true);
  });
});
