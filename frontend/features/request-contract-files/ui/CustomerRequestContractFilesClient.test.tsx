import { useEffect, useRef, useState } from "react";
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
  const renders = useRef(0);
  renders.current += 1;
  if (renders.current > 20) {
    throw new Error("Maximum update depth exceeded");
  }

  useEffect(() => {
    setBundles([bundle("dogovor.pdf")]);
  }, []);

  return (
    <CustomerRequestContractFilesClient
      requestId="request-1"
      bundles={bundles}
      onBundlesChange={(next) =>
        setBundles(
          next.map((item) => ({ ...item, document: { ...item.document } })),
        )
      }
    />
  );
}

describe("CustomerRequestContractFilesClient", () => {
  it("показывает договоры с родителя и не зацикливает обновление состояния", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(<ParentThatReplacesBundles />);

    expect(screen.getByText("dogovor.pdf")).toBeInTheDocument();
    expect(
      consoleError.mock.calls.some((call) =>
        String(call[0]).includes("Maximum update depth"),
      ),
    ).toBe(false);

    consoleError.mockRestore();
  });

  it("одобряет договор без подписи и передаёт родителю обновлённый список", async () => {
    const pending = bundle("dogovor.pdf");
    const approved = { ...pending, status: "APPROVED" as const };
    const onBundlesChange = vi.fn();

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "POST")
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        return new Response(JSON.stringify([approved]), { status: 200 });
      }),
    );

    render(
      <CustomerRequestContractFilesClient
        requestId="request-1"
        bundles={[pending]}
        onBundlesChange={onBundlesChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Одобрить" }));

    await waitFor(() => {
      expect(onBundlesChange).toHaveBeenCalledWith([approved]);
    });

    vi.unstubAllGlobals();
  });

  it("сохраняет клиентские ссылки и отправляет замечания к выбранному договору", async () => {
    const pending = bundle("Договор.pdf");
    pending.signature = {
      ...pending.document,
      id: "signature-1",
      originalName: "Договор.sig",
    };
    const revised = {
      ...pending,
      status: "REVISION_REQUESTED" as const,
      revisionMessage: "Уточните сроки",
    };
    const onBundlesChange = vi.fn();
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) =>
        new Response(
          JSON.stringify(init?.method === "POST" ? { ok: true } : [revised]),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    try {
      render(
        <CustomerRequestContractFilesClient
          requestId="request-1"
          bundles={[pending]}
          onBundlesChange={onBundlesChange}
        />,
      );
      expect(
        screen.getByRole("link", { name: "Скачать Договор.pdf" }),
      ).toHaveAttribute(
        "href",
        "/api/requests/request-1/contract-files/doc-1/download",
      );
      expect(
        screen.getByRole("link", { name: "Скачать подпись" }),
      ).toHaveAttribute(
        "href",
        "/api/requests/request-1/contract-files/signature-1/download",
      );
      fireEvent.click(screen.getByRole("button", { name: "На доработку" }));
      fireEvent.change(screen.getByRole("textbox", { name: "Комментарий" }), {
        target: { value: "Уточните сроки" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Отправить" }));

      await waitFor(() =>
        expect(onBundlesChange).toHaveBeenCalledWith([revised]),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/requests/request-1/contract-bundles/bundle-1/revision",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: "Уточните сроки" }),
        },
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
