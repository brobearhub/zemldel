"use client";

import { ProviderDocumentPicker } from "@/features/provider-documents/ui/ProviderDocumentPicker";
import type { ProviderDocument } from "@/entities/provider-document/api/documents";
import type { ContractBundleUpload } from "@/entities/request/api/pro-contract-bundles";
import { REQUEST_DOCUMENT_INPUT_ACCEPT } from "@/entities/request/lib/request-document-upload";

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
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { ProRequestMiscUploadDialog } from "./ProRequestMiscUploadDialog";
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
import { ConfirmDialog } from "@/shared/ui/confirm/ConfirmDialog";

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
  onUploadContractBundle: (input: ContractBundleUpload) => Promise<void> | void;
  onDeleteContractBundle: (bundleId: string) => Promise<void> | void;
  onUploadMiscFiles: (
    files: File[],
    visibleToCustomer: boolean,
    sourceDocuments?: ProviderDocument[],
  ) => Promise<void> | void;
  onDeleteMiscFile: (fileId: string) => Promise<void> | void;
  onSetMiscFileVisibility: (
    fileId: string,
    visibleToCustomer: boolean,
  ) => Promise<void> | void;
};

export function ProRequestDocumentsSection(
  props: ProRequestDocumentsSectionProps,
) {
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [miscDialogOpen, setMiscDialogOpen] = useState(false);
  const [docTitle, setDocTitle] = useState("");

  const [bundlePickerOpen, setBundlePickerOpen] = useState(false);
  const [sourceDocument, setSourceDocument] = useState<ProviderDocument | null>(
    null,
  );
  const [bundleDialogOpen, setBundleDialogOpen] = useState(false);
  const [bundleError, setBundleError] = useState<string | null>(null);
  const [bundleDocument, setBundleDocument] = useState<File | null>(null);
  const [bundleSignature, setBundleSignature] = useState<File | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  const [visibilityConfirmation, setVisibilityConfirmation] = useState<{
    fileId: string;
    fileName: string;
    visibleToCustomer: boolean;
  } | null>(null);

  async function runPending(action: string, fn: () => Promise<void> | void) {
    setPendingAction(action);
    try {
      await fn();
    } finally {
      setPendingAction(null);
    }
  }

  async function confirmMiscVisibility() {
    if (!visibilityConfirmation || props.isBusy || pendingAction !== null)
      return;
    const { fileId, visibleToCustomer } = visibilityConfirmation;
    setVisibilityConfirmation(null);
    setVisibilityError(null);
    try {
      await runPending(`visibility:${fileId}`, () =>
        props.onSetMiscFileVisibility(fileId, visibleToCustomer),
      );
    } catch (error) {
      setVisibilityError(
        error instanceof Error
          ? error.message
          : "Не удалось изменить видимость файла.",
      );
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
            sx={{
              p: { xs: 2.5, tablet: 3 },
              minWidth: 0,
              borderRadius: 1.5,
              bgcolor: "background.secondary",
            }}
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
                              () =>
                                props.onDeleteContractBundle(bundle.bundleId),
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
                      minWidth: 0,
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
                color={
                  props.contractBundles.length > 0 ? "primary" : "secondary"
                }
                disabled={props.isBusy || !props.contractBundlesLoaded}
                onClick={() => {
                  setBundleDocument(null);
                  setSourceDocument(null);
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
                                bgcolor: alpha(
                                  theme.palette.success.main,
                                  0.12,
                                ),
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
                          <Tooltip
                            title={
                              file.visibleToCustomer
                                ? "Скрыть от клиента"
                                : "Показать клиенту"
                            }
                          >
                            <Button
                              variant="text"
                              aria-label={
                                file.visibleToCustomer
                                  ? `Скрыть ${file.originalName} от клиента`
                                  : `Показать ${file.originalName} клиенту`
                              }
                              aria-pressed={file.visibleToCustomer}
                              disabled={props.isBusy || pendingAction !== null}
                              loading={
                                pendingAction === `visibility:${file.id}`
                              }
                              onClick={() =>
                                setVisibilityConfirmation({
                                  fileId: file.id,
                                  fileName: file.originalName,
                                  visibleToCustomer: !file.visibleToCustomer,
                                })
                              }
                              sx={{
                                minWidth: 40,
                                width: 40,
                                minHeight: 40,
                                p: 1,
                                borderRadius: "50%",
                                color: file.visibleToCustomer
                                  ? "text.primary"
                                  : "text.secondary",
                              }}
                            >
                              {file.visibleToCustomer ? (
                                <VisibilityOutlinedIcon fontSize="small" />
                              ) : (
                                <VisibilityOffOutlinedIcon fontSize="small" />
                              )}
                            </Button>
                          </Tooltip>
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
                variant="text"
                color="inherit"
                disabled={props.isBusy || !props.miscLoaded}
                onClick={() => setMiscDialogOpen(true)}
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
              </Button>
              {visibilityError ? (
                <Alert severity="error">{visibilityError}</Alert>
              ) : null}
            </Stack>
          </Stack>
        </Box>
      </DocumentsSectionShell>

      {visibilityConfirmation ? (
        <ConfirmDialog
          open
          title={
            visibilityConfirmation.visibleToCustomer
              ? "Показать файл клиенту?"
              : "Скрыть файл от клиента?"
          }
          description={
            visibilityConfirmation.visibleToCustomer
              ? `Вы уверены, что хотите показать файл «${visibilityConfirmation.fileName}» клиенту? Клиент сможет увидеть и скачать его в документах заявки.`
              : `Вы уверены, что хотите скрыть файл «${visibilityConfirmation.fileName}» от клиента? Клиент больше не будет видеть его в документах заявки.`
          }
          confirmText={
            visibilityConfirmation.visibleToCustomer ? "Показать" : "Скрыть"
          }
          confirmDisabled={props.isBusy || pendingAction !== null}
          onCancel={() => setVisibilityConfirmation(null)}
          onConfirm={() => void confirmMiscVisibility()}
        />
      ) : null}

      {miscDialogOpen ? (
        <ProRequestMiscUploadDialog
          isBusy={props.isBusy}
          onClose={() => setMiscDialogOpen(false)}
          onUpload={props.onUploadMiscFiles}
        />
      ) : null}

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
              Выберите договор в Word, Excel, PDF или фотографию. Готовый файл
              подписи можно приложить при наличии.
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
                {bundleDocument
                  ? bundleDocument.name
                  : "Выбрать файл с компьютера"}
                <input
                  hidden
                  type="file"
                  accept={REQUEST_DOCUMENT_INPUT_ACCEPT}
                  aria-label="Файл договора"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0] ?? null;
                    e.currentTarget.value = "";
                    setBundleDocument(file);
                    setSourceDocument(null);
                    setBundleError(null);
                  }}
                />
              </Button>
              <Button
                variant="outlined"
                disabled={props.isBusy || pendingAction !== null}
                onClick={() => setBundlePickerOpen(true)}
                sx={{ alignSelf: "flex-start" }}
              >
                Выбрать из «Моих документов»
              </Button>
              {sourceDocument ? (
                <Typography
                  variant="body2"
                  sx={{ overflowWrap: "anywhere" }}
                >
                  {sourceDocument.originalName}
                </Typography>
              ) : null}
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
            disabled={
              props.isBusy ||
              pendingAction !== null ||
              (!bundleDocument && !sourceDocument)
            }
            onClick={async () => {
              if (
                pendingAction !== null ||
                (!bundleDocument && !sourceDocument)
              )
                return;
              setBundleError(null);
              try {
                await runPending("upload-bundle", () =>
                  props.onUploadContractBundle({
                    document: bundleDocument,
                    ...(sourceDocument ? { sourceDocument } : {}),
                    signature: bundleSignature,
                  }),
                );
                setBundleDialogOpen(false);
                setBundleDocument(null);
                setSourceDocument(null);
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
      {bundlePickerOpen ? (
        <ProviderDocumentPicker
          onClose={() => setBundlePickerOpen(false)}
          onSelect={(files) => {
            setSourceDocument(files[0]);
            setBundleDocument(null);
            setBundlePickerOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
