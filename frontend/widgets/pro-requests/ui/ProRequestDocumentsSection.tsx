"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import {
  ProRequestDocumentDelete,
  ProRequestDocumentDownload,
  ProRequestDocumentFileCard,
} from "./ProRequestDocumentFileCard";
import type {
  RequestDocumentRequestDto,
  RequestProDto,
} from "@/entities/request";
import {
  isOrderExecutionStatus,
  shouldCollapseDocumentsByDefault,
} from "@/entities/request";
import type {
  ProContractBundleItem,
  ProContractBundleStatus,
  ProMiscFileItem,
} from "@/entities/request/api/pro-contract-bundles";
import Link from "@/shared/ui/Link";
import { DocumentsSectionHeader } from "@/features/documents-security-info";
import { DocumentsNeutralAlert } from "@/shared/ui/DocumentsNeutralAlert";
import { DocumentsSectionShell } from "@/shared/ui/DocumentsSectionShell";

function contractFileStatusLabel(status: ProContractBundleStatus) {
  if (status === "APPROVED") return "Одобрен";
  if (status === "REVISION_REQUESTED") return "На доработку";
  return "Ожидает решения клиента";
}

export type ProRequestDocumentsSectionProps = {
  open: boolean;
  requestId: string;
  requestStatus: RequestProDto["status"];
  isBusy: boolean;

  docRequestsLoaded: boolean;
  contractBundlesLoaded: boolean;
  miscLoaded: boolean;
  docRequests: RequestDocumentRequestDto[];
  contractBundles: ProContractBundleItem[];
  miscFiles: ProMiscFileItem[];

  uploadBusy: boolean;
  uploadNames: string[];

  onCreateDocRequest: (title: string) => Promise<void> | void;
  onCancelDocRequest: (docRequestId: string) => Promise<void> | void;
  onUploadContractBundle: (input: {
    document: File;
    signature?: File | null;
  }) => Promise<void> | void;
  onDeleteContractBundle: (bundleId: string) => Promise<void> | void;
  onUploadMiscFiles: (files: File[]) => Promise<void> | void;
  onDeleteMiscFile: (fileId: string) => Promise<void> | void;
};

