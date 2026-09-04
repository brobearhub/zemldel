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
import AddIcon from "@mui/icons-material/Add";
import type { RequestDocumentRequestDto, RequestProDto } from "@/entities/request";
import { ContractFilesList, isOrderExecutionStatus, RequestDocumentsList, shouldCollapseDocumentsByDefault } from "@/entities/request";
import type { ProContractBundleItem, ProContractBundleStatus, ProMiscFileItem } from "@/entities/request/api/pro-contract-bundles";
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
  onUploadContractBundle: (input: { document: File; signature: File }) => Promise<void> | void;
  onDeleteContractBundle: (bundleId: string) => Promise<void> | void;
  onUploadMiscFiles: (files: File[]) => Promise<void> | void;
  onDeleteMiscFile: (fileId: string) => Promise<void> | void;
};

export function ProRequestDocumentsSection(props: ProRequestDocumentsSectionProps) {
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [docTitle, setDocTitle] = useState("");

  const [bundleDialogOpen, setBundleDialogOpen] = useState(false);
  const [bundleDocument, setBundleDocument] = useState<File | null>(null);
  const [bundleSignature, setBundleSignature] = useState<File | null>(null);

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
  const hasPendingRequestedDocs = useMemo(() => props.docRequests.some((d) => d.status === "REQUESTED"), [props.docRequests]);
  const hasUploadedDocs = useMemo(() => props.docRequests.some((d) => d.status === "UPLOADED"), [props.docRequests]);

  if (!props.open) return null;

  const collapseByDefault = shouldCollapseDocumentsByDefault(props.requestStatus);

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
        headerRight={headerRight}
        collapsible={collapseByDefault}
        defaultExpanded={!collapseByDefault}
        expandedResetKey={`${props.requestId}:${props.requestStatus}`}
      >
        {props.docRequests.length === 0 ? (
          <DocumentsNeutralAlert>Нет запрошенных документов от клиента.</DocumentsNeutralAlert>
        ) : null}

        {props.docRequests.length > 0 ? (
          <Stack spacing={1}>
            <RequestDocumentsList
              title="Документы клиента"
              items={props.docRequests}
              renderActions={(d) => {
                const hasFile = d.status === "UPLOADED" && Boolean(d.originalName) && Boolean(d.mimeType);
                const canCancel = d.status === "REQUESTED";

                if (!hasFile && !canCancel) return null;

                return (
                  <>
                    {hasFile ? (
                      <Button component={Link} href={`/api/pro/document-requests/${d.id}/download`} variant="text" disabled={props.isBusy}>
                        Скачать
                      </Button>
                    ) : null}
                    {canCancel ? (
                      <Button color="error" variant="text" disabled={props.isBusy} onClick={() => void props.onCancelDocRequest(d.id)}>
                        Отмена
                      </Button>
                    ) : null}
                  </>
                );
              }}
            />
          </Stack>
        ) : null}

        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", mb: 2 }}>
          <Button
            color="warning"
            variant="text"
            startIcon={<AddIcon />}
            disabled={props.isBusy}
            onClick={() => setDocDialogOpen(true)}
            sx={{ alignSelf: "flex-start", fontWeight: 900 }}
          >
            Запросить документ у клиента
          </Button>
        </Box>

        {props.contractBundles.length === 0 ? (
          <DocumentsNeutralAlert>Договор ещё не прикреплён к заявке.</DocumentsNeutralAlert>
        ) : null}
        {hasRevisionRequested ? (
          <Alert severity="warning">Клиент запросил доработку по одному или нескольким файлам.</Alert>
        ) : hasPendingContractFiles ? (
          <DocumentsNeutralAlert>
            Файлы у клиента. Он может скачать и одобрить договор или отправить на доработку.
          </DocumentsNeutralAlert>
        ) : hasApproved ? (
          <Alert severity="success">Есть одобренные файлы договора.</Alert>
        ) : null}

        {!props.docRequestsLoaded || !props.contractBundlesLoaded || !props.miscLoaded ? (
          <DocumentsNeutralAlert
            icon={<CircularProgress size={16} />}
            sx={{
              "& .MuiAlert-message": { width: "100%" },
              "& .MuiAlert-icon": { alignSelf: "flex-start", mt: "2px" },
            }}
          >
            Загружаем список документов…
          </DocumentsNeutralAlert>
        ) : null}

        {props.uploadBusy ? (
          <Paper
            variant="outlined"
            sx={(theme) => ({
              p: 1.5,
              bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "action.hover",
              borderColor: "divider",
            })}
          >
            <Stack spacing={1}>
              <Typography sx={{
                fontWeight: 800
              }}>Идёт загрузка файлов</Typography>
              <LinearProgress />
              {props.uploadNames.length > 0 ? (
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    wordBreak: "break-word"
                  }}>
                  {props.uploadNames.join(", ")}
                </Typography>
              ) : null}
            </Stack>
          </Paper>
        ) : null}

        {props.contractBundles.length > 0 ? (
          <Stack spacing={1}>
            <ContractFilesList
              title="Договор"
              actionsPlacement="below"
              showDocumentIcon
              items={props.contractBundles.map((b) => ({
                id: b.bundleId,
                status: b.status,
                originalName: b.document.originalName,
                revisionMessage: b.revisionMessage,
              }))}
              revisionLabel="Комментарий клиента"
              getStatusLabel={contractFileStatusLabel}
              renderActions={(item) => {
                const bundle = props.contractBundles.find((b) => b.bundleId === item.id);
                if (!bundle) return null;
                return (
                  <>
                    <Button component={Link} href={`/api/pro/contract-files/${bundle.document.id}/download`} variant="text" disabled={props.isBusy}>
                      Скачать договор
                    </Button>
                    {bundle.signature ? (
                      <Button component={Link} href={`/api/pro/contract-files/${bundle.signature.id}/download`} variant="text" disabled={props.isBusy}>
                        Скачать подпись
                      </Button>
                    ) : (
                      <Typography
                        variant="body2"
                        sx={{
                          color: "warning.main",
                          px: 1
                        }}>
                        Подпись (.sig) не прикреплена
                      </Typography>
                    )}
                    {!isOrderExecutionStatus(props.requestStatus) ? (
                      <Button color="error" variant="text" disabled={props.isBusy} onClick={() => void props.onDeleteContractBundle(bundle.bundleId)}>
                        Удалить пакет
                      </Button>
                    ) : null}
                  </>
                );
              }}
            />
          </Stack>
        ) : null}

        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            flexWrap: "wrap",
            justifyContent: "center"
          }}>
          <Button
            variant="text"
            color="warning"
            disabled={props.isBusy}
            startIcon={props.uploadBusy ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
            onClick={() => {
              setBundleDocument(null);
              setBundleSignature(null);
              setBundleDialogOpen(true);
            }}
          >
            {props.uploadBusy ? "Загрузка…" : "Загрузить договор"}
          </Button>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {props.miscFiles.length > 0 ? (
          <Stack spacing={1}>
            <ContractFilesList
              title="Мои документы"
              actionsPlacement="below"
              items={props.miscFiles.map((f) => ({
                id: f.id,
                status: f.status,
                originalName: f.originalName,
                revisionMessage: null,
              }))}
              getStatusLabel={() => "Вложение"}
              renderActions={(file) => (
                <>
                  <Button component={Link} href={`/api/pro/contract-files/${file.id}/download`} variant="text" disabled={props.isBusy}>
                    Скачать
                  </Button>
                  {!isOrderExecutionStatus(props.requestStatus) ? (
                    <Button color="error" variant="text" disabled={props.isBusy} onClick={() => void props.onDeleteMiscFile(file.id)}>
                      Удалить
                    </Button>
                  ) : null}
                </>
              )}
            />
          </Stack>
        ) : (
          <DocumentsNeutralAlert>Нет ваших вложений.</DocumentsNeutralAlert>
        )}

        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            flexWrap: "wrap",
            justifyContent: "center"
          }}>
          <Button
            component="label"
            variant="text"
            color="warning"
            disabled={props.isBusy}
            startIcon={props.uploadBusy ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
          >
            {props.uploadBusy ? "Загрузка…" : "Загрузить документы"}
            <input
              hidden
              type="file"
              multiple
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => {
                const next = Array.from(e.currentTarget.files ?? []);
                e.currentTarget.value = "";
                void props.onUploadMiscFiles(next);
              }}
            />
          </Button>
        </Stack>
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
            <Typography sx={{
              color: "text.secondary"
            }}>Например: «Паспорт (скан)», «Доверенность», «Реквизиты».</Typography>
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
          <Button disabled={props.isBusy} onClick={() => setDocDialogOpen(false)}>
            Отмена
          </Button>
          <Button
            variant="contained"
            disabled={props.isBusy || docTitle.trim().length < 3}
            onClick={async () => {
              const title = docTitle.trim();
              if (title.length < 3) return;
              await props.onCreateDocRequest(title);
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
            <Typography sx={{
              color: "text.secondary"
            }}>
              Прикрепите файл договора и файл подписи <b>.sig</b>, <b>.sgn</b> или <b>.p7s</b>.
            </Typography>

            <Stack spacing={1}>
              <Typography sx={{
                fontWeight: 800
              }}>Договор</Typography>
              <Button component="label" variant="outlined" disabled={props.isBusy} sx={{ alignSelf: "flex-start" }}>
                {bundleDocument ? bundleDocument.name : "Выбрать файл"}
                <input
                  hidden
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0] ?? null;
                    e.currentTarget.value = "";
                    setBundleDocument(file);
                  }}
                />
              </Button>
            </Stack>

            <Stack spacing={1}>
              <Typography sx={{
                fontWeight: 800
              }}>Подпись</Typography>
              <Button component="label" variant="outlined" disabled={props.isBusy} sx={{ alignSelf: "flex-start" }}>
                {bundleSignature ? bundleSignature.name : "Выбрать файл подписи"}
                <input
                  hidden
                  type="file"
                  accept=".sig,.sgn,.p7s,application/pgp-signature,application/pkcs7-signature,application/octet-stream"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0] ?? null;
                    e.currentTarget.value = "";
                    setBundleSignature(file);
                  }}
                />
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={props.isBusy} onClick={() => setBundleDialogOpen(false)}>
            Отмена
          </Button>
          <Button
            variant="contained"
            disabled={props.isBusy || !bundleDocument || !bundleSignature}
            onClick={async () => {
              if (!bundleDocument || !bundleSignature) return;
              await props.onUploadContractBundle({ document: bundleDocument, signature: bundleSignature });
              setBundleDialogOpen(false);
              setBundleDocument(null);
              setBundleSignature(null);
            }}
          >
            Загрузить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
