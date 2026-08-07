"use client";

import { useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { WorkStageDto } from "@/entities/request";
import {
  createProWorkStage,
  createProWorkStageDocSlot,
  deleteProWorkStage,
  deleteProWorkStageDocSlot,
  deleteProWorkStageFile,
  publishProWorkStage,
  updateProWorkStage,
  updateProWorkStageStatus,
  uploadCustomerWorkStageDocSlot,
  uploadProWorkStageFile,
} from "@/entities/request/api/request-work-stages";
import { DocumentsSectionShell } from "@/shared/ui/DocumentsSectionShell";
import type { RequestWorkProgressProps } from "../model/types";

const ACCEPT =
  ".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp";

export function RequestWorkProgress(props: RequestWorkProgressProps) {
  const canMutate = props.mode === "provider" && props.requestStatus === "ACTIVE";
  const visible =
    props.requestStatus === "ACTIVE" ||
    props.requestStatus === "ACCEPTANCE_PENDING" ||
    props.requestStatus === "ACCEPTED" ||
    props.requestStatus === "COMPLETED";

  const [localBusy, setLocalBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [statusKey, setStatusKey] = useState(props.statusOptions[0]?.key ?? "AWAITING_RESPONSE");
  const [createOpen, setCreateOpen] = useState(false);
  const [slotTitles, setSlotTitles] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const slotInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  if (!visible) return null;

  const isBusy = Boolean(props.busy) || localBusy;

  async function withBusy(fn: () => Promise<void>) {
    setLocalBusy(true);
    try {
      await fn();
      await props.onRefresh();
    } catch (e) {
      props.onError?.(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLocalBusy(false);
    }
  }

  return (
    <DocumentsSectionShell
      headerLeft={
        <Typography variant="h6" fontWeight={800}>
          Ход выполнения работ
        </Typography>
      }
      headerRight={
        canMutate ? (
          <Button size="small" variant="outlined" disabled={isBusy} onClick={() => setCreateOpen((v) => !v)}>
            {createOpen ? "Скрыть" : "Добавить этап"}
          </Button>
        ) : null
      }
      collapsible
      defaultExpanded
      collapseAriaLabel={{ expanded: "Свернуть этапы", collapsed: "Развернуть этапы" }}
    >
      <Stack spacing={2}>
        {createOpen && canMutate ? (
          <Stack spacing={1.25} sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
            <TextField
              label="Название"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isBusy}
              size="small"
            />
            <TextField
              label="Описание"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isBusy}
              size="small"
              multiline
              minRows={2}
            />
            <FormControl size="small" fullWidth>
              <InputLabel id="new-stage-status">Статус</InputLabel>
              <Select
                labelId="new-stage-status"
                label="Статус"
                value={statusKey}
                onChange={(e) => setStatusKey(String(e.target.value))}
                disabled={isBusy}
              >
                {props.statusOptions.map((opt) => (
                  <MenuItem key={opt.key} value={opt.key}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              disabled={isBusy || title.trim().length < 1}
              onClick={() =>
                void withBusy(async () => {
                  await createProWorkStage(props.requestId, {
                    title: title.trim(),
                    description: description.trim(),
                    statusKey,
                  });
                  setTitle("");
                  setDescription("");
                  setCreateOpen(false);
                })
              }
            >
              Создать черновик
            </Button>
          </Stack>
        ) : null}

        {props.stages.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {props.mode === "provider"
              ? "Этапов пока нет. Добавьте первый этап выполнения работ."
              : "Исполнитель пока не опубликовал этапы."}
          </Typography>
        ) : (
          props.stages.map((stage) => (
            <StageCard
              key={stage.id}
              stage={stage}
              mode={props.mode}
              canMutate={canMutate}
              isBusy={isBusy}
              requestStatus={props.requestStatus}
              statusOptions={props.statusOptions}
              requestId={props.requestId}
              slotTitle={slotTitles[stage.id] ?? ""}
              onSlotTitleChange={(value) => setSlotTitles((prev) => ({ ...prev, [stage.id]: value }))}
              fileInputRef={(el) => {
                fileInputRefs.current[stage.id] = el;
              }}
              slotInputRef={(el) => {
                slotInputRefs.current[stage.id] = el;
              }}
              onPickFile={() => fileInputRefs.current[stage.id]?.click()}
              onPickSlotFile={(slotId) => slotInputRefs.current[`${stage.id}:${slotId}`]?.click()}
              slotFileInputRef={(slotId, el) => {
                slotInputRefs.current[`${stage.id}:${slotId}`] = el;
              }}
              onAction={(fn) => void withBusy(fn)}
            />
          ))
        )}
      </Stack>
    </DocumentsSectionShell>
  );
}

function StageCard(props: {
  stage: WorkStageDto;
  mode: "provider" | "customer";
  canMutate: boolean;
  isBusy: boolean;
  requestStatus: string;
  statusOptions: RequestWorkProgressProps["statusOptions"];
  requestId: string;
  slotTitle: string;
  onSlotTitleChange: (value: string) => void;
  fileInputRef: (el: HTMLInputElement | null) => void;
  slotInputRef: (el: HTMLInputElement | null) => void;
  slotFileInputRef: (slotId: string, el: HTMLInputElement | null) => void;
  onPickFile: () => void;
  onPickSlotFile: (slotId: string) => void;
  onAction: (fn: () => Promise<void>) => void;
}) {
  const { stage } = props;
  const isDraft = stage.lifecycle === "DRAFT";
  const [editTitle, setEditTitle] = useState(stage.title);
  const [editDescription, setEditDescription] = useState(stage.description);

  return (
    <Box sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
      <Stack spacing={1.25}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography fontWeight={800}>{stage.title}</Typography>
            {isDraft ? <Chip size="small" label="Черновик" color="warning" /> : null}
          </Stack>
          {props.mode === "provider" ? (
            <FormControl size="small" sx={{ minWidth: 220 }} disabled={!props.canMutate || props.isBusy}>
              <InputLabel id={`status-${stage.id}`}>Статус</InputLabel>
              <Select
                labelId={`status-${stage.id}`}
                label="Статус"
                value={stage.statusKey}
                onChange={(e) =>
                  props.onAction(async () => {
                    await updateProWorkStageStatus(props.requestId, stage.id, String(e.target.value));
                  })
                }
              >
                {props.statusOptions.map((opt) => (
                  <MenuItem key={opt.key} value={opt.key}>
                    {opt.label}
                  </MenuItem>
                ))}
                {!props.statusOptions.some((o) => o.key === stage.statusKey) ? (
                  <MenuItem value={stage.statusKey}>{stage.statusLabel}</MenuItem>
                ) : null}
              </Select>
            </FormControl>
          ) : (
            <Chip size="small" label={stage.statusLabel} color="success" />
          )}
        </Stack>

        {props.mode === "provider" && isDraft && props.canMutate ? (
          <>
            <TextField
              label="Название"
              size="small"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              disabled={props.isBusy}
            />
            <TextField
              label="Описание"
              size="small"
              multiline
              minRows={2}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              disabled={props.isBusy}
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                size="small"
                variant="outlined"
                disabled={props.isBusy}
                onClick={() =>
                  props.onAction(async () => {
                    await updateProWorkStage(props.requestId, stage.id, {
                      title: editTitle.trim(),
                      description: editDescription.trim(),
                    });
                  })
                }
              >
                Сохранить
              </Button>
              <Button
                size="small"
                variant="contained"
                disabled={props.isBusy}
                onClick={() =>
                  props.onAction(async () => {
                    await publishProWorkStage(props.requestId, stage.id);
                  })
                }
              >
                Опубликовать
              </Button>
              <Button
                size="small"
                color="error"
                disabled={props.isBusy}
                onClick={() =>
                  props.onAction(async () => {
                    await deleteProWorkStage(props.requestId, stage.id);
                  })
                }
              >
                Удалить
              </Button>
            </Stack>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
            {stage.description || "Без описания"}
          </Typography>
        )}

        <Divider />

        <Typography variant="subtitle2" fontWeight={700}>
          Файлы исполнителя
        </Typography>
        {stage.files.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Нет файлов
          </Typography>
        ) : (
          <Stack spacing={0.5}>
            {stage.files.map((file) => (
              <Stack key={file.id} direction="row" spacing={1} alignItems="center">
                <Link
                  href={
                    props.mode === "provider"
                      ? `/api/pro/requests/${props.requestId}/work-stages/${stage.id}/files/${file.id}/download`
                      : `/api/requests/${props.requestId}/work-stages/${stage.id}/files/${file.id}/download`
                  }
                  underline="hover"
                >
                  {file.originalName}
                </Link>
                {props.mode === "provider" && props.canMutate ? (
                  <Button
                    size="small"
                    color="error"
                    disabled={props.isBusy}
                    onClick={() =>
                      props.onAction(async () => {
                        await deleteProWorkStageFile(props.requestId, stage.id, file.id);
                      })
                    }
                  >
                    Удалить
                  </Button>
                ) : null}
              </Stack>
            ))}
          </Stack>
        )}
        {props.mode === "provider" && props.canMutate ? (
          <>
            <input
              ref={props.fileInputRef}
              type="file"
              accept={ACCEPT}
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                props.onAction(async () => {
                  await uploadProWorkStageFile(props.requestId, stage.id, file);
                });
              }}
            />
            <Button size="small" variant="outlined" disabled={props.isBusy} onClick={props.onPickFile}>
              Прикрепить файл
            </Button>
          </>
        ) : null}

        <Divider />

        <Typography variant="subtitle2" fontWeight={700}>
          Документы от клиента
        </Typography>
        {stage.docSlots.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Запросов нет
          </Typography>
        ) : (
          <Stack spacing={1}>
            {stage.docSlots.map((slot) => (
              <Stack key={slot.id} spacing={0.5}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="body2" fontWeight={600}>
                    {slot.title}
                  </Typography>
                  <Chip
                    size="small"
                    label={slot.status === "UPLOADED" ? "Загружено" : "Ожидает"}
                    color={slot.status === "UPLOADED" ? "success" : "default"}
                  />
                </Stack>
                {slot.status === "UPLOADED" && slot.originalName ? (
                  <Link
                    href={
                      props.mode === "provider"
                        ? `/api/pro/requests/${props.requestId}/work-stages/${stage.id}/doc-slots/${slot.id}/download`
                        : `/api/requests/${props.requestId}/work-stages/${stage.id}/doc-slots/${slot.id}/download`
                    }
                    underline="hover"
                  >
                    {slot.originalName}
                  </Link>
                ) : null}
                {props.mode === "customer" && slot.status === "REQUESTED" ? (
                  <>
                    <input
                      ref={(el) => props.slotFileInputRef(slot.id, el)}
                      type="file"
                      accept={ACCEPT}
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (!file) return;
                        props.onAction(async () => {
                          await uploadCustomerWorkStageDocSlot(props.requestId, stage.id, slot.id, file);
                        });
                      }}
                    />
                    <Button
                      size="small"
                      variant="contained"
                      disabled={props.isBusy || props.requestStatus !== "ACTIVE"}
                      onClick={() => props.onPickSlotFile(slot.id)}
                    >
                      Загрузить файл
                    </Button>
                  </>
                ) : null}
                {props.mode === "provider" && props.canMutate && slot.status === "REQUESTED" ? (
                  <Button
                    size="small"
                    color="error"
                    disabled={props.isBusy}
                    onClick={() =>
                      props.onAction(async () => {
                        await deleteProWorkStageDocSlot(props.requestId, stage.id, slot.id);
                      })
                    }
                  >
                    Отменить запрос
                  </Button>
                ) : null}
              </Stack>
            ))}
          </Stack>
        )}

        {props.mode === "provider" && props.canMutate ? (
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              size="small"
              label="Запросить документ"
              value={props.slotTitle}
              onChange={(e) => props.onSlotTitleChange(e.target.value)}
              disabled={props.isBusy}
            />
            <Button
              size="small"
              variant="outlined"
              disabled={props.isBusy || props.slotTitle.trim().length < 3}
              onClick={() =>
                props.onAction(async () => {
                  await createProWorkStageDocSlot(props.requestId, stage.id, props.slotTitle.trim());
                  props.onSlotTitleChange("");
                })
              }
            >
              Запросить
            </Button>
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
}
