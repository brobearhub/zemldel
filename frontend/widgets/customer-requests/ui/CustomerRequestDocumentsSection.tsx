"use client";

import Link from "next/link";
import { Alert, Button, Stack, Typography } from "@mui/material";
import type { RequestCustomerDto, RequestDocumentRequestDto } from "@/entities/request";
import { isOrderExecutionStatus, RequestDocumentsList } from "@/entities/request";
import { DocumentsSectionHeader } from "@/features/documents-security-info";
import { CustomerRequestContractFilesClient, type CustomerContractFileListItem } from "@/features/request-contract-files/ui/CustomerRequestContractFilesClient";
import { DocumentsSectionShell } from "@/shared/ui/DocumentsSectionShell";

type Props = {
  open: boolean;
  request: RequestCustomerDto;
  busy: boolean;
  docUploadBusy: boolean;

  contractFiles: CustomerContractFileListItem[];
  docRequests: RequestDocumentRequestDto[];
  allRequestedDocumentsUploaded: boolean;

  hasRevisionRequested: boolean;
  hasPending: boolean;
  hasContractFiles: boolean;
  canAcceptContract: boolean;

  onDeleteRequestedDocument: (docRequestId: string) => Promise<void> | void;
  onUploadRequestedDocument: (docRequestId: string, file: File) => Promise<void> | void;
  onOpenOfferDialog: () => void;
  onContractFilesChange: (next: CustomerContractFileListItem[]) => void;
};

function CustomerDocumentsBanners(props: {
  request: RequestCustomerDto;
  hasContractFiles: boolean;
  docRequests: readonly RequestDocumentRequestDto[];
  allRequestedDocumentsUploaded: boolean;
  hasRevisionRequested: boolean;
  hasPending: boolean;
}) {
  const { request, hasContractFiles, docRequests, allRequestedDocumentsUploaded, hasRevisionRequested, hasPending } = props;

  return (
    <>
      {request.status === "PROVIDER_SELECTED" && !hasContractFiles ? (
        <Typography variant="body2" color="text.secondary">
          Ожидаем договор от компании.
        </Typography>
      ) : null}

      {docRequests.length > 0 && !allRequestedDocumentsUploaded ? (
        <Alert severity="info">Исполнитель запросил документы. Загрузите их.</Alert>
      ) : null}

      {hasRevisionRequested ? (
        <Alert severity="warning">Вы отправили договор на доработку. Ожидаем обновлённый файл от компании.</Alert>
      ) : null}

      {hasPending ? (
        <Alert severity="info">
          Компания прикрепила договор. Скачайте его, проверьте и одобрите или отправьте на доработку.
        </Alert>
      ) : null}
    </>
  );
}

function CustomerRequestedDocumentsBlock(props: {
  requestId: string;
  requestStatus: RequestCustomerDto["status"];
  items: RequestDocumentRequestDto[];
  busy: boolean;
  docUploadBusy: boolean;
  onDeleteRequestedDocument: (docRequestId: string) => Promise<void> | void;
  onUploadRequestedDocument: (docRequestId: string, file: File) => Promise<void> | void;
}) {
  const { requestId, requestStatus, items, busy, docUploadBusy, onDeleteRequestedDocument, onUploadRequestedDocument } = props;

  if (items.length === 0) return null;

  return (
    <Stack spacing={1}>
      <RequestDocumentsList
        title="Мои документы"
        items={items}
        renderActions={(d) => {
          const hasFile = d.status === "UPLOADED" && Boolean(d.originalName) && Boolean(d.mimeType);
          const canUploadHere = d.status === "REQUESTED";

          if (!hasFile && !canUploadHere) return null;

          return (
            <>
              {hasFile ? (
                <>
                  <Button
                    component={Link}
                    href={`/api/requests/${requestId}/document-requests/${d.id}/download`}
                    variant="text"
                    disabled={busy || docUploadBusy}
                  >
                    Скачать
                  </Button>
                  {!isOrderExecutionStatus(requestStatus) ? (
                    <Button
                      color="error"
                      variant="text"
                      disabled={busy || docUploadBusy}
                      onClick={() => void onDeleteRequestedDocument(d.id)}
                    >
                      Удалить
                    </Button>
                  ) : null}
                </>
              ) : null}

              {canUploadHere ? (
                <Button component="label" variant="contained" disabled={busy || docUploadBusy} sx={{ whiteSpace: "nowrap" }}>
                  {docUploadBusy ? "Загрузка…" : "Загрузить"}
                  <input
                    hidden
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => {
                      const file = e.currentTarget.files?.[0] ?? null;
                      e.currentTarget.value = "";
                      if (!file) return;
                      void onUploadRequestedDocument(d.id, file);
                    }}
                  />
                </Button>
              ) : null}
            </>
          );
        }}
      />
    </Stack>
  );
}

function CustomerAcceptContractActions(props: { canAcceptContract: boolean; busy: boolean; docUploadBusy: boolean; onOpenOfferDialog: () => void }) {
  const { canAcceptContract, busy, docUploadBusy, onOpenOfferDialog } = props;

  return (
    <>
      {canAcceptContract ? (
        <>
          <Alert severity="success">Все документы одобрены. Теперь можно перейти к заключению договора.</Alert>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ alignSelf: "flex-start", pt: 2 }}>
            <Button variant="contained" color="success" disabled={busy || docUploadBusy} onClick={() => onOpenOfferDialog()}>
              Заключить договор
            </Button>
          </Stack>
        </>
      ) : null}
    </>
  );
}

export function CustomerRequestDocumentsSection(props: Props) {
  if (!props.open) return null;

  return (
    <DocumentsSectionShell
      id="documents"
      headerLeft={<DocumentsSectionHeader titleVariant="body1" titleWeight={800} />}
      headerRight={null}
      spacing={1}
    >
      <CustomerDocumentsBanners
        request={props.request}
        hasContractFiles={props.hasContractFiles}
        docRequests={props.docRequests}
        allRequestedDocumentsUploaded={props.allRequestedDocumentsUploaded}
        hasRevisionRequested={props.hasRevisionRequested}
        hasPending={props.hasPending}
      />

      <CustomerRequestedDocumentsBlock
        requestId={props.request.id}
        requestStatus={props.request.status}
        items={props.docRequests}
        busy={props.busy}
        docUploadBusy={props.docUploadBusy}
        onDeleteRequestedDocument={props.onDeleteRequestedDocument}
        onUploadRequestedDocument={props.onUploadRequestedDocument}
      />

      <CustomerRequestContractFilesClient
        requestId={props.request.id}
        initialFiles={props.contractFiles}
        onFilesChange={props.onContractFilesChange}
      />

      <CustomerAcceptContractActions
        canAcceptContract={props.canAcceptContract}
        busy={props.busy}
        docUploadBusy={props.docUploadBusy}
        onOpenOfferDialog={props.onOpenOfferDialog}
      />
    </DocumentsSectionShell>
  );
}

