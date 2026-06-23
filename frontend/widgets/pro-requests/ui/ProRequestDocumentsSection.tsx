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
import { ContractFilesList, isOrderExecutionStatus, RequestDocumentsList } from "@/entities/request";
import type { ProContractFileItem, ProContractFileStatus } from "@/entities/request/api/pro-contract-files";
import Link from "@/shared/ui/Link";
import { DocumentsSectionHeader } from "@/features/documents-security-info";
import { DocumentsSectionShell } from "@/shared/ui/DocumentsSectionShell";

function contractFileStatusLabel(status: ProContractFileStatus) {
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
  contractFilesLoaded: boolean;
  docRequests: RequestDocumentRequestDto[];
  contractFiles: ProContractFileItem[];

  uploadBusy: boolean;
  uploadNames: string[];
  isOptimisticFileId: (id: string) => boolean;

  onCreateDocRequest: (title: string) => Promise<void> | void;
  onCancelDocRequest: (docRequestId: string) => Promise<void> | void;
  onUploadContractFiles: (files: File[]) => Promise<void> | void;
  onDeleteContractFile: (fileId: string) => Promise<void> | void;
};

export function ProRequestDocumentsSection(props: ProRequestDocumentsSectionProps) {
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [docTitle, setDocTitle] = useState("");

  const hasPendingContractFiles = useMemo(() => props.contractFiles.some((f) => f.status === "PENDING_CUSTOMER"), [props.contractFiles]);
  const hasRevisionRequested = useMemo(() => props.contractFiles.some((f) => f.status === "REVISION_REQUESTED"), [props.contractFiles]);
  const hasApproved = useMemo(() => props.contractFiles.some((f) => f.status === "APPROVED"), [props.contractFiles]);
  const hasPendingRequestedDocs = useMemo(() => props.docRequests.some((d) => d.status === "REQUESTED"), [props.docRequests]);
  const hasUploadedDocs = useMemo(() => props.docRequests.some((d) => d.status === "UPLOADED"), [props.docRequests]);

  if (!props.open) return null;

  const headerRight =
    props.contractFiles.length > 0 || props.docRequests.length > 0 ? (
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
      <DocumentsSectionShell headerLeft={<DocumentsSectionHeader />} headerRight={headerRight}>
        {props.docRequests.length === 0 ? <Alert severity="info">Нет запрошенных документов от клиента.</Alert> : null}

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

        {props.contractFiles.length === 0 ? <Alert severity="info">Договор ещё не прикреплён к заявке.</Alert> : null}
        {hasRevisionRequested ? (
          <Alert severity="warning">Клиент запросил доработку по одному или нескольким файлам.</Alert>
        ) : hasPendingContractFiles ? (
          <Alert severity="info">Файлы у клиента. Он может скачать и одобрить договор или отправить на доработку.</Alert>
        ) : hasApproved ? (
          <Alert severity="success">Есть одобренные файлы договора.</Alert>
        ) : null}

        {!props.docRequestsLoaded || !props.contractFilesLoaded ? (
          <Alert
            severity="info"
            icon={<CircularProgress size={16} />}
            sx={{
              "& .MuiAlert-message": { width: "100%" },
              "& .MuiAlert-icon": { alignSelf: "flex-start", mt: "2px" },
            }}
          >
            Загружаем список документов…
          </Alert>
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
              <Typography fontWeight={800}>Идёт загрузка файлов</Typography>
              <LinearProgress />
              {props.uploadNames.length > 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-word" }}>
                  {props.uploadNames.join(", ")}
                </Typography>
              ) : null}
            </Stack>
          </Paper>
        ) : null}

        {props.contractFiles.length > 0 && (
          <Stack spacing={1}>
            <ContractFilesList
              title="Мои документы"
              items={props.contractFiles.map((f) => ({ ...f, optimistic: props.isOptimisticFileId(f.id) }))}
              revisionLabel="Комментарий клиента"
              getStatusLabel={contractFileStatusLabel}
              renderActions={(file) => (
                <>
                  <Button component={Link} href={`/api/pro/contract-files/${file.id}/download`} variant="text" disabled={props.isBusy}>
                    Скачать
                  </Button>
                  {!isOrderExecutionStatus(props.requestStatus) ? (
                    <Button color="error" variant="text" disabled={props.isBusy} onClick={() => void props.onDeleteContractFile(file.id)}>
                      Удалить
                    </Button>
                  ) : null}
                </>
              )}
            />
          </Stack>
        )}
        <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center" useFlexGap>
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
                void props.onUploadContractFiles(next);
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
            <Typography color="text.secondary">Например: «Паспорт (скан)», «Доверенность», «Реквизиты».</Typography>
            <TextField
              label="Название документа"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              disabled={props.isBusy}
              autoFocus
              inputProps={{ maxLength: 120 }}
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
    </>
  );
}
