import { useEffect, useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  CustomerRequestContractFilesClient,
  type CustomerContractBundleListItem,
} from "./CustomerRequestContractFilesClient";

function bundle(name: string): CustomerContractBundleListItem {
  return {
    bundleId: "bundle-1",
    status: "PENDING_CUSTOMER",
    revisionMessage: null,
    decidedAt: null,
    document: {
      id: "doc-1",
      originalName: name,
      mimeType: "application/pdf",
      sizeBytes: 10,
      createdAt: "2026-10-06T00:00:00.000Z",
      updatedAt: "2026-10-06T00:00:00.000Z",
    },
    signature: null,
    createdAt: "2026-10-06T00:00:00.000Z",
    updatedAt: "2026-10-06T00:00:00.000Z",
  };
}

function ParentThatReplacesBundles() {
  const [bundles, setBundles] = useState<CustomerContractBundleListItem[]>([]);
  const renders = useState({ n: 0 })[0];
  renders.n += 1;
  if (renders.n > 20) {
    throw new Error("Maximum update depth exceeded");
  }

  useEffect(() => {
    setBundles([bundle("dogovor.pdf")]);
  }, []);

  return (
    <CustomerRequestContractFilesClient
      requestId="request-1"
      bundles={bundles}
      onBundlesChange={(next) => setBundles(next.map((item) => ({ ...item, document: { ...item.document } })))}
    />
  );
}

describe("CustomerRequestContractFilesClient", () => {
  it("показывает договоры с родителя и не зацикливает обновление состояния", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<ParentThatReplacesBundles />);

    expect(screen.getByText("dogovor.pdf")).toBeInTheDocument();
    expect(consoleError.mock.calls.some((call) => String(call[0]).includes("Maximum update depth"))).toBe(false);

    consoleError.mockRestore();
  });

  it("передаёт родителю список после одобрения договора", async () => {
    const pending = bundle("dogovor.pdf");
    pending.signature = {
      id: "sig-1",
      originalName: "dogovor.sig",
      mimeType: "application/pgp-signature",
      sizeBytes: 4,
      createdAt: "2026-10-06T00:00:00.000Z",
      updatedAt: "2026-10-06T00:00:00.000Z",
    };
    const approved = { ...pending, status: "APPROVED" as const };
    const onBundlesChange = vi.fn();

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "POST") return new Response(JSON.stringify({ ok: true }), { status: 200 });
        return new Response(JSON.stringify([approved]), { status: 200 });
      }),
    );

    render(
      <CustomerRequestContractFilesClient requestId="request-1" bundles={[pending]} onBundlesChange={onBundlesChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Одобрить" }));

    await waitFor(() => {
      expect(onBundlesChange).toHaveBeenCalledWith([approved]);
    });

    vi.unstubAllGlobals();
  });
});
