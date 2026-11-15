import type { ComponentProps } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  RequestCustomerDto,
  RequestDocumentRequestDto,
} from "@/entities/request";
import { CustomerRequestDocumentsSection } from "./CustomerRequestDocumentsSection";

type Props = ComponentProps<typeof CustomerRequestDocumentsSection>;
const timestamp = "2026-11-15T00:00:00.000Z";
const requested: RequestDocumentRequestDto = {
  id: "requested",
  title: "Выписка из ЕГРН",
  status: "REQUESTED",
  originalName: null,
  mimeType: null,
  sizeBytes: null,
  sha256: null,
  uploadedAt: null,
  createdAt: timestamp,
  updatedAt: timestamp,
};
const uploaded: RequestDocumentRequestDto = {
  ...requested,
  id: "uploaded",
  status: "UPLOADED",
  originalName: "Выписка.pdf",
  mimeType: "application/pdf",
};

function createProps(overrides: Partial<Props> = {}): Props {
  return {
    open: true,
    request: { id: "request-1", status: "TERMS_AGREED" } as RequestCustomerDto,
    busy: false,
    docUploadBusy: false,
    contractBundles: [],
    docRequests: [],
    providerFiles: [],
    providerFilesError: null,
    onRetryProviderFiles: vi.fn(),
    allRequestedDocumentsUploaded: true,
    hasRevisionRequested: false,
    hasPending: false,
    hasContractBundles: false,
    canAcceptContract: false,
    onDeleteRequestedDocument: vi.fn(),
    onUploadRequestedDocument: vi.fn(),
    onOpenOfferDialog: vi.fn(),
    onContractBundlesChange: vi.fn(),
    ...overrides,
  };
}

describe("CustomerRequestDocumentsSection", () => {
  it("allows the customer to select a photo for a requested document", () => {
    const props = createProps({ docRequests: [requested] });
    render(<CustomerRequestDocumentsSection {...props} />);
    const input = screen.getByLabelText("Загрузить Выписка из ЕГРН");
    expect(input).toHaveAttribute("accept", expect.stringContaining("image/*"));
    expect(input).toHaveAttribute("accept", expect.stringContaining(".heif"));
    const photo = new File(["photo"], "Участок.heic", { type: "image/heic" });
    fireEvent.change(input, { target: { files: [photo] } });
    expect(props.onUploadRequestedDocument).toHaveBeenCalledWith(
      "requested",
      photo,
    );
  });
  it("shows additional provider files for downloading without customer modification actions", () => {
    render(
      <CustomerRequestDocumentsSection
        {...createProps({
          docRequests: [requested],
          providerFiles: [
            {
              id: "provider-file",
              originalName: "Дополнительный документ.docx",
              mimeType:
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              sizeBytes: 100,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
          ],
        })}
      />,
    );
    const section = within(
      screen.getByRole("region", { name: "Документы исполнителя" }),
    );
    expect(
      section.getByRole("link", {
        name: "Скачать Дополнительный документ.docx",
      }),
    ).toHaveAttribute(
      "href",
      "/api/requests/request-1/contract-files/provider-file/download",
    );
    expect(section.queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.getByLabelText("Загрузить Выписка из ЕГРН"),
    ).toBeInTheDocument();
  });

  it("explains empty customer sections without provider-only actions", () => {
    render(<CustomerRequestDocumentsSection {...createProps()} />);

    expect(
      screen.getByRole("region", { name: "Договор с исполнителем" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Мои документы" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Договор ещё не загружен")).toBeInTheDocument();
    expect(
      screen.getByText(/Исполнитель пока не запросил документы/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Загрузить договор" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Запросить документ/ }),
    ).not.toBeInTheDocument();
  });

  it("keeps customer download, upload and deletion actions bound to their document", () => {
    const props = createProps({
      docRequests: [requested, uploaded],
      allRequestedDocumentsUploaded: false,
    });
    render(<CustomerRequestDocumentsSection {...props} />);

    expect(
      screen.getByRole("link", { name: "Скачать Выписка.pdf" }),
    ).toHaveAttribute(
      "href",
      "/api/requests/request-1/document-requests/uploaded/download",
    );
    const file = new File(["document"], "Новая выписка.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(screen.getByLabelText("Загрузить Выписка из ЕГРН"), {
      target: { files: [file] },
    });
    expect(props.onUploadRequestedDocument).toHaveBeenCalledWith(
      "requested",
      file,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Удалить Выписка.pdf" }),
    );
    expect(props.onDeleteRequestedDocument).toHaveBeenCalledWith("uploaded");
  });

  it("keeps executing requests collapsed and hides deletion after work starts", () => {
    render(
      <CustomerRequestDocumentsSection
        {...createProps({
          request: { id: "request-1", status: "ACTIVE" } as RequestCustomerDto,
          docRequests: [uploaded],
        })}
      />,
    );

    const toggle = screen.getByRole("button", { name: "Развернуть документы" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(
      screen.getByRole("link", { name: "Скачать Выписка.pdf" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Удалить Выписка.pdf" }),
    ).not.toBeInTheDocument();
  });

  it("keeps acceptance available and blocks document input while an action is busy", () => {
    const props = createProps({
      canAcceptContract: true,
      docRequests: [requested],
    });
    const { rerender } = render(<CustomerRequestDocumentsSection {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Заключить договор" }));
    expect(props.onOpenOfferDialog).toHaveBeenCalledOnce();

    rerender(<CustomerRequestDocumentsSection {...props} docUploadBusy />);
    expect(
      screen.getByRole("button", { name: "Заключить договор" }),
    ).toBeDisabled();
    expect(screen.getByLabelText("Загрузить Выписка из ЕГРН")).toBeDisabled();
  });
});
