"use client";

import { useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import QueueIcon from "@mui/icons-material/Queue";
import { Alert, Box, Button, Divider, IconButton, Stack, TextField, Typography } from "@mui/material";
import {
  formatKopecksRub,
  hasRequestLock,
  rublesInputToKopecks,
  type RequestPaymentItemDto,
  type RequestPaymentType,
  type RequestStatus,
} from "@/entities/request";
import { addProRequestPayment, markCustomerRequestPaymentPaid, markProRequestPaymentPaid, setProRequestTotal } from "@/entities/request/api/request-payments";
import { useConfirm } from "@/shared/ui/confirm";

const CLOSED: readonly RequestStatus[] = ["COMPLETED", "CANCELLED", "CLOSED"];

function PaymentListRow({
  comment,
  amountKopecks,
  paid,
  onMarkPaid,
  markPaidDisabled,
}: {
  comment: string;
  amountKopecks: number;
  paid: boolean;
  onMarkPaid?: () => void;
  markPaidDisabled?: boolean;
}) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography variant="body2" noWrap title={comment} sx={{ flexShrink: 1, minWidth: 0 }}>
        {comment}
      </Typography>
      <Box sx={{ flex: 1, borderBottom: "1px solid", borderColor: "divider", minWidth: 16, alignSelf: "center" }} />
      <Typography variant="body2" fontWeight={700} sx={{ flexShrink: 0, color: paid ? "success.main" : undefined }}>
        {formatKopecksRub(amountKopecks)}
      </Typography>

      <Box
        sx={{
          flexShrink: 0,
          width: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {paid ? (
          <CheckCircleIcon fontSize="small" sx={{ color: "success.main" }} />
        ) : onMarkPaid ? (
          <IconButton
            aria-label="Отметить как оплачено"
            size="small"
            disabled={Boolean(markPaidDisabled)}
            onClick={onMarkPaid}
            sx={{ color: "text.secondary", p: 0 }}
          >
            <CheckCircleOutlineIcon fontSize="small" />
          </IconButton>
        ) : (
          <CheckCircleOutlineIcon fontSize="small" sx={{ color: "text.secondary" }} />
        )}
      </Box>
    </Stack>
  );
}

function AddPaymentTrigger({ disabled, onClick }: { disabled?: boolean; onClick: () => void }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", flexShrink: 0 }}>
      <Button
        variant="outlined"
        size="small"
        startIcon={<AddIcon />}
        disabled={disabled}
        onClick={onClick}
      >
        Платёж
      </Button>
    </Box>
  );
}

export type RequestPaymentsProps = {
  mode: "customer" | "provider";
  requestId: string;
  status: RequestStatus;
  lockedAt: string | null | undefined;
  totalAmountKopecks: number | null;
  paidAmountKopecks: number;
  remainingAmountKopecks: number | null;
  payments: readonly RequestPaymentItemDto[];
  busy?: boolean;
  onChanged?: () => Promise<void> | void;
};

