"use client";

import { useRef, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { formatRequestDate, type WorkStageDto } from "@/entities/request";
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
import { hasStageAttachments, hasStageExpandableContent } from "../lib/has-stage-attachments";
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
          Прогресс
        </Typography>
      }
      headerRight={
        canMutate ? (
          <Button
            size="small"
            variant="text"
            disabled={isBusy}
            startIcon={createOpen ? undefined : <AddIcon fontSize="small" />}
            onClick={() => setCreateOpen((v) => !v)}
            sx={{
              minWidth: 0,
              px: 1,
              lineHeight: 1.2,
              alignItems: "center",
              "& .MuiButton-startIcon": {
                marginRight: 0.5,
                marginLeft: 0,
                display: "inline-flex",
                alignItems: "center",
                // Why: глиф Add визуально ниже капители текста — поднимаем на 1px.
                transform: "translateY(-1px)",
              },
            }}
          >
            {createOpen ? "Скрыть" : "Этап"}
          </Button>
        ) : null
      }
      collapsible
      defaultExpanded
      collapseAriaLabel={{ expanded: "Свернуть этапы", collapsed: "Развернуть этапы" }}
    >
      <Stack spacing={0.5}>
        {createOpen && canMutate ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "7fr 3fr" },
              gap: 1.25,
              p: 1.5,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              bgcolor: "common.white",
              // Why: форма белая, а поля оставляем с прежним glass-фоном секции.
              "& .MuiOutlinedInput-root": {
                backgroundImage: (theme) => theme.custom.gradients.glass,
              },
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1.25,
                minWidth: 0,
                minHeight: 0,
              }}
            >
              <TextField
                label="Название"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isBusy}
                size="small"
              />
              <Box
                sx={{
                  // Why: на md занимаем остаток высоты колонки и вписываем textarea в абсолютный слот —
                  // иначе MUI TextField с minRows не растягивается flex'ом.
                  position: { md: "relative" },
                  flex: { md: 1 },
                  minHeight: { xs: 64, md: 0 },
                }}
              >
                <TextField
                  label="Описание"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isBusy}
                  size="small"
                  multiline
                  minRows={2}
                  fullWidth
                  sx={{
                    height: { md: "100%" },
                    position: { md: "absolute" },
                    inset: { md: 0 },
                    "& .MuiInputBase-root": {
                      height: { md: "100%" },
                      alignItems: { md: "stretch" },
                    },
                    "& textarea": {
                      height: { md: "100% !important" },
                      overflow: { md: "auto !important" },
                    },
                  }}
                />
              </Box>
            </Box>
            <Stack spacing={1.25} sx={{ minWidth: 0 }}>
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
                variant="outlined"
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
              <Button
                variant="contained"
                disabled={isBusy || title.trim().length < 1}
                onClick={() =>
                  void withBusy(async () => {
                    // Why: create → publish — заказчик сразу видит этап без отдельного шага.
                    const stage = await createProWorkStage(props.requestId, {
                      title: title.trim(),
                      description: description.trim(),
                      statusKey,
                    });
                    await publishProWorkStage(props.requestId, stage.id);
                    setTitle("");
                    setDescription("");
                    setCreateOpen(false);
                  })
                }
              >
                Опубликовать
              </Button>
            </Stack>
          </Box>
        ) : null}

        {props.stages.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {props.mode === "provider"
              ? "Этапов пока нет. Добавьте первый этап выполнения работ."
              : "Исполнитель пока не опубликовал этапы."}
          </Typography>
        ) : (
          props.stages.map((stage, index) => (
            <StageCard
              key={stage.id}
              stage={stage}
              order={index + 1}
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
  order: number;
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
  const [expanded, setExpanded] = useState(false);
  const [editTitle, setEditTitle] = useState(stage.title);
  const [editDescription, setEditDescription] = useState(stage.description);
  const stageDate = formatRequestDate(stage.publishedAt ?? stage.createdAt);
  // Why: порядковый номер в UI — по позиции в уже отсортированном списке, не из БД.
  const stageLabel = `${props.order}. ${stage.title}`;
  const isProvider = props.mode === "provider";
  // Why: у customer не показываем пустые секции («Нет файлов» / «Запросов нет»).
  const showExecutorFiles = isProvider || stage.files.length > 0;
  const showClientDocs = isProvider || stage.docSlots.length > 0;
  const showAttachmentsArea = isProvider || hasStageAttachments(stage);
  // Why: provider всегда может раскрыть (статус/файлы); customer — только если есть контент.
  const canExpand = isProvider || hasStageExpandableContent(stage);
  const isExpanded = canExpand && expanded;

  return (
    <Box
      sx={{
        px: 2,
        py: 1.25,
        borderRadius: 1,
        bgcolor: isExpanded ? "action.hover" : "transparent",
      }}
    >
      <Stack spacing={1}>
        <Box
          role={canExpand ? "button" : undefined}
          tabIndex={canExpand ? 0 : undefined}
          onClick={canExpand ? () => setExpanded((value) => !value) : undefined}
          onKeyDown={
            canExpand
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpanded((value) => !value);
                  }
                }
              : undefined
          }
          sx={{ cursor: canExpand ? "pointer" : "default", outline: "none" }}
        >
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" useFlexGap>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flex: 1 }} flexWrap="wrap" useFlexGap>
              <Typography fontWeight={600} noWrap sx={{ maxWidth: { xs: "100%", sm: 280 } }}>
                {stageLabel}
              </Typography>
              {isDraft ? <Chip size="small" label="Черновик" color="warning" /> : null}
              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                {stageDate}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.25} alignItems="center" sx={{ flexShrink: 0 }}>
              {canExpand ? (
                <IconButton
                  size="small"
                  aria-label={isExpanded ? "Свернуть этап" : "Развернуть этап"}
                  aria-expanded={isExpanded}
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded((value) => !value);
                  }}
                >
                  {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </IconButton>
              ) : null}
              <Typography variant="body2" color="primary" fontWeight={700} sx={{ whiteSpace: "nowrap" }}>
                {stage.statusLabel}
              </Typography>
            </Stack>
          </Stack>
        </Box>

        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Stack spacing={1.25} sx={{ pt: 0.5 }}>
            {!(props.mode === "provider" && isDraft && props.canMutate) &&
            stage.description.trim().length > 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                {stage.description}
              </Typography>
            ) : null}

            {props.mode === "provider" ? (
              <FormControl
                size="small"
                sx={{ minWidth: 220, alignSelf: "flex-start" }}
                disabled={!props.canMutate || props.isBusy}
                onClick={(e) => e.stopPropagation()}
              >
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
            ) : null}

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
            ) : null}

            {showAttachmentsArea ? (
              <>
                {showExecutorFiles ? (
                  <>
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
                                isProvider
                                  ? `/api/pro/requests/${props.requestId}/work-stages/${stage.id}/files/${file.id}/download`
                                  : `/api/requests/${props.requestId}/work-stages/${stage.id}/files/${file.id}/download`
                              }
                              underline="hover"
                            >
                              {file.originalName}
                            </Link>
                            {isProvider && props.canMutate ? (
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
                    {isProvider && props.canMutate ? (
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
                        <Button size="small" variant="text" disabled={props.isBusy} onClick={props.onPickFile}>
                          Прикрепить файл
                        </Button>
                      </>
                    ) : null}
                  </>
                ) : null}

                {showClientDocs ? (
                  <>
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
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                              justifyContent="space-between"
                              useFlexGap
                            >
                              <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                                flexWrap="wrap"
                                useFlexGap
                                sx={{ minWidth: 0 }}
                              >
                                <Typography variant="body2" fontWeight={600}>
                                  {slot.title}
                                </Typography>
                                <Chip
                                  size="small"
                                  label={slot.status === "UPLOADED" ? "Загружено" : "Ожидает"}
                                  color={slot.status === "UPLOADED" ? "success" : "default"}
                                />
                              </Stack>
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
                                        await uploadCustomerWorkStageDocSlot(
                                          props.requestId,
                                          stage.id,
                                          slot.id,
                                          file,
                                        );
                                      });
                                    }}
                                  />
                                  <Button
                                    size="small"
                                    variant="contained"
                                    disabled={props.isBusy || props.requestStatus !== "ACTIVE"}
                                    onClick={() => props.onPickSlotFile(slot.id)}
                                    sx={{ flexShrink: 0 }}
                                  >
                                    Загрузить файл
                                  </Button>
                                </>
                              ) : null}
                              {isProvider && props.canMutate && slot.status === "REQUESTED" ? (
                                <Button
                                  size="small"
                                  color="error"
                                  disabled={props.isBusy}
                                  onClick={() =>
                                    props.onAction(async () => {
                                      await deleteProWorkStageDocSlot(props.requestId, stage.id, slot.id);
                                    })
                                  }
                                  sx={{ flexShrink: 0 }}
                                >
                                  Отменить запрос
                                </Button>
                              ) : null}
                            </Stack>
                            {slot.status === "UPLOADED" && slot.originalName ? (
                              <Link
                                href={
                                  isProvider
                                    ? `/api/pro/requests/${props.requestId}/work-stages/${stage.id}/doc-slots/${slot.id}/download`
                                    : `/api/requests/${props.requestId}/work-stages/${stage.id}/doc-slots/${slot.id}/download`
                                }
                                underline="hover"
                              >
                                {slot.originalName}
                              </Link>
                            ) : null}
                          </Stack>
                        ))}
                      </Stack>
                    )}
                  </>
                ) : null}

                {isProvider && props.canMutate ? (
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
              </>
            ) : null}
          </Stack>
        </Collapse>
      </Stack>
    </Box>
  );
}
