"use client";

import { useId, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { AppDateLocalization } from "@/shared/ui/date-field/AppDateLocalization";
import {
  periodBounds,
  periodLabel,
  shiftPeriod,
  type TaskPeriod,
} from "./model";
import { actionSx, panelSx } from "./styles";

type Props = {
  period: TaskPeriod;
  onChange: (period: TaskPeriod) => void;
  includeUndated: boolean;
  onIncludeUndated: (include: boolean) => void;
  undatedCount: number;
  now: Dayjs;
};

export function TaskPeriodFilter({
  period,
  onChange,
  includeUndated,
  onIncludeUndated,
  undatedCount,
  now,
}: Props) {
  const calendarId = useId();
  const [editor, setEditor] = useState<"day" | "range" | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [focusedField, setFocusedField] = useState<"start" | "end">("start");
  const [attempted, setAttempted] = useState(false);
  const validStart =
    /^\d{4}-\d{2}-\d{2}$/.test(start) &&
    dayjs(start).isValid() &&
    dayjs(start).format("YYYY-MM-DD") === start;
  const validEnd =
    /^\d{4}-\d{2}-\d{2}$/.test(end) &&
    dayjs(end).isValid() &&
    dayjs(end).format("YYYY-MM-DD") === end;
  const reversed = validStart && validEnd && end < start;

  function open(kind: "day" | "range") {
    const bounds = periodBounds(period, now);
    setStart((bounds?.start ?? now).format("YYYY-MM-DD"));
    setEnd((bounds?.end ?? now).format("YYYY-MM-DD"));
    setFocusedField("start");
    setAttempted(false);
    setEditor(kind);
  }

  function apply() {
    setAttempted(true);
    if (!validStart || (editor === "range" && (!validEnd || reversed))) return;
    onChange(
      editor === "range"
        ? { kind: "range", start, end }
        : { kind: "day", start },
    );
    setEditor(null);
  }

  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        useFlexGap
        spacing={1}
        sx={{
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
          }}
        >
          Срок задачи
        </Typography>
        {(
          [
            ["day", "Один день"],
            ["range", "Диапазон"],
            ["week", "Текущая неделя"],
          ] as const
        ).map(([kind, label]) => (
          <Button
            key={kind}
            size="small"
            variant={period.kind === kind ? "contained" : "outlined"}
            sx={period.kind === kind ? actionSx : undefined}
            aria-pressed={period.kind === kind}
            aria-expanded={kind !== "week" ? editor === kind : undefined}
            aria-controls={
              kind !== "week" && editor === kind ? calendarId : undefined
            }
            onClick={() => {
              if (kind === "week") {
                onChange({ kind: "week" });
                setEditor(null);
              } else open(kind);
            }}
          >
            {label}
          </Button>
        ))}
        <Stack
          direction="row"
          sx={{
            alignItems: "center",

            ml: {
              xs: 0,
              sm: "auto",
            },
            width: {
              xs: "100%",
              sm: "auto",
            },
            justifyContent: {
              xs: "space-between",
              sm: "center",
            },
          }}
        >
          <IconButton
            size="small"
            aria-label="Предыдущий период"
            disabled={period.kind === "all"}
            onClick={() => {
              onChange(shiftPeriod(period, -1, now));
              setEditor(null);
            }}
          >
            <ChevronLeftRoundedIcon />
          </IconButton>
          <Button
            size="small"
            onClick={() => open(period.kind === "day" ? "day" : "range")}
          >
            {periodLabel(period, now)}
          </Button>
          <IconButton
            size="small"
            aria-label="Следующий период"
            disabled={period.kind === "all"}
            onClick={() => {
              onChange(shiftPeriod(period, 1, now));
              setEditor(null);
            }}
          >
            <ChevronRightRoundedIcon />
          </IconButton>
        </Stack>
      </Stack>
      <Stack
        direction="row"
        useFlexGap
        sx={{
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",

          borderTop: 1,
          borderColor: "divider",
          pt: 1,
        }}
      >
        <FormControlLabel
          sx={{
            ml: -1,
            "& .MuiFormControlLabel-label": {
              fontSize: 14,
              color: "text.secondary",
            },
          }}
          label={`Включить без срока · ${undatedCount}`}
          control={
            <Checkbox
              size="small"
              checked={period.kind === "all" || includeUndated}
              disabled={period.kind === "all"}
              onChange={(_, checked) => onIncludeUndated(checked)}
            />
          }
        />
        <Button
          size="small"
          disabled={period.kind === "all"}
          onClick={() => {
            onChange({ kind: "all" });
            setEditor(null);
          }}
        >
          Сбросить период
        </Button>
      </Stack>
      {editor && (
        <Paper
          id={calendarId}
          component="section"
          aria-label={editor === "day" ? "Выбор одного дня" : "Выбор диапазона"}
          variant="outlined"
          onKeyDown={(event) => {
            if (event.key === "Escape") setEditor(null);
          }}
          sx={{
            ...panelSx,
            p: {
              xs: 1.5,
              sm: 2.5,
            },
            width: "100%",
            maxWidth: 540,
          }}
        >
          <Stack spacing={2}>
            <Stack
              direction="row"
              sx={{
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontSize: 18,
                }}
              >
                {editor === "day" ? "Выберите дату" : "Выберите диапазон"}
              </Typography>
              <IconButton
                size="small"
                aria-label="Закрыть выбор дат"
                onClick={() => setEditor(null)}
              >
                <CloseRoundedIcon />
              </IconButton>
            </Stack>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
            >
              <TextField
                autoFocus
                fullWidth
                size="small"
                type="date"
                label={editor === "day" ? "Дата" : "Начало"}
                value={start}
                onFocus={() => setFocusedField("start")}
                onChange={(event) => setStart(event.target.value)}
                error={attempted && !validStart}
                helperText={
                  attempted && !validStart ? "Укажите дату" : undefined
                }
                slotProps={{ inputLabel: { shrink: true } }}
              />
              {editor === "range" && (
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Конец"
                  value={end}
                  onFocus={() => setFocusedField("end")}
                  onChange={(event) => setEnd(event.target.value)}
                  error={reversed || (attempted && !validEnd)}
                  helperText={
                    reversed
                      ? "Дата окончания должна быть не раньше даты начала"
                      : attempted && !validEnd
                        ? "Укажите дату окончания"
                        : undefined
                  }
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              )}
            </Stack>
            <AppDateLocalization>
              <DateCalendar
                value={
                  dayjs(focusedField === "end" ? end : start).isValid()
                    ? dayjs(focusedField === "end" ? end : start)
                    : null
                }
                referenceDate={now}
                showDaysOutsideCurrentMonth
                onChange={(date: Dayjs | null) => {
                  if (!date?.isValid()) return;
                  const value = date.format("YYYY-MM-DD");
                  if (editor === "day" || focusedField === "start") {
                    setStart(value);
                    if (editor === "range") {
                      setEnd("");
                      setFocusedField("end");
                    }
                  } else {
                    if (value < start) {
                      setEnd(start);
                      setStart(value);
                    } else setEnd(value);
                    setFocusedField("start");
                  }
                }}
                sx={{
                  width: "100%",
                  maxWidth: 320,
                  "& .MuiDayCalendar-header, & .MuiDayCalendar-weekContainer": {
                    gap: 0,
                  },
                  "& .MuiPickerDay-root": {
                    "--PickerDay-size": "34px",
                    "--PickerDay-horizontalMargin": "1px",
                  },
                }}
                slotProps={{
                  day: (owner) => {
                    const date = owner.day.format("YYYY-MM-DD");
                    const edge =
                      date === start || (editor === "range" && date === end);
                    const between =
                      editor === "range" &&
                      validStart &&
                      validEnd &&
                      date > start &&
                      date < end;
                    return {
                      selected: edge,
                      sx: {
                        borderRadius: "6px",
                        bgcolor: edge
                          ? "text.primary"
                          : between
                            ? (theme) => alpha(theme.palette.primary.main, 0.2)
                            : undefined,
                        color: edge ? "background.paper" : undefined,
                        "&:hover, &:focus": edge
                          ? {
                              bgcolor: "text.primary",
                              color: "background.paper",
                            }
                          : undefined,
                        "&.Mui-selected, &.Mui-selected:hover, &.Mui-selected:focus":
                          {
                            bgcolor: "text.primary",
                            color: "background.paper",
                          },
                      },
                    };
                  },
                }}
              />
            </AppDateLocalization>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 2,
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
                {editor === "range" && validStart && validEnd && !reversed
                  ? `Дней в периоде: ${dayjs(end).diff(dayjs(start), "day") + 1}`
                  : editor === "range"
                    ? "Выберите начало и конец"
                    : "Один календарный день"}
              </Typography>
              <Stack
                direction="row"
                spacing={1}
              >
                <Button
                  size="small"
                  onClick={() => setEditor(null)}
                >
                  Отмена
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  sx={actionSx}
                  onClick={apply}
                >
                  Применить
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
