import { cleanup, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProRequestDocumentsSection, type ProRequestDocumentsSectionProps } from "./ProRequestDocumentsSection";

afterEach(cleanup);

function openUpload() {
  const upload = vi.fn().mockResolvedValue(undefined);
  const props: ProRequestDocumentsSectionProps = {
    open: true, requestId: "r1", requestStatus: "DISCUSSING", isBusy: false,
    docRequestsLoaded: true, contractBundlesLoaded: true, miscLoaded: true,
    docRequests: [], contractBundles: [], miscFiles: [], uploadBusy: false, uploadNames: [],
    onCreateDocRequest: vi.fn(), onCancelDocRequest: vi.fn(), onUploadContractBundle: upload,
    onDeleteContractBundle: vi.fn(), onUploadMiscFiles: vi.fn(), onDeleteMiscFile: vi.fn(),
  };
  render(<ProRequestDocumentsSection {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Загрузить договор" }));
  return { upload, dialog: within(screen.getByRole("dialog", { name: "Загрузить договор" })) };
}

const document = new File(["test document"], "contract.pdf", { type: "application/pdf" });
const signature = new File(["test signature"], "contract.pdf.sig", { type: "application/octet-stream" });

describe("optional signature in the upload dialog", () => {
  it("allows uploading only a document", async () => {
    const { upload, dialog } = openUpload();
    const submit = dialog.getByRole("button", { name: "Загрузить" });
    expect(submit).toBeDisabled();
    fireEvent.change(dialog.getByLabelText("Файл договора"), { target: { files: [document] } });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    await waitFor(() => expect(upload).toHaveBeenCalledWith({ document, signature: null }));
  });

  it("does not allow uploading a signature by itself", () => {
    const { dialog } = openUpload();
    fireEvent.change(dialog.getByLabelText("Файл подписи"), { target: { files: [signature] } });
    expect(dialog.getByRole("button", { name: "Загрузить" })).toBeDisabled();
  });

  it("includes an optional signature and allows removing it", async () => {
    const { upload, dialog } = openUpload();
    fireEvent.change(dialog.getByLabelText("Файл договора"), { target: { files: [document] } });
    fireEvent.change(dialog.getByLabelText("Файл подписи"), { target: { files: [signature] } });
    expect(dialog.getByText(signature.name)).toBeInTheDocument();
    fireEvent.click(dialog.getByRole("button", { name: "Убрать файл подписи" }));
    expect(dialog.queryByText(signature.name)).not.toBeInTheDocument();
    fireEvent.change(dialog.getByLabelText("Файл подписи"), { target: { files: [signature] } });
    fireEvent.click(dialog.getByRole("button", { name: "Загрузить" }));
    await waitFor(() => expect(upload).toHaveBeenCalledWith({ document, signature }));
  });
});
