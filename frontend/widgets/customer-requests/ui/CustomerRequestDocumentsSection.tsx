"use client";

import { useState } from "react";
import { REQUEST_DOCUMENT_INPUT_ACCEPT } from "@/entities/request/lib/request-document-upload";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import type { CustomerProviderFile } from "@/entities/request/api/customer-provider-files";
import {
  RequestDocumentDelete,
  RequestDocumentDownload,
  RequestDocumentFileCard,
} from "@/entities/request/ui/RequestDocumentFileCard";
import type {
  RequestCustomerDto,
  RequestDocumentRequestDto,
} from "@/entities/request";
import {
  isOrderExecutionStatus,
  shouldCollapseDocumentsByDefault,
} from "@/entities/request";
import { DocumentsSectionHeader } from "@/features/documents-security-info";
import {
  CustomerRequestContractFilesClient,
  type CustomerContractBundleListItem,
} from "@/features/request-contract-files/ui/CustomerRequestContractFilesClient";
import { DocumentsNeutralAlert } from "@/shared/ui/DocumentsNeutralAlert";
import { DocumentsSectionShell } from "@/shared/ui/DocumentsSectionShell";

type Props = {
  open: boolean;
  request: RequestCustomerDto;
  busy: boolean;
  docUploadBusy: boolean;

  contractBundles: CustomerContractBundleListItem[];
  docRequests: RequestDocumentRequestDto[];
  providerFiles: CustomerProviderFile[];
  providerFilesError: string | null;
  onRetryProviderFiles: () => void;
  allRequestedDocumentsUploaded: boolean;

  hasRevisionRequested: boolean;
  hasPending: boolean;
  hasContractBundles: boolean;
  canAcceptContract: boolean;

  onDeleteRequestedDocument: (docRequestId: string) => Promise<void> | void;
  onUploadRequestedDocument: (
    docRequestId: string,
    file: File,
  ) => Promise<void> | void;
  onOpenOfferDialog: () => void;
  onContractDecisionBusyChange?: (busy: boolean) => void;
  onContractBundlesChange: (next: CustomerContractBundleListItem[]) => void;
};

