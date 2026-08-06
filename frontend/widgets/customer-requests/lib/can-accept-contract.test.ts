import { describe, expect, it } from "vitest";
import { canCustomerAcceptContract } from "./can-accept-contract";

const approvedFullBundle = {
  bundleId: "b1",
  status: "APPROVED" as const,
  revisionMessage: null,
  decidedAt: null,
  document: {
    id: "d1",
    originalName: "a.pdf",
    mimeType: "application/pdf",
    sizeBytes: 10,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  signature: {
    id: "s1",
    originalName: "a.sig",
    mimeType: "application/octet-stream",
    sizeBytes: 10,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("canCustomerAcceptContract", () => {
  it("requires approved full bundle", () => {
    expect(
      canCustomerAcceptContract({
        requestStatus: "DISCUSSING",
        lockedAt: "2026-08-06T00:00:00.000Z",
        contractBundles: [
          {
            ...approvedFullBundle,
            status: "PENDING_CUSTOMER",
          },
        ],
        documentRequests: [],
      })
    ).toBe(false);
  });

  it("requires signature attached", () => {
    expect(
      canCustomerAcceptContract({
        requestStatus: "DISCUSSING",
        lockedAt: "2026-08-06T00:00:00.000Z",
        contractBundles: [
          {
            ...approvedFullBundle,
            signature: null,
          },
        ],
        documentRequests: [],
      })
    ).toBe(false);
  });

  it("requires all requested documents uploaded", () => {
    expect(
      canCustomerAcceptContract({
        requestStatus: "DISCUSSING",
        lockedAt: "2026-08-06T00:00:00.000Z",
        contractBundles: [approvedFullBundle],
        documentRequests: [
          {
            id: "d1",
            title: "Паспорт",
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

  it("allows accept when approved full bundle exists and all documents uploaded", () => {
    expect(
      canCustomerAcceptContract({
        requestStatus: "DISCUSSING",
        lockedAt: "2026-08-06T00:00:00.000Z",
        contractBundles: [approvedFullBundle],
        documentRequests: [
          {
            id: "d1",
            title: "Паспорт",
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

  it("blocks accept while any contract bundle is still pending", () => {
    expect(
      canCustomerAcceptContract({
        requestStatus: "DISCUSSING",
        lockedAt: "2026-08-06T00:00:00.000Z",
        contractBundles: [
          approvedFullBundle,
          {
            ...approvedFullBundle,
            bundleId: "b2",
            status: "PENDING_CUSTOMER",
            document: { ...approvedFullBundle.document, id: "d2" },
            signature: approvedFullBundle.signature
              ? { ...approvedFullBundle.signature, id: "s2" }
              : null,
          },
        ],
        documentRequests: [],
      })
    ).toBe(false);
  });
});
