"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { RequestLifecycleBehavior } from "../model/request-lifecycle-behavior";
import { isLifecycleEmpty } from "../model/request-lifecycle-model";
import { normalizeDeliverySummary } from "../model/delivery-submission-dialog-model";
import { splitSafeSummaryLinks } from "../model/delivery-summary-links";

export type RequestLifecycleActionsProps = {
  behavior: RequestLifecycleBehavior;
  busy?: boolean;
};

export function RequestLifecycleActions(props: RequestLifecycleActionsProps) {
  // Why: общий busy приходит снаружи — запоминаем нажатую кнопку, чтобы спиннер был только на ней.
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  const vm = props.behavior.getViewModel();
  if (isLifecycleEmpty(vm)) return null;

  const isBusy = Boolean(props.busy);

  return (
    <Box>
      <Stack spacing={1.5}>
        {vm.lockedAlert ? (
          <Alert
            severity="warning"
            variant="outlined"
            sx={{
              "& .MuiAlert-message": { width: "100%" },
              "& .MuiAlert-icon": { alignSelf: "flex-start", mt: "2px" },
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
              }}
            >
              {vm.lockedAlert.title}
            </Typography>
          </Alert>
        ) : null}

        {vm.note ? (
          vm.actions.some((a) => a.id === "markRendered" && a.disabled) ? (
            <Alert severity="warning" variant="outlined">
              <Typography variant="body2">{vm.note}</Typography>
            </Alert>
          ) : (
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
              }}
            >
              {vm.note}
            </Typography>
          )
        ) : null}

        {vm.autoAcceptAtLabel ? (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
            }}
          >
            {vm.autoAcceptAtLabel}
          </Typography>
        ) : null}

        {vm.deliverySubmissions.length > 0 ? (
          <Stack spacing={1}>
            {vm.deliverySubmissions.map((submission) => (
              <Box
                key={submission.id}
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 1.5,
                }}
              >
                <Typography variant="subtitle2">
                  Сдача версии {submission.sequence} ·{" "}
                  {new Date(submission.submittedAt).toLocaleDateString("ru-RU")}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ whiteSpace: "pre-wrap", mt: 0.5 }}
                >
                  {splitSafeSummaryLinks(submission.summary).map(
                    (part, index) =>
                      part.type === "link" ? (
                        <a
                          key={`${part.value}-${index}`}
                          href={part.value}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          {part.value}
                        </a>
                      ) : (
                        part.value
                      ),
                  )}
                </Typography>
                {submission.remarks.map((remark) => (
                  <Typography
                    key={remark.id}
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    Замечание (
                    {remark.status === "DONE" ? "выполнено" : "открыто"}):{" "}
                    {remark.text}
                  </Typography>
                ))}
              </Box>
            ))}
          </Stack>
        ) : null}

        {vm.infoRows.map((row) => (
          <Typography
            key={row.label}
            variant="body2"
            sx={{
              color: "text.secondary",
            }}
          >
            {row.label}: {row.value}
          </Typography>
        ))}

        {vm.actions.length > 0 ? (
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{
              flexWrap: "wrap",
              alignSelf: "flex-start",
            }}
          >
            {vm.actions.map((a) => {
              const loading = isBusy && pendingId === a.id;
              return (
                <Button
                  key={a.id}
                  variant={a.variant}
                  color={a.color}
                  loading={loading}
                  disabled={(isBusy && !loading) || Boolean(a.disabled)}
                  onClick={() => {
                    if (a.id === "markRendered") {
                      setSummary("");
                      setSummaryError(null);
                      setSubmissionDialogOpen(true);
                      return;
                    }
                    setPendingId(a.id);
                    void Promise.resolve(
                      props.behavior.run({ id: a.id }),
                    ).finally(() => setPendingId(null));
                  }}
                >
                  {a.label}
                </Button>
              );
            })}
          </Stack>
        ) : null}
      </Stack>
      <Dialog
        open={submissionDialogOpen}
        onClose={isBusy ? undefined : () => setSubmissionDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {vm.deliverySubmissionPrompt ?? "Итог результата"}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={4}
            label={vm.deliverySubmissionPrompt ?? "Итог результата"}
            value={summary}
            disabled={isBusy}
            error={Boolean(summaryError)}
            helperText={
              summaryError ??
              "Кратко опишите результат. Можно добавить ссылки на материалы."
            }
            slotProps={{ htmlInput: { maxLength: 2000 } }}
            onChange={(event) => {
              setSummary(event.target.value);
              setSummaryError(null);
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            disabled={isBusy}
            onClick={() => setSubmissionDialogOpen(false)}
          >
            Отмена
          </Button>
          <Button
            variant="contained"
            loading={isBusy && pendingId === "markRendered"}
            onClick={() => {
              const normalized = normalizeDeliverySummary(summary);
              if (!normalized) {
                setSummaryError("Укажите итог результата.");
                return;
              }
              setPendingId("markRendered");
              void Promise.resolve(
                props.behavior.run({
                  id: "markRendered",
                  payload: { summary: normalized },
                }),
              )
                .then(() => setSubmissionDialogOpen(false))
                .catch(() => {
                  // Контейнер уже показал доменную ошибку; диалог и итог сохраняем.
                })
                .finally(() => setPendingId(null));
            }}
          >
            Передать на принятие
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