export function ProRequestDocumentsSection(
  props: ProRequestDocumentsSectionProps,
) {
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [docTitle, setDocTitle] = useState("");

  const [bundleDialogOpen, setBundleDialogOpen] = useState(false);
  const [bundleError, setBundleError] = useState<string | null>(null);
  const [bundleDocument, setBundleDocument] = useState<File | null>(null);
  const [bundleSignature, setBundleSignature] = useState<File | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  async function runPending(action: string, fn: () => Promise<void> | void) {
    setPendingAction(action);
    try {
      await fn();
    } finally {
      setPendingAction(null);
    }
  }

  const hasPendingContractFiles = useMemo(
    () => props.contractBundles.some((b) => b.status === "PENDING_CUSTOMER"),
    [props.contractBundles],
  );
  const hasRevisionRequested = useMemo(
    () => props.contractBundles.some((b) => b.status === "REVISION_REQUESTED"),
    [props.contractBundles],
  );
  const hasApproved = useMemo(
    () => props.contractBundles.some((b) => b.status === "APPROVED"),
    [props.contractBundles],
  );
  const hasPendingRequestedDocs = useMemo(
    () => props.docRequests.some((d) => d.status === "REQUESTED"),
    [props.docRequests],
  );
  const hasUploadedDocs = useMemo(
    () => props.docRequests.some((d) => d.status === "UPLOADED"),
    [props.docRequests],
  );

  if (!props.open) return null;

  const collapseByDefault = shouldCollapseDocumentsByDefault(
    props.requestStatus,
  );

  const headerRight =
    props.contractBundles.length > 0 || props.docRequests.length > 0 ? (
      <Chip
        size="small"
        label={
          hasPendingRequestedDocs
            ? "Ожидаем документы"
            : hasRevisionRequested
              ? "Есть замечания"
              : hasPendingContractFiles
                ? "Ожидает решения клиента"
                : hasUploadedDocs || hasApproved
                  ? "Есть документы"
                  : "Документы"
        }
      />
    ) : null;

  return (
    <>
      <DocumentsSectionShell
        headerLeft={<DocumentsSectionHeader />}
        headerRight={collapseByDefault ? headerRight : null}
        collapsible={collapseByDefault}
        defaultExpanded={!collapseByDefault}
        expandedResetKey={`${props.requestId}:${props.requestStatus}`}
        spacing={2.5}
        paperSx={{
          p: { xs: 2, tablet: 3 },
          borderColor: "divider",
          boxShadow: "none",
        }}
      >
        {!props.docRequestsLoaded ||
        !props.contractBundlesLoaded ||
        !props.miscLoaded ? (
          <DocumentsNeutralAlert icon={<CircularProgress size={16} />}>
            Загружаем список документов…
          </DocumentsNeutralAlert>
        ) : null}

        {props.uploadBusy ? (
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
            }}
          >
            <Stack spacing={1}>
              <Typography
                sx={{
                  fontWeight: 700,
                }}
              >
                Идёт загрузка файлов
              </Typography>
              <LinearProgress />
              {props.uploadNames.length > 0 ? (
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    overflowWrap: "anywhere",
                  }}
                >
                  {props.uploadNames.join(", ")}
                </Typography>
              ) : null}
            </Stack>
          </Paper>
        ) : null}

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
            aria-label="Договор с клиентом"
            spacing={2}
            sx={(theme) => ({
              p: { xs: 2.5, tablet: 3 },
              minWidth: 0,
              borderRadius: 1.5,
              bgcolor: alpha(theme.palette.primary.main, 0.16),
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
                Договор с клиентом
              </Typography>
            </Stack>
            {props.contractBundlesLoaded &&
            props.contractBundles.length === 0 ? (
              <>
                <Typography
                  variant="h3"
                  sx={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                  }}
                >
                  Договор ещё не загружен
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                  }}
                >
                  Прикрепите договор. Клиент сможет скачать его, одобрить или
                  отправить на доработку.
                </Typography>
              </>
            ) : null}
            {hasRevisionRequested ? (
              <Alert severity="warning">
                Клиент запросил доработку по одному или нескольким файлам.
              </Alert>
            ) : null}
            {props.contractBundles.map((bundle) => (
              <Stack
                key={bundle.bundleId}
                spacing={1.5}
                sx={{
                  minWidth: 0,
                }}
              >
                <ProRequestDocumentFileCard
                  title={bundle.document.originalName}
                  actions={
                    <>
                      <ProRequestDocumentDownload
                        href={`/api/pro/contract-files/${bundle.document.id}/download`}
                        name={bundle.document.originalName}
                        disabled={props.isBusy}
                      />
                      {!isOrderExecutionStatus(props.requestStatus) ? (
                        <ProRequestDocumentDelete
                          name={`пакет ${bundle.document.originalName}`}
                          text="Удалить пакет"
                          loading={
                            pendingAction === `delete-bundle:${bundle.bundleId}`
                          }
                          disabled={props.isBusy}
                          onClick={() =>
                            void runPending(
                              `delete-bundle:${bundle.bundleId}`,
                              () => props.onDeleteContractBundle(bundle.bundleId),
                            )
                          }
                        />
                      ) : null}
                    </>
                  }
                />
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.primary",
                  }}
                >
                  {contractFileStatusLabel(bundle.status)}
                </Typography>
                {bundle.revisionMessage ? (
                  <Typography
                    variant="body2"
                    sx={{
                      overflowWrap: "anywhere",
                    }}
                  >
                    Комментарий клиента: {bundle.revisionMessage}
                  </Typography>
                ) : null}
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    overflowWrap: "anywhere",
                  }}
                >
                  {bundle.signature
                    ? `Подпись: ${bundle.signature.originalName}`
                    : "Файл подписи не приложен."}
                </Typography>
                {bundle.signature ? (
                  <Button
                    component={Link}
                    href={`/api/pro/contract-files/${bundle.signature.id}/download`}
                    variant="text"
                    color="inherit"
                    disabled={props.isBusy}
                    sx={{
                      alignSelf: "flex-start",
                      p: 0,
                      minWidth: 0,
                      minHeight: 40,
                    }}
                  >
                    Скачать подпись
                  </Button>
                ) : null}
              </Stack>
            ))}
            <Box
              sx={{
                display: "flex",
                flexGrow: 1,
                alignItems: "flex-end",
                justifyContent: "flex-end",
                minWidth: 0,
              }}
            >
              <Button
                variant="contained"
                color={props.contractBundles.length > 0 ? "primary" : "secondary"}
                disabled={props.isBusy || !props.contractBundlesLoaded}
                onClick={() => {
                  setBundleDocument(null);
                  setBundleSignature(null);
                  setBundleError(null);
                  setBundleDialogOpen(true);
                }}
                sx={{
                  width: "fit-content",
                  maxWidth: "100%",
                }}
              >
                Загрузить договор
              </Button>
            </Box>
          </Stack>

          <Stack
            spacing={2.5}
            sx={{
              minWidth: 0,
              py:
                props.docRequests.length > 0 || props.miscFiles.length > 0
                  ? 2.5
                  : 0,
              justifyContent:
                props.docRequests.length === 0 && props.miscFiles.length === 0
                  ? "center"
                  : "flex-start",
            }}
          >
            <Stack
              component="section"
              aria-label="Документы клиента"
              spacing={1.5}
            >
              {props.docRequests.length > 0 ? (
                <>
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
                      Документы клиента
                    </Typography>
                  </Stack>
                  {props.docRequests.map((doc) => {
                    const hasFile =
                      doc.status === "UPLOADED" &&
                      Boolean(doc.originalName) &&
                      Boolean(doc.mimeType);
                    return (
                      <ProRequestDocumentFileCard
                        key={doc.id}
                        title={hasFile ? doc.originalName! : doc.title}
                        status={
                          hasFile ? undefined : (
                            <Chip
                              size="small"
                              label={
                                doc.status === "UPLOADED"
                                  ? "Загружен"
                                  : "Ждём от клиента"
                              }
                              sx={(theme) => ({
                                bgcolor: alpha(theme.palette.success.main, 0.12),
                                fontWeight: 700,
                              })}
                            />
                          )
                        }
                        actions={
                          hasFile ? (
                            <ProRequestDocumentDownload
                              href={`/api/pro/document-requests/${doc.id}/download`}
                              name={doc.originalName!}
                              disabled={props.isBusy}
                            />
                          ) : doc.status === "REQUESTED" ? (
                            <Button
                              color="error"
                              variant="text"
                              loading={pendingAction === `cancel-doc:${doc.id}`}
                              disabled={props.isBusy}
                              onClick={() =>
                                void runPending(`cancel-doc:${doc.id}`, () =>
                                  props.onCancelDocRequest(doc.id),
                                )
                              }
                            >
                              Отмена
                            </Button>
                          ) : null
                        }
                      />
                    );
                  })}
                </>
              ) : null}
              <Button
                variant="text"
                color="inherit"
                disabled={props.isBusy || !props.docRequestsLoaded}
                onClick={() => setDocDialogOpen(true)}
                sx={{
                  width: "fit-content",
                  maxWidth: "100%",
                  alignSelf: "flex-end",
                  color: "text.primary",
                  "&:hover": {
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                  },
                }}
              >
                Запросить документ у клиента
              </Button>
            </Stack>

            {props.docRequests.length > 0 && props.miscFiles.length > 0 ? (
              <Divider />
            ) : null}

            <Stack
              component="section"
              aria-label="Мои документы"
              spacing={1.5}
            >
              {props.miscFiles.length > 0 ? (
                <>
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
                      Мои документы
                    </Typography>
                  </Stack>
                  {props.miscFiles.map((file) => (
                    <ProRequestDocumentFileCard
                      key={file.id}
                      title={file.originalName}
                      actions={
                        <>
                          <ProRequestDocumentDownload
                            href={`/api/pro/contract-files/${file.id}/download`}
                            name={file.originalName}
                            disabled={props.isBusy}
                          />
                          {!isOrderExecutionStatus(props.requestStatus) ? (
                            <ProRequestDocumentDelete
                              name={file.originalName}
                              loading={
                                pendingAction === `delete-misc:${file.id}`
                              }
                              disabled={props.isBusy}
                              onClick={() =>
                                void runPending(`delete-misc:${file.id}`, () =>
                                  props.onDeleteMiscFile(file.id),
                                )
                              }
                            />
                          ) : null}
                        </>
                      }
                    />
                  ))}
                </>
              ) : null}
              <Button
                component="label"
                variant="text"
                color="inherit"
                loading={pendingAction === "upload-misc"}
                disabled={props.isBusy || !props.miscLoaded}
                sx={{
                  width: "fit-content",
                  maxWidth: "100%",
                  alignSelf: "flex-end",
                  color: "text.primary",
                  "&:hover": {
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                  },
                }}
              >
                Загрузить документы
                <input
                  hidden
                  type="file"
                  multiple
                  aria-label="Файлы исполнителя"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => {
                    const next = Array.from(e.currentTarget.files ?? []);
                    e.currentTarget.value = "";
                    if (next.length === 0) return;
                    void runPending("upload-misc", () =>
                      props.onUploadMiscFiles(next),
                    );
                  }}
                />
              </Button>
            </Stack>
          </Stack>
        </Box>
      </DocumentsSectionShell>

      <Dialog
        open={docDialogOpen}
        onClose={() => {
          if (!props.isBusy) setDocDialogOpen(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Запросить документ у клиента</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <Typography
              sx={{
                color: "text.secondary",
              }}
            >
              Например: «Паспорт (скан)», «Доверенность», «Реквизиты».
            </Typography>
            <TextField
              label="Название документа"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              disabled={props.isBusy}
              autoFocus
              slotProps={{ htmlInput: { maxLength: 120 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            disabled={props.isBusy}
            onClick={() => setDocDialogOpen(false)}
          >
            Отмена
          </Button>
          <Button
            variant="contained"
            loading={pendingAction === "create-doc"}
            disabled={props.isBusy || docTitle.trim().length < 3}
            onClick={async () => {
              const title = docTitle.trim();
              if (title.length < 3) return;
              await runPending("create-doc", () =>
                props.onCreateDocRequest(title),
              );
              setDocDialogOpen(false);
              setDocTitle("");
            }}
          >
            Отправить
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={bundleDialogOpen}
        onClose={() => {
          if (!props.isBusy) setBundleDialogOpen(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Загрузить договор</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography
              sx={{
                color: "text.secondary",
              }}
            >
              Загрузите договор в PDF или DOCX. Готовый файл подписи можно
              приложить при наличии.
            </Typography>
            {bundleError ? <Alert severity="error">{bundleError}</Alert> : null}

            <Stack spacing={1}>
              <Typography
                sx={{
                  fontWeight: 700,
                }}
              >
                Договор · обязательно
              </Typography>
              <Button
                component="label"
                variant="outlined"
                disabled={props.isBusy}
                sx={{
                  alignSelf: "flex-start",
                }}
              >
                {bundleDocument ? bundleDocument.name : "Выбрать файл"}
                <input
                  hidden
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  aria-label="Файл договора"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0] ?? null;
                    e.currentTarget.value = "";
                    setBundleDocument(file);
                    setBundleError(null);
                  }}
                />
              </Button>
            </Stack>

            <Stack spacing={1}>
              <Typography
                sx={{
                  fontWeight: 700,
                }}
              >
                Файл подписи · необязательно
              </Typography>
              <Button
                component="label"
                variant="outlined"
                disabled={props.isBusy}
                sx={{
                  alignSelf: "flex-start",
                }}
              >
                {bundleSignature
                  ? bundleSignature.name
                  : "Прикрепить файл подписи"}
                <input
                  hidden
                  type="file"
                  accept=".sig,.sgn,.p7s,application/pgp-signature,application/pkcs7-signature,application/octet-stream"
                  aria-label="Файл подписи"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0] ?? null;
                    e.currentTarget.value = "";
                    setBundleSignature(file);
                  }}
                />
              </Button>
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Уже созданная подпись в формате .sig, .sgn или .p7s.
                Прикрепление файла не подписывает договор на сайте.
              </Typography>
              {bundleSignature ? (
                <Button
                  size="small"
                  disabled={props.isBusy}
                  onClick={() => setBundleSignature(null)}
                  sx={{
                    alignSelf: "flex-start",
                  }}
                >
                  Убрать файл подписи
                </Button>
              ) : null}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            disabled={props.isBusy}
            onClick={() => setBundleDialogOpen(false)}
          >
            Отмена
          </Button>
          <Button
            variant="contained"
            loading={pendingAction === "upload-bundle"}
            disabled={props.isBusy || !bundleDocument}
            onClick={async () => {
              if (!bundleDocument) return;
              setBundleError(null);
              try {
                await runPending("upload-bundle", () =>
                  props.onUploadContractBundle({
                    document: bundleDocument,
                    signature: bundleSignature,
                  }),
                );
                setBundleDialogOpen(false);
                setBundleDocument(null);
                setBundleSignature(null);
              } catch (error) {
                setBundleError(
                  error instanceof Error
                    ? error.message
                    : "Не удалось загрузить договор. Повторите попытку.",
                );
              }
            }}
          >
            Загрузить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