function CustomerRequestedDocumentsBlock(props: {
  requestId: string;
  requestStatus: RequestCustomerDto["status"];
  items: RequestDocumentRequestDto[];
  busy: boolean;
  docUploadBusy: boolean;
  onDeleteRequestedDocument: (docRequestId: string) => Promise<void> | void;
  onUploadRequestedDocument: (
    docRequestId: string,
    file: File,
  ) => Promise<void> | void;
}) {
  const {
    requestId,
    requestStatus,
    items,
    busy,
    docUploadBusy,
    onDeleteRequestedDocument,
    onUploadRequestedDocument,
  } = props;
  const [pendingDoc, setPendingDoc] = useState<{
    id: string;
    action: "upload" | "delete";
  } | null>(null);

  return (
    <Stack
      component="section"
      aria-label="Мои документы"
      spacing={1.5}
      sx={{
        minWidth: 0,
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: "center",
        }}
      >
        <PersonOutlineIcon />
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
          }}
        >
          Мои документы
        </Typography>
      </Stack>
      {items.length === 0 ? (
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
          }}
        >
          Исполнитель пока не запросил документы. Здесь появятся файлы, которые
          нужно загрузить для работы по заявке.
        </Typography>
      ) : null}
      {items.some((doc) => doc.status === "REQUESTED") &&
      !isOrderExecutionStatus(requestStatus) &&
      !["CLOSED", "CANCELLED"].includes(requestStatus) ? (
        <DocumentsNeutralAlert>
          Исполнитель запросил документы. Загрузите PDF, DOCX или фото.
        </DocumentsNeutralAlert>
      ) : null}
      {items.map((doc) => {
        const hasFile =
          doc.status === "UPLOADED" &&
          Boolean(doc.originalName) &&
          Boolean(doc.mimeType);

        return (
          <RequestDocumentFileCard
            key={doc.id}
            title={hasFile ? doc.originalName! : doc.title}
            status={
              hasFile ? undefined : (
                <Chip
                  size="small"
                  label={
                    doc.status === "UPLOADED" ? "Загружен" : "Нужно загрузить"
                  }
                  sx={(theme) => ({
                    bgcolor: alpha(theme.palette.success.main, 0.12),
                    fontWeight: 700,
                  })}
                />
              )
            }
            actions={
              <>
                {hasFile ? (
                  <>
                    <RequestDocumentDownload
                      href={`/api/requests/${requestId}/document-requests/${doc.id}/download`}
                      name={doc.originalName!}
                      disabled={busy || docUploadBusy}
                    />
                    {!isOrderExecutionStatus(requestStatus) ? (
                      <RequestDocumentDelete
                        name={doc.originalName!}
                        loading={
                          docUploadBusy &&
                          pendingDoc?.id === doc.id &&
                          pendingDoc.action === "delete"
                        }
                        disabled={busy || docUploadBusy}
                        onClick={() => {
                          setPendingDoc({ id: doc.id, action: "delete" });
                          void onDeleteRequestedDocument(doc.id);
                        }}
                      />
                    ) : null}
                  </>
                ) : null}
                {doc.status === "REQUESTED" ? (
                  <Button
                    component="label"
                    variant="contained"
                    loading={
                      docUploadBusy &&
                      pendingDoc?.id === doc.id &&
                      pendingDoc.action === "upload"
                    }
                    disabled={busy || docUploadBusy}
                    sx={{
                      whiteSpace: "normal",
                    }}
                  >
                    Загрузить
                    <input
                      hidden
                      type="file"
                      aria-label={`Загрузить ${doc.title}`}
                      disabled={busy || docUploadBusy}
                      accept={REQUEST_DOCUMENT_INPUT_ACCEPT}
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0] ?? null;
                        event.currentTarget.value = "";
                        if (!file) return;
                        setPendingDoc({ id: doc.id, action: "upload" });
                        void onUploadRequestedDocument(doc.id, file);
                      }}
                    />
                  </Button>
                ) : null}
              </>
            }
          />
        );
      })}
    </Stack>
  );
}

