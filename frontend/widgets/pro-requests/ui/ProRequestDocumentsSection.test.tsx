import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ProRequestDocumentsSection,
  type ProRequestDocumentsSectionProps,
} from "./ProRequestDocumentsSection";

afterEach(cleanup);

function createProps(
  overrides: Partial<ProRequestDocumentsSectionProps> = {},
): ProRequestDocumentsSectionProps {
  return {
    open: true,
    requestId: "r1",
    requestStatus: "DISCUSSING",
    isBusy: false,
    docRequestsLoaded: true,
    contractBundlesLoaded: true,
    miscLoaded: true,
    docRequests: [],
    contractBundles: [],
    miscFiles: [],
    uploadBusy: false,
    uploadNames: [],
    onCreateDocRequest: vi.fn(),
    onCancelDocRequest: vi.fn(),
    onUploadContractBundle: vi.fn().mockResolvedValue(undefined),
    onDeleteContractBundle: vi.fn(),
    onUploadMiscFiles: vi.fn(),
    onDeleteMiscFile: vi.fn(),
    onSetMiscFileVisibility: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function openUpload() {
  const props = createProps();
  const upload = vi.mocked(props.onUploadContractBundle);
  render(<ProRequestDocumentsSection {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Загрузить договор" }));
  return {
    upload,
    dialog: within(screen.getByRole("dialog", { name: "Загрузить договор" })),
  };
}

const document = new File(["test document"], "contract.pdf", {
  type: "application/pdf",
});
const signature = new File(["test signature"], "contract.pdf.sig", {
  type: "application/octet-stream",
});
const attachment = new File(["test attachment"], "plan.pdf", {
  type: "application/pdf",
});

const timestamp = "2026-11-11T12:00:00.000Z";
const customerFile: ProRequestDocumentsSectionProps["docRequests"][number] = {
  id: "customer-file",
  title: "Паспорт объекта",
  status: "UPLOADED",
  originalName: "Паспорт_объекта.pdf",
  mimeType: "application/pdf",
  sizeBytes: 100,
  sha256: null,
  uploadedAt: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp,
};
const providerFile: ProRequestDocumentsSectionProps["miscFiles"][number] = {
  id: "provider-file",
  visibleToCustomer: true,
  originalName: "Межевой_план.pdf",
  status: "PENDING_CUSTOMER",
  mimeType: "application/pdf",
  sizeBytes: 100,
  revisionMessage: null,
  decidedAt: null,
  createdAt: timestamp,
  updatedAt: timestamp,
};
const contract: ProRequestDocumentsSectionProps["contractBundles"][number] = {
  bundleId: "bundle",
  status: "PENDING_CUSTOMER",
  revisionMessage: null,
  decidedAt: null,
  document: {
    id: "contract-file",
    originalName: "Договор.pdf",
    mimeType: "application/pdf",
    sizeBytes: 100,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  signature: {
    id: "signature-file",
    originalName: "Договор.pdf.sig",
    mimeType: "application/octet-stream",
    sizeBytes: 100,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  createdAt: timestamp,
  updatedAt: timestamp,
};

describe("document states and actions", () => {
  it("shows only the actions in empty customer and provider sections", () => {
    render(<ProRequestDocumentsSection {...createProps()} />);
    expect(screen.getByText("Договор ещё не загружен")).toBeInTheDocument();
    for (const name of ["Документы клиента", "Мои документы"]) {
      const section = within(screen.getByRole("region", { name }));
      expect(section.queryByRole("heading")).not.toBeInTheDocument();
      expect(section.getAllByRole("button")).toHaveLength(1);
    }
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows files without a contract and keeps their download endpoints", () => {
    render(
      <ProRequestDocumentsSection
        {...createProps({
          docRequests: [customerFile],
          miscFiles: [providerFile],
        })}
      />,
    );
    expect(screen.getByText("Договор ещё не загружен")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Документы клиента" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Мои документы" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Паспорт_объекта.pdf")).toBeInTheDocument();
    expect(screen.queryByText("Паспорт объекта")).not.toBeInTheDocument();
    expect(screen.queryByText("Загружен")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Скачать Паспорт_объекта.pdf" }),
    ).toHaveAttribute(
      "href",
      "/api/pro/document-requests/customer-file/download",
    );
    expect(
      screen.getByRole("link", { name: "Скачать Межевой_план.pdf" }),
    ).toHaveAttribute("href", "/api/pro/contract-files/provider-file/download");
  });

  it("shows several files and contract statuses, including signatures and revision comments", () => {
    render(
      <ProRequestDocumentsSection
        {...createProps({
          docRequests: [
            customerFile,
            {
              ...customerFile,
              id: "customer-second",
              title: "Выписка из ЕГРН",
              originalName: "Выписка_ЕГРН.pdf",
            },
          ],
          miscFiles: [
            providerFile,
            {
              ...providerFile,
              id: "provider-second",
              originalName: "Схема.pdf",
            },
          ],
          contractBundles: [
            { ...contract, status: "APPROVED" },
            {
              ...contract,
              bundleId: "revision",
              status: "REVISION_REQUESTED",
              revisionMessage: "Уточните реквизиты",
              signature: null,
              document: {
                ...contract.document,
                id: "revision-file",
                originalName: "Договор_2.pdf",
              },
            },
          ],
        })}
      />,
    );
    expect(
      screen.queryByText("Договор ещё не загружен"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Одобрен")).toBeInTheDocument();
    expect(screen.getByText("На доработку")).toBeInTheDocument();
    expect(
      screen.getByText("Комментарий клиента: Уточните реквизиты"),
    ).toBeInTheDocument();
    expect(screen.getByText("Файл подписи не приложен.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Скачать подпись" }),
    ).toHaveAttribute(
      "href",
      "/api/pro/contract-files/signature-file/download",
    );
    expect(screen.getByText("Выписка_ЕГРН.pdf")).toBeInTheDocument();
    expect(screen.getByText("Схема.pdf")).toBeInTheDocument();
  });

  it("uses the existing request, cancellation, deletion and multiple-file upload callbacks", async () => {
    const props = createProps({
      docRequests: [
        {
          ...customerFile,
          id: "pending",
          status: "REQUESTED",
          originalName: null,
          mimeType: null,
        },
      ],
      miscFiles: [providerFile],
      contractBundles: [contract],
    });
    render(<ProRequestDocumentsSection {...props} />);
    fireEvent.click(
      within(
        screen.getByRole("region", { name: "Документы клиента" }),
      ).getByRole("button", { name: "Отмена" }),
    );
    await waitFor(() =>
      expect(props.onCancelDocRequest).toHaveBeenCalledWith("pending"),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Удалить Межевой_план.pdf" }),
    );
    await waitFor(() =>
      expect(props.onDeleteMiscFile).toHaveBeenCalledWith("provider-file"),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Удалить пакет Договор.pdf" }),
    );
    await waitFor(() =>
      expect(props.onDeleteContractBundle).toHaveBeenCalledWith("bundle"),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Загрузить документы" }),
    );
    fireEvent.change(screen.getByLabelText("Файлы исполнителя"), {
      target: { files: [document, attachment] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Загрузить" }));
    await waitFor(() =>
      expect(props.onUploadMiscFiles).toHaveBeenCalledWith(
        [document, attachment],
        true,
      ),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Запросить документ у клиента" }),
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Название документа" }),
      { target: { value: "  Выписка ЕГРН  " } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Отправить" }));
    await waitFor(() =>
      expect(props.onCreateDocRequest).toHaveBeenCalledWith("Выписка ЕГРН"),
    );
  });

  it("keeps execution-stage documents collapsed and prevents file deletion", () => {
    render(
      <ProRequestDocumentsSection
        {...createProps({
          requestStatus: "ACTIVE",
          contractBundles: [contract],
          miscFiles: [providerFile],
        })}
      />,
    );
    const expand = screen.getByRole("button", { name: "Развернуть документы" });
    expect(expand).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(expand);
    expect(
      screen.getByRole("button", { name: "Свернуть документы" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.queryByRole("button", { name: /Удалить/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Скачать Договор.pdf" }),
    ).toBeInTheDocument();
  });

  it("does not display the empty-contract message until loading completes", () => {
    render(
      <ProRequestDocumentsSection
        {...createProps({
          contractBundlesLoaded: false,
          docRequestsLoaded: false,
          miscLoaded: false,
        })}
      />,
    );
    expect(
      screen.getByText("Загружаем список документов…"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Договор ещё не загружен"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Загрузить договор" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Запросить документ у клиента" }),
    ).toBeDisabled();
  });
});

describe("optional signature in the upload dialog", () => {
  it("allows uploading only a document", async () => {
    const { upload, dialog } = openUpload();
    const submit = dialog.getByRole("button", { name: "Загрузить" });
    expect(submit).toBeDisabled();
    fireEvent.change(dialog.getByLabelText("Файл договора"), {
      target: { files: [document] },
    });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    await waitFor(() =>
      expect(upload).toHaveBeenCalledWith({ document, signature: null }),
    );
  });

  it("does not allow uploading a signature by itself", () => {
    const { dialog } = openUpload();
    fireEvent.change(dialog.getByLabelText("Файл подписи"), {
      target: { files: [signature] },
    });
    expect(dialog.getByRole("button", { name: "Загрузить" })).toBeDisabled();
  });

  it("includes an optional signature and allows removing it", async () => {
    const { upload, dialog } = openUpload();
    fireEvent.change(dialog.getByLabelText("Файл договора"), {
      target: { files: [document] },
    });
    fireEvent.change(dialog.getByLabelText("Файл подписи"), {
      target: { files: [signature] },
    });
    expect(dialog.getByText(signature.name)).toBeInTheDocument();
    fireEvent.click(
      dialog.getByRole("button", { name: "Убрать файл подписи" }),
    );
    expect(dialog.queryByText(signature.name)).not.toBeInTheDocument();
    fireEvent.change(dialog.getByLabelText("Файл подписи"), {
      target: { files: [signature] },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Загрузить" }));
    await waitFor(() =>
      expect(upload).toHaveBeenCalledWith({ document, signature }),
    );
  });
});

describe("provider file visibility", () => {
  function openMisc(props = createProps()) {
    render(<ProRequestDocumentsSection {...props} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Загрузить документы" }),
    );
    return {
      props,
      dialog: within(
        screen.getByRole("dialog", { name: "Загрузить документы" }),
      ),
    };
  }

  it.each([true, false])(
    "uploads documents with customer visibility %s",
    async (visible) => {
      const { props, dialog } = openMisc();
      const checkbox = dialog.getByRole("checkbox", {
        name: "Показывать файл клиенту",
      });
      expect(checkbox).toBeChecked();
      expect(dialog.getByRole("button", { name: "Загрузить" })).toBeDisabled();
      if (!visible) fireEvent.click(checkbox);
      fireEvent.change(dialog.getByLabelText("Файлы исполнителя"), {
        target: { files: [attachment] },
      });
      expect(props.onUploadMiscFiles).not.toHaveBeenCalled();
      expect(dialog.getByText(attachment.name)).toBeInTheDocument();
      fireEvent.click(dialog.getByRole("button", { name: "Загрузить" }));
      await waitFor(() =>
        expect(props.onUploadMiscFiles).toHaveBeenCalledWith(
          [attachment],
          visible,
        ),
      );
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
    },
  );

  it("resets selection and visibility when reopened after cancellation", () => {
    const { props, dialog } = openMisc();
    fireEvent.click(dialog.getByRole("checkbox"));
    fireEvent.change(dialog.getByLabelText("Файлы исполнителя"), {
      target: { files: [attachment] },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Отмена" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Загрузить документы" }),
    );
    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(screen.queryByText(attachment.name)).not.toBeInTheDocument();
    expect(props.onUploadMiscFiles).not.toHaveBeenCalled();
  });

  it("allows selecting a photo alongside a PDF in the upload dialog", async () => {
    const { props, dialog } = openMisc();
    const input = dialog.getByLabelText("Файлы исполнителя");
    expect(input).toHaveAttribute("accept", expect.stringContaining("image/*"));
    expect(input).toHaveAttribute("accept", expect.stringContaining(".heic"));
    const photo = new File(["photo"], "Участок.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [photo, attachment] } });
    fireEvent.click(dialog.getByRole("button", { name: "Загрузить" }));
    await waitFor(() =>
      expect(props.onUploadMiscFiles).toHaveBeenCalledWith(
        [photo, attachment],
        true,
      ),
    );
  });

  it("keeps files and hidden visibility after an upload error for retry", async () => {
    const upload = vi
      .fn()
      .mockRejectedValueOnce(new Error("Нет соединения"))
      .mockResolvedValueOnce(undefined);
    const { dialog } = openMisc(createProps({ onUploadMiscFiles: upload }));
    fireEvent.click(dialog.getByRole("checkbox"));
    fireEvent.change(dialog.getByLabelText("Файлы исполнителя"), {
      target: { files: [attachment] },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Загрузить" }));
    await waitFor(() =>
      expect(dialog.getByRole("alert")).toHaveTextContent("Нет соединения"),
    );
    expect(dialog.getByText(attachment.name)).toBeInTheDocument();
    expect(dialog.getByRole("checkbox")).not.toBeChecked();
    fireEvent.click(dialog.getByRole("button", { name: "Загрузить" }));
    await waitFor(() =>
      expect(upload).toHaveBeenNthCalledWith(2, [attachment], false),
    );
  });

  it("keeps the dialog locked while upload is in progress", async () => {
    let finish!: () => void;
    const upload = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const { dialog } = openMisc(createProps({ onUploadMiscFiles: upload }));
    fireEvent.change(dialog.getByLabelText("Файлы исполнителя"), {
      target: { files: [attachment] },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Загрузить" }));
    expect(dialog.getByRole("button", { name: "Отмена" })).toBeDisabled();
    expect(dialog.getByRole("checkbox")).toBeDisabled();
    expect(dialog.getByLabelText("Файлы исполнителя")).toBeDisabled();
    finish();
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("rejects more than ten files before uploading", () => {
    const { props, dialog } = openMisc();
    fireEvent.change(dialog.getByLabelText("Файлы исполнителя"), {
      target: { files: Array.from({ length: 11 }, () => attachment) },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Загрузить" }));
    expect(dialog.getByRole("alert")).toHaveTextContent("не более 10 файлов");
    expect(props.onUploadMiscFiles).not.toHaveBeenCalled();
  });

  it("distinguishes shared and private files in the provider list", () => {
    render(
      <ProRequestDocumentsSection
        {...createProps({
          miscFiles: [
            providerFile,
            {
              ...providerFile,
              id: "private",
              originalName: "Смета.pdf",
              visibleToCustomer: false,
            },
          ],
        })}
      />,
    );
    expect(
      screen.getByRole("button", {
        name: "Скрыть Межевой_план.pdf от клиента",
      }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Показать Смета.pdf клиенту" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it.each([true, false])(
    "cancels a visibility change for a file with customer visibility %s",
    (visibleToCustomer) => {
      const props = createProps({
        miscFiles: [{ ...providerFile, visibleToCustomer }],
      });
      render(<ProRequestDocumentsSection {...props} />);
      const eye = screen.getByRole("button", {
        name: visibleToCustomer
          ? "Скрыть Межевой_план.pdf от клиента"
          : "Показать Межевой_план.pdf клиенту",
      });
      fireEvent.click(eye);
      const dialog = within(screen.getByRole("dialog"));
      expect(
        dialog.getByText(/Вы уверены.*Межевой_план\.pdf/),
      ).toBeInTheDocument();
      expect(props.onSetMiscFileVisibility).not.toHaveBeenCalled();
      fireEvent.click(dialog.getByRole("button", { name: "Отмена" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(eye).toHaveAttribute("aria-pressed", String(visibleToCustomer));
      expect(props.onSetMiscFileVisibility).not.toHaveBeenCalled();
    },
  );

  it("hides and shows a file only after confirming the eye button action", async () => {
    const props = createProps({ miscFiles: [providerFile] });
    const { rerender } = render(<ProRequestDocumentsSection {...props} />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Скрыть Межевой_план.pdf от клиента",
      }),
    );
    expect(props.onSetMiscFileVisibility).not.toHaveBeenCalled();
    const hideDialog = within(
      screen.getByRole("dialog", { name: "Скрыть файл от клиента?" }),
    );
    expect(
      hideDialog.getByText(/Клиент больше не будет видеть/),
    ).toBeInTheDocument();
    fireEvent.click(hideDialog.getByRole("button", { name: "Скрыть" }));
    await waitFor(() =>
      expect(props.onSetMiscFileVisibility).toHaveBeenCalledWith(
        providerFile.id,
        false,
      ),
    );
    rerender(
      <ProRequestDocumentsSection
        {...props}
        miscFiles={[{ ...providerFile, visibleToCustomer: false }]}
      />,
    );
    const show = screen.getByRole("button", {
      name: "Показать Межевой_план.pdf клиенту",
    });
    expect(
      within(show).getByTestId("VisibilityOffOutlinedIcon"),
    ).toBeInTheDocument();
    fireEvent.click(show);
    expect(props.onSetMiscFileVisibility).toHaveBeenCalledTimes(1);
    const showDialog = within(
      screen.getByRole("dialog", { name: "Показать файл клиенту?" }),
    );
    expect(
      showDialog.getByText(/Клиент сможет увидеть и скачать/),
    ).toBeInTheDocument();
    fireEvent.click(showDialog.getByRole("button", { name: "Показать" }));
    await waitFor(() =>
      expect(props.onSetMiscFileVisibility).toHaveBeenCalledWith(
        providerFile.id,
        true,
      ),
    );
    rerender(<ProRequestDocumentsSection {...props} />);
    expect(
      within(
        screen.getByRole("button", {
          name: "Скрыть Межевой_план.pdf от клиента",
        }),
      ).getByTestId("VisibilityOutlinedIcon"),
    ).toBeInTheDocument();
  });

  it("blocks repeated clicks until saving completes and preserves visibility on failure", async () => {
    let fail!: (error: Error) => void;
    const update = vi.fn(
      () =>
        new Promise<void>((_, reject) => {
          fail = reject;
        }),
    );
    render(
      <ProRequestDocumentsSection
        {...createProps({
          miscFiles: [providerFile],
          onSetMiscFileVisibility: update,
        })}
      />,
    );
    const hide = screen.getByRole("button", {
      name: "Скрыть Межевой_план.pdf от клиента",
    });
    fireEvent.click(hide);
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Скрыть",
      }),
    );
    expect(hide).toBeDisabled();
    fireEvent.click(hide);
    expect(update).toHaveBeenCalledTimes(1);
    fail(new Error("Не удалось сохранить видимость"));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Не удалось сохранить видимость",
      ),
    );
    expect(hide).toBeEnabled();
    expect(hide).toHaveAttribute("aria-pressed", "true");
  });
});

describe("upload recovery", () => {
  it("keeps both files after failure and retries only when requested", async () => {
    const { upload, dialog } = openUpload();
    upload
      .mockRejectedValueOnce(new Error("Нет соединения с сервером."))
      .mockResolvedValueOnce(undefined);
    fireEvent.change(dialog.getByLabelText("Файл договора"), {
      target: { files: [document] },
    });
    fireEvent.change(dialog.getByLabelText("Файл подписи"), {
      target: { files: [signature] },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Загрузить" }));
    await waitFor(() =>
      expect(dialog.getByRole("alert")).toHaveTextContent("Нет соединения"),
    );
    expect(dialog.getByRole("button", { name: document.name })).toBeEnabled();
    expect(dialog.getByRole("button", { name: signature.name })).toBeEnabled();
    expect(upload).toHaveBeenCalledTimes(1);
    fireEvent.click(dialog.getByRole("button", { name: "Загрузить" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Загрузить договор" }),
      ).not.toBeInTheDocument(),
    );
    expect(upload).toHaveBeenNthCalledWith(2, { document, signature });
  });
});
