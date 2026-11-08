"use client";

import { useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Button,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { TeamTask, TasksWorkspaceData } from "./model";
import { requestLabel } from "./model";
import { actionSx, panelSx } from "./styles";

type Props = {
  task: TeamTask;
  data: TasksWorkspaceData;
  editing: boolean;
  busy: boolean;
  error: string;
  onSave: (task: TeamTask) => Promise<void>;
  onCancel: () => void;
};

export function TaskEditor({
  task,
  data,
  editing,
  busy,
  error,
  onSave,
  onCancel,
}: Props) {
  const [draft, setDraft] = useState(task);
  const [deadline, setDeadline] = useState(
    task.dueAt ? dayjs(task.dueAt).format("YYYY-MM-DDTHH:mm") : "",
  );
  const [validation, setValidation] = useState("");
  const disabled = busy || !data.limits.team;
  return (
    <Paper
      component="form"
      variant="outlined"
      aria-label={editing ? "Изменение задачи" : "Создание задачи"}
      onSubmit={(event) => {
        event.preventDefault();
        if (disabled) return;
        if (!draft.title.trim()) {
          setValidation("Укажите название задачи");
          return;
        }
        if (deadline && !dayjs(deadline).isValid()) {
          setValidation("Укажите корректные дату и время");
          return;
        }
        setValidation("");
        void onSave({
          ...draft,
          dueAt: deadline ? dayjs(deadline).toISOString() : null,
        });
      }}
      sx={{
        ...panelSx,
        p: {
          xs: 2,
          sm: 3,
        },
        maxWidth: 720,
        width: "100%",
      }}
    >
      <Stack spacing={2.5}>
        {(error || validation) && (
          <Alert severity="error">{error || validation}</Alert>
        )}
        <TextField
          size="small"
          autoFocus
          required
          fullWidth
          label="Название задачи"
          placeholder="Что нужно сделать?"
          value={draft.title}
          disabled={disabled}
          onChange={(event) =>
            setDraft({ ...draft, title: event.target.value })
          }
          slotProps={{ htmlInput: { maxLength: 200 } }}
        />
        <TextField
          size="small"
          fullWidth
          multiline
          minRows={3}
          label="Внутренняя заметка"
          placeholder="Подробности и контекст для команды"
          helperText="Клиент не увидит эту заметку"
          value={draft.note}
          disabled={disabled}
          onChange={(event) => setDraft({ ...draft, note: event.target.value })}
          slotProps={{ htmlInput: { maxLength: 5000 } }}
        />
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
        >
          <TextField
            size="small"
            fullWidth
            select
            label="Исполнитель"
            value={draft.assigneeUserId ?? ""}
            disabled={disabled}
            onChange={(event) =>
              setDraft({ ...draft, assigneeUserId: event.target.value || null })
            }
          >
            <MenuItem value="">Не назначен</MenuItem>
            {draft.assigneeUserId &&
              !data.members.some(
                (member) => member.id === draft.assigneeUserId,
              ) && (
                <MenuItem
                  value={draft.assigneeUserId}
                  disabled
                >
                  Участник недоступен
                </MenuItem>
              )}
            {data.members.map((member) => (
              <MenuItem
                key={member.id}
                value={member.id}
              >
                {member.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            fullWidth
            select
            label="Заявка"
            value={draft.requestId ?? ""}
            disabled={disabled}
            onChange={(event) =>
              setDraft({ ...draft, requestId: event.target.value || null })
            }
          >
            <MenuItem value="">Без заявки</MenuItem>
            {draft.requestId &&
              !data.requests.some(
                (request) => request.id === draft.requestId,
              ) && (
                <MenuItem
                  value={draft.requestId}
                  disabled
                >
                  Заявка недоступна
                </MenuItem>
              )}
            {data.requests.map((request) => (
              <MenuItem
                key={request.id}
                value={request.id}
              >
                {requestLabel(request)}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <TextField
          size="small"
          fullWidth
          type="datetime-local"
          label="Срок (ваше местное время)"
          helperText="Можно оставить без срока"
          value={deadline}
          disabled={disabled}
          onChange={(event) => setDeadline(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        {editing && (
          <FormControlLabel
            label="Выполнена"
            control={
              <Checkbox
                size="small"
                checked={draft.done}
                disabled={disabled}
                onChange={(_, done) => setDraft({ ...draft, done })}
              />
            }
          />
        )}
        <Stack
          direction="row"
          useFlexGap
          spacing={2}
          sx={{
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",

            borderTop: 1,
            borderColor: "divider",
            pt: 2,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
            }}
          >
            * Обязательное поле
          </Typography>
          <Stack
            direction="row"
            spacing={1}
          >
            <Button
              size="small"
              disabled={busy}
              onClick={onCancel}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              variant="contained"
              size="small"
              sx={actionSx}
              disabled={disabled}
            >
              {busy
                ? "Сохраняем…"
                : editing
                  ? "Сохранить изменения"
                  : "Создать задачу"}
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}