function CustomerAcceptContractActions(props: {
  canAcceptContract: boolean;
  busy: boolean;
  docUploadBusy: boolean;
  onOpenOfferDialog: () => void;
}) {
  const { canAcceptContract, busy, docUploadBusy, onOpenOfferDialog } = props;

  return (
    <>
      {canAcceptContract ? (
        <>
          <Alert severity="success">
            Все документы одобрены. Теперь можно перейти к заключению договора.
          </Alert>
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{
              flexWrap: "wrap",
              alignSelf: "flex-start",
              pt: 2,
            }}
          >
            <Button
              variant="contained"
              color="success"
              disabled={busy || docUploadBusy}
              onClick={() => onOpenOfferDialog()}
            >
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

  const collapseByDefault = shouldCollapseDocumentsByDefault(
    props.request.status,
  );

  const showContractBanners =
    !isOrderExecutionStatus(props.request.status) &&
    !["CLOSED", "CANCELLED"].includes(props.request.status);

  return (
    <DocumentsSectionShell
      id="documents"
      headerLeft={<DocumentsSectionHeader />}
      headerRight={
        collapseByDefault &&
        (props.hasContractBundles ||
          props.docRequests.length > 0 ||
          props.providerFiles.length > 0) ? (
          <Chip
            size="small"
            label={
              !props.allRequestedDocumentsUploaded
                ? "Нужно загрузить документы"
                : props.hasRevisionRequested
                  ? "Договор на доработке"
                  : props.hasPending
                    ? "Проверьте договор"
                    : "Есть документы"
            }
          />
        ) : null
      }
      spacing={2.5}
      paperSx={{
        p: { xs: 2, tablet: 3 },
        borderColor: "divider",
        boxShadow: "none",
      }}
      collapsible={collapseByDefault}
      defaultExpanded={!collapseByDefault}
      expandedResetKey={`${props.request.id}:${props.request.status}`}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            tablet: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          },
          gap: 2.5,
          alignItems: "stretch",
        }}
      >
        <Stack
          component="section"
          aria-label="Договор с исполнителем"
          id="contract-review"
          tabIndex={-1}
          spacing={2}
          sx={(theme) => ({
            p: { xs: 2.5, tablet: 3 },
            minWidth: 0,
            borderRadius: 1.5,
            bgcolor: alpha(theme.palette.primary.main, 0.16),
            scrollMarginTop: "96px",
          })}
        >
          <Stack
            direction="row"
            spacing={1.5}
            sx={{
              alignItems: "center",
            }}
          >
            <DescriptionOutlinedIcon />
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
              }}
            >
              Договор с исполнителем
            </Typography>
          </Stack>
          {showContractBanners && props.hasRevisionRequested ? (
            <Alert severity="warning">
              Вы отправили договор на доработку. Ожидаем обновлённый файл от
              исполнителя.
            </Alert>
          ) : null}
          {showContractBanners && props.hasPending ? (
            <DocumentsNeutralAlert>
              Исполнитель прикрепил договор. Скачайте его, проверьте и одобрите
              или отправьте на доработку.
            </DocumentsNeutralAlert>
          ) : null}
          <CustomerRequestContractFilesClient
            requestId={props.request.id}
            bundles={props.contractBundles}
            disabled={props.busy || props.docUploadBusy}
            onBundlesChange={props.onContractBundlesChange}
            onBusyChange={props.onContractDecisionBusyChange}
          />
          <CustomerAcceptContractActions
            canAcceptContract={props.canAcceptContract}
            busy={props.busy}
            docUploadBusy={props.docUploadBusy}
            onOpenOfferDialog={props.onOpenOfferDialog}
          />
        </Stack>

        <Stack
          spacing={2.5}
          sx={{
            minWidth: 0,
            py: { xs: 0, tablet: 2.5 },
          }}
        >
          <CustomerRequestedDocumentsBlock
            requestId={props.request.id}
            requestStatus={props.request.status}
            items={props.docRequests}
            busy={props.busy}
            docUploadBusy={props.docUploadBusy}
            onDeleteRequestedDocument={props.onDeleteRequestedDocument}
            onUploadRequestedDocument={props.onUploadRequestedDocument}
          />
          {props.providerFiles.length > 0 || props.providerFilesError ? (
            <>
              <Divider />
              <Stack
                component="section"
                aria-label="Документы исполнителя"
                spacing={1.5}
              >
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{
                    alignItems: "center",
                  }}
                >
                  <FolderOutlinedIcon />
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                    }}
                  >
                    Документы исполнителя
                  </Typography>
                </Stack>
                {props.providerFilesError ? (
                  <Alert
                    severity="warning"
                    action={
                      <Button
                        size="small"
                        color="inherit"
                        disabled={props.busy || props.docUploadBusy}
                        onClick={props.onRetryProviderFiles}
                      >
                        Повторить
                      </Button>
                    }
                  >
                    {props.providerFilesError}
                  </Alert>
                ) : null}
                {props.providerFiles.map((file) => (
                  <RequestDocumentFileCard
                    key={file.id}
                    title={file.originalName}
                    actions={
                      <RequestDocumentDownload
                        href={`/api/requests/${props.request.id}/contract-files/${file.id}/download`}
                        name={file.originalName}
                        disabled={props.busy || props.docUploadBusy}
                      />
                    }
                  />
                ))}
              </Stack>
            </>
          ) : null}
        </Stack>
      </Box>
    </DocumentsSectionShell>
  );
}