export function RequestPayments(props: RequestPaymentsProps) {
  const confirm = useConfirm();
  const locked = hasRequestLock({ lockedAt: props.lockedAt });
  const canEdit = props.mode === "provider" && locked && !CLOSED.includes(props.status);
  const [totalInput, setTotalInput] = useState("");
  const [totalEditOpen, setTotalEditOpen] = useState(false);
  const [contractAmountInput, setContractAmountInput] = useState("");
  const [contractComment, setContractComment] = useState("");
  const [otherAmountInput, setOtherAmountInput] = useState("");
  const [otherComment, setOtherComment] = useState("");
  const [contractAddOpen, setContractAddOpen] = useState(false);
  const [otherAddOpen, setOtherAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!locked) return null;

  const isBusy = Boolean(props.busy) || saving;
  const remaining = props.remainingAmountKopecks;
  const payments = props.payments ?? [];
  const total = props.totalAmountKopecks;
  const totalIsSet = total != null;
  const canEditTotal = canEdit;
  const isEditingTotal = canEditTotal && (!totalIsSet || totalEditOpen);
  const canAddContractPayments = canEdit;
  const canAddOtherPayments = canEdit;
  const canMarkPaid = locked && !CLOSED.includes(props.status);
  const contractPayments = payments
    .filter((p) => p.type === "CONTRACT")
    .slice()
    .sort((a, b) => {
      if (a.paidAt == null && b.paidAt != null) return -1;
      if (a.paidAt != null && b.paidAt == null) return 1;
      if (a.paidAt != null && b.paidAt != null) return new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  const otherPayments = payments
    .filter((p) => p.type === "OTHER")
    .slice()
    .sort((a, b) => {
      if (a.paidAt == null && b.paidAt != null) return -1;
      if (a.paidAt != null && b.paidAt == null) return 1;
      if (a.paidAt != null && b.paidAt != null) return new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  const otherPaidAmountKopecks = otherPayments.reduce((sum, p) => (p.paidAt ? sum + p.amountKopecks : sum), 0);
  const canSubmitContract = rublesInputToKopecks(contractAmountInput) != null && contractComment.trim().length > 0;
  const canSubmitOther = rublesInputToKopecks(otherAmountInput) != null && otherComment.trim().length > 0;

  function formatKopecksForInput(kopecks: number): string {
    const value = kopecks / 100;
    const fixed = value.toFixed(2);
    return fixed.endsWith(".00") ? String(Math.trunc(value)) : fixed;
  }

  async function saveTotal() {
    const kopecks = rublesInputToKopecks(totalInput);
    if (kopecks == null) {
      setError("Укажите полную цену больше нуля");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await setProRequestTotal(props.requestId, kopecks);
      setTotalInput("");
      setTotalEditOpen(false);
      await props.onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить цену");
    } finally {
      setSaving(false);
    }
  }

  async function addPayment(input: { type: RequestPaymentType; amountInput: string; comment: string }) {
    const kopecks = rublesInputToKopecks(input.amountInput);
    const trimmed = input.comment.trim();
    if (kopecks == null) {
      setError("Укажите сумму поступления больше нуля");
      return;
    }
    if (!trimmed) {
      setError("Укажите назначение платежа");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addProRequestPayment(props.requestId, { amountKopecks: kopecks, comment: trimmed, type: input.type });
      if (input.type === "CONTRACT") {
        setContractAmountInput("");
        setContractComment("");
        setContractAddOpen(false);
      } else {
        setOtherAmountInput("");
        setOtherComment("");
        setOtherAddOpen(false);
      }
      await props.onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось добавить поступление");
    } finally {
      setSaving(false);
    }
  }

  async function markPaid(paymentId: string) {
    if (!canMarkPaid || isBusy) return;
    const ok = await confirm({
      title: "Отметить платёж как оплаченный?",
      description: "Платёж будет отмечен как оплаченный, и остаток уменьшится. Это действие нельзя отменить.",
      confirmText: "Оплачено",
      confirmColor: "success",
    });
    if (!ok) return;

    setSaving(true);
    setError(null);
    try {
      if (props.mode === "provider") {
        await markProRequestPaymentPaid(props.requestId, paymentId);
      } else {
        await markCustomerRequestPaymentPaid(props.requestId, paymentId);
      }
      await props.onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отметить платёж как оплаченный");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={1.5} sx={{ flex: 1, minHeight: "100%" }}>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="stretch" sx={{ flex: 1 }}>
        <Stack spacing={1.25} sx={{ flex: "1 1 0", minWidth: 0, height: { md: "100%" } }}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Typography fontWeight={900}>По договору</Typography>
            {totalIsSet ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography fontWeight={900} sx={{ fontSize: 22 }}>
                  {formatKopecksRub(total)}
                </Typography>
                {canEditTotal ? (
                  <IconButton
                    aria-label="Редактировать цену"
                    size="small"
                    disabled={isBusy}
                    onClick={() => {
                      setTotalInput(formatKopecksForInput(total));
                      setTotalEditOpen(true);
                    }}
                  >
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                ) : null}
              </Stack>
            ) : null}
          </Stack>

          {contractPayments.length > 0 ? (
            <Stack spacing={0.75} sx={{ flex: "1 0 auto" }}>
              {contractPayments.map((payment) => (
                <PaymentListRow
                  key={payment.id}
                  comment={payment.comment}
                  amountKopecks={payment.amountKopecks}
                  paid={Boolean(payment.paidAt)}
                  onMarkPaid={!payment.paidAt && canMarkPaid ? () => void markPaid(payment.id) : undefined}
                  markPaidDisabled={isBusy}
                />
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
              Поступлений по договору пока нет
            </Typography>
          )}

          {canEditTotal || canAddContractPayments ? (
            <Stack spacing={1.25} sx={{ flexShrink: 0, pt: 1 }}>
              {isEditingTotal ? (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "flex-end" }}>
                  <TextField
                    variant="standard"
                    label="Полная цена, ₽"
                    placeholder="Напр. 25000"
                    value={totalInput}
                    onChange={(e) => setTotalInput(e.target.value)}
                    disabled={isBusy}
                    size="small"
                    inputProps={{ inputMode: "decimal" }}
                  />
                  <IconButton
                    aria-label="Сохранить цену"
                    color="primary"
                    disabled={isBusy}
                    onClick={() => void saveTotal()}
                  >
                    <CheckIcon />
                  </IconButton>
                  {totalIsSet ? (
                    <IconButton
                      aria-label="Отмена"
                      disabled={isBusy}
                      onClick={() => setTotalEditOpen(false)}
                    >
                      <CloseIcon />
                    </IconButton>
                  ) : null}
                </Stack>
              ) : null}

              {canAddContractPayments && !isEditingTotal && !contractAddOpen ? (
                <AddPaymentTrigger disabled={isBusy} onClick={() => setContractAddOpen(true)} />
              ) : null}

              {canAddContractPayments && !isEditingTotal && contractAddOpen ? (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "flex-end" }}>
                  <TextField
                    variant="standard"
                    label="Сумма, ₽"
                    placeholder="Напр. 25000"
                    value={contractAmountInput}
                    onChange={(e) => setContractAmountInput(e.target.value)}
                    disabled={isBusy}
                    size="small"
                    inputProps={{ inputMode: "decimal" }}
                  />
                  <TextField
                    variant="standard"
                    label="Назначение (договор)"
                    placeholder="Напр. Аванс"
                    value={contractComment}
                    onChange={(e) => setContractComment(e.target.value)}
                    disabled={isBusy}
                    size="small"
                    sx={{ minWidth: { sm: 220 } }}
                  />
                  <IconButton
                    aria-label="Добавить"
                    color="primary"
                    disabled={isBusy || !canSubmitContract}
                    onClick={() => void addPayment({ type: "CONTRACT", amountInput: contractAmountInput, comment: contractComment })}
                  >
                    <QueueIcon />
                  </IconButton>
                  <IconButton
                    aria-label="Отмена"
                    disabled={isBusy}
                    onClick={() => {
                      setContractAddOpen(false);
                      setContractAmountInput("");
                      setContractComment("");
                    }}
                  >
                    <CloseIcon />
                  </IconButton>
                </Stack>
              ) : null}
            </Stack>
          ) : null}

          <Stack direction="row" spacing={1} alignItems="baseline" justifyContent="space-between" sx={{ flexShrink: 0, pt: 0.5 }}>
            <Typography fontWeight={700}>Остаток:</Typography>
            <Typography fontWeight={900} sx={{ fontSize: 22 }}>
              {remaining == null ? "—" : formatKopecksRub(remaining)}
            </Typography>
          </Stack>
        </Stack>

        <Divider flexItem sx={{ display: { xs: "block", md: "none" } }} />
        <Divider flexItem orientation="vertical" sx={{ display: { xs: "none", md: "block" } }} />

        <Stack spacing={1.25} sx={{ flex: "1 1 0", minWidth: 0, height: { md: "100%" } }}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Typography fontWeight={900}>Прочие платежи</Typography>
            <Typography fontWeight={900} sx={{ fontSize: 22 }}>
              {formatKopecksRub(otherPaidAmountKopecks)}
            </Typography>
          </Stack>

          {otherPayments.length > 0 ? (
            <Stack spacing={0.75} sx={{ flex: "1 0 auto" }}>
              {otherPayments.map((payment) => (
                <PaymentListRow
                  key={payment.id}
                  comment={payment.comment}
                  amountKopecks={payment.amountKopecks}
                  paid={Boolean(payment.paidAt)}
                  onMarkPaid={!payment.paidAt && canMarkPaid ? () => void markPaid(payment.id) : undefined}
                  markPaidDisabled={isBusy}
                />
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
              Прочих платежей пока нет
            </Typography>
          )}

          {canAddOtherPayments && !otherAddOpen ? (
            <Box sx={{ flexShrink: 0, pt: 1 }}>
              <AddPaymentTrigger disabled={isBusy} onClick={() => setOtherAddOpen(true)} />
            </Box>
          ) : null}

          {canAddOtherPayments && otherAddOpen ? (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "flex-end" }} sx={{ flexShrink: 0, pt: 1 }}>
              <TextField
                variant="standard"
                label="Сумма, ₽"
                placeholder="Напр. 8000"
                value={otherAmountInput}
                onChange={(e) => setOtherAmountInput(e.target.value)}
                disabled={isBusy}
                size="small"
                inputProps={{ inputMode: "decimal" }}
              />
              <TextField
                variant="standard"
                label="Назначение (прочее)"
                placeholder="Напр. Кадастровый инженер"
                value={otherComment}
                onChange={(e) => setOtherComment(e.target.value)}
                disabled={isBusy}
                size="small"
                sx={{ minWidth: { sm: 220 } }}
              />
              <IconButton
                aria-label="Добавить"
                color="primary"
                disabled={isBusy || !canSubmitOther}
                onClick={() => void addPayment({ type: "OTHER", amountInput: otherAmountInput, comment: otherComment })}
              >
                <QueueIcon />
              </IconButton>
              <IconButton
                aria-label="Отмена"
                disabled={isBusy}
                onClick={() => {
                  setOtherAddOpen(false);
                  setOtherAmountInput("");
                  setOtherComment("");
                }}
              >
                <CloseIcon />
              </IconButton>
            </Stack>
          ) : null}
        </Stack>
      </Stack>
    </Stack>
  );
}
