import { describe, expect, it } from "vitest";
import { canCustomerAcceptContract } from "./can-accept-contract";

describe("canCustomerAcceptContract", () => {
  it("requires approved contract file", () => {
    expect(
      canCustomerAcceptContract({
        requestStatus: "PROVIDER_SELECTED",
        contractFiles: [
          {
            id: "f1",
            status: "PENDING_CUSTOMER",
            originalName: "a.pdf",
            mimeType: "application/pdf",
            sizeBytes: 10,
            revisionMessage: null,
            decidedAt: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        documentRequests: [],
      })
    ).toBe(false);
  });

  it("requires all requested documents uploaded", () => {
    expect(
      canCustomerAcceptContract({
        requestStatus: "PROVIDER_SELECTED",
        contractFiles: [
          {
            id: "f1",
            status: "APPROVED",
            originalName: "a.pdf",
            mimeType: "application/pdf",
            sizeBytes: 10,
            revisionMessage: null,
            decidedAt: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        documentRequests: [
          {
            id: "d1",
            title: "Паспорт",
            sortOrder: 1,
            status: "REQUESTED",
            originalName: null,
            mimeType: null,
            sizeBytes: null,
            sha256: null,
            uploadedAt: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      })
    ).toBe(false);
  });

  it("allows accept when approved file exists and all documents uploaded", () => {
    expect(
      canCustomerAcceptContract({
        requestStatus: "PROVIDER_SELECTED",
        contractFiles: [
          {
            id: "f1",
            status: "APPROVED",
            originalName: "a.pdf",
            mimeType: "application/pdf",
            sizeBytes: 10,
            revisionMessage: null,
            decidedAt: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        documentRequests: [
          {
            id: "d1",
            title: "Паспорт",
            sortOrder: 1,
            status: "UPLOADED",
            originalName: "pass.pdf",
            mimeType: "application/pdf",
            sizeBytes: 10,
            sha256: "x",
            uploadedAt: "2026-01-01T00:00:00.000Z",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      })
    ).toBe(true);
  });
});

