"use client";

import { useState, type ReactNode } from "react";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import QueueIcon from "@mui/icons-material/Queue";
import { Alert, Box, Button, Divider, IconButton, Stack, TextField, Typography } from "@mui/material";
import {
  formatRubles,
  hasRequestLock,
  parseRublesInput,
  type RequestPaymentItemDto,
  type RequestPaymentType,
  type RequestStatus,
} from "@/entities/request";
import { addProRequestPayment, markCustomerRequestPaymentPaid, markProRequestPaymentPaid, setProRequestTotal } from "@/entities/request/api/request-payments";
import { useConfirm } from "@/shared/ui/confirm";

const CLOSED: readonly RequestStatus[] = ["COMPLETED", "CANCELLED", "CLOSED"];
const PAYMENT_ACTION_SLOT_WIDTH = 32;
const PAYMENT_SECTION_GRID_SX = {
  display: "grid",
  gridTemplateColumns: `minmax(0, 1fr) auto ${PAYMENT_ACTION_SLOT_WIDTH}px`,
  columnGap: 1,
  rowGap: 0.75,
  alignItems: "center",
} as const;

const PAYMENT_AMOUNT_SX = {
  gridColumn: 2,
  justifySelf: "stretch",
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
  minWidth: 0,
} as const;

const PAYMENT_ACTION_SLOT_SX = {
  gridColumn: 3,
  width: PAYMENT_ACTION_SLOT_WIDTH,
  minWidth: PAYMENT_ACTION_SLOT_WIDTH,
  maxWidth: PAYMENT_ACTION_SLOT_WIDTH,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
} as const;

const PAYMENT_AMOUNT_TOTAL_TYPO_SX = {
  fontWeight: 900,
  fontSize: 22,
} as const;

function PaymentAmountCell({
  children,
  action,
  typographySx,
  sx,
}: {
  children: ReactNode;
  action?: ReactNode;
  typographySx?: object;
  sx?: object;
}) {
  return (
    <>
      <Typography sx={{ ...PAYMENT_AMOUNT_SX, ...typographySx, ...sx }}>{children}</Typography>
      <Box sx={PAYMENT_ACTION_SLOT_SX}>{action}</Box>
    </>
  );
}

function PaymentListRow({
  comment,
  amountRubles,
  paid,
  onMarkPaid,
  markPaidDisabled,
}: {
  comment: string;
  amountRubles: number;
  paid: boolean;
  onMarkPaid?: () => void;
  markPaidDisabled?: boolean;
}) {
  return (
    <>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          minWidth: 0,
          gridColumn: 1
        }}>
        <Typography variant="body2" noWrap title={comment} sx={{ flexShrink: 1, minWidth: 0 }}>
          {comment}
        </Typography>
        <Box sx={{ flex: 1, borderBottom: "1px solid", borderColor: "divider", minWidth: 16, ml: 1, alignSelf: "center" }} />
      </Stack>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 700,
          ...PAYMENT_AMOUNT_SX,
          color: paid ? "success.main" : undefined
        }}>
        {formatRubles(amountRubles)}
      </Typography>
      <Box sx={PAYMENT_ACTION_SLOT_SX}>
        {paid ? (
          <CheckIcon fontSize="small" sx={{ color: "success.main" }} />
        ) : onMarkPaid ? (
          <IconButton
            aria-label="Отметить как оплачено"
            size="small"
            disabled={Boolean(markPaidDisabled)}
            onClick={onMarkPaid}
            sx={{ color: "text.secondary", p: 0 }}
          >
            <CheckIcon fontSize="small" />
          </IconButton>
        ) : (
          <CheckIcon fontSize="small" sx={{ color: "text.secondary" }} />
        )}
      </Box>
    </>
  );
}

function AddPaymentTrigger({ disabled, onClick }: { disabled?: boolean; onClick: () => void }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", flexShrink: 0 }}>
      <Button
        color="warning"
        variant="text"
        size="small"
        startIcon={<AddIcon />}
        disabled={disabled}
        onClick={onClick}
        sx={{
          bgcolor: "grey.300",
          px: 2,
          "&:hover": { bgcolor: "grey.100" },
        }}
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
  totalAmountRubles: number | null;
  paidAmountRubles: number;
  remainingAmountRubles: number | null;
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
  const remaining = props.remainingAmountRubles;
  const payments = props.payments ?? [];
  const total = props.totalAmountRubles;
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
  const otherPaidAmountRubles = otherPayments.reduce((sum, p) => (p.paidAt ? sum + p.amountRubles : sum), 0);
  const canSubmitContract = parseRublesInput(contractAmountInput) != null && contractComment.trim().length > 0;
  const canSubmitOther = parseRublesInput(otherAmountInput) != null && otherComment.trim().length > 0;

  function formatRublesForInput(rubles: number): string {
    return String(rubles);
  }

  async function saveTotal() {
    const rubles = parseRublesInput(totalInput);
    if (rubles == null) {
      setError("Укажите полную цену больше нуля (целое число рублей)");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await setProRequestTotal(props.requestId, rubles);
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
    const rubles = parseRublesInput(input.amountInput);
    const trimmed = input.comment.trim();
    if (rubles == null) {
      setError("Укажите сумму поступления больше нуля (целое число рублей)");
      return;
    }
    if (!trimmed) {
      setError("Укажите назначение платежа");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addProRequestPayment(props.requestId, { amountRubles: rubles, comment: trimmed, type: input.type });
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

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{
          alignItems: "stretch",
          flex: 1
        }}>
        <Stack spacing={1.25} sx={{ flex: "1 1 0", minWidth: 0, height: { md: "100%" } }}>
          <Box sx={PAYMENT_SECTION_GRID_SX}>
            <Typography
              sx={{
                fontWeight: 900,
                gridColumn: 1,
                minWidth: 0
              }}>
              По договору
            </Typography>
            <PaymentAmountCell
              typographySx={PAYMENT_AMOUNT_TOTAL_TYPO_SX}
              action={
                canEditTotal && totalIsSet ? (
                  <IconButton
                    aria-label="Редактировать цену"
                    size="small"
                    disabled={isBusy}
                    onClick={() => {
                      setTotalInput(formatRublesForInput(total));
                      setTotalEditOpen(true);
                    }}
                    sx={{ p: 0 }}
                  >
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                ) : null
              }
            >
              {totalIsSet ? formatRubles(total) : null}
            </PaymentAmountCell>

            {contractPayments.length > 0 ? (
              contractPayments.map((payment) => (
                <PaymentListRow
                  key={payment.id}
                  comment={payment.comment}
                  amountRubles={payment.amountRubles}
                  paid={Boolean(payment.paidAt)}
                  onMarkPaid={!payment.paidAt && canMarkPaid ? () => void markPaid(payment.id) : undefined}
                  markPaidDisabled={isBusy}
                />
              ))
            ) : (
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  gridColumn: "1 / -1"
                }}>
                Поступлений по договору пока нет
              </Typography>
            )}

            <Typography
              sx={{
                fontWeight: 700,
                gridColumn: 1,
                minWidth: 0,
                pt: 0.5
              }}>
              Остаток:
            </Typography>
            <PaymentAmountCell sx={{ pt: 0.5 }} typographySx={PAYMENT_AMOUNT_TOTAL_TYPO_SX}>
              {remaining == null ? "—" : formatRubles(remaining)}
            </PaymentAmountCell>
          </Box>

          {canEditTotal || canAddContractPayments ? (
            <Stack spacing={1.25} sx={{ flexShrink: 0, pt: 1 }}>
              {isEditingTotal ? (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{
                  alignItems: { sm: "flex-end" }
                }}>
                  <TextField
                    variant="standard"
                    label="Полная цена, ₽"
                    placeholder="Напр. 25000"
                    value={totalInput}
                    onChange={(e) => setTotalInput(e.target.value)}
                    disabled={isBusy}
                    size="small"
                    slotProps={{ htmlInput: { inputMode: "decimal" } }}
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
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{
                  alignItems: { sm: "flex-end" }
                }}>
                  <TextField
                    variant="standard"
                    label="Сумма, ₽"
                    placeholder="Напр. 25000"
                    value={contractAmountInput}
                    onChange={(e) => setContractAmountInput(e.target.value)}
                    disabled={isBusy}
                    size="small"
                    slotProps={{ htmlInput: { inputMode: "decimal" } }}
                  />
                  <TextField
                    variant="standard"
                    label="Назначение платежа (договор)"
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
        </Stack>

        <Divider flexItem sx={{ display: { xs: "block", md: "none" } }} />
        <Divider flexItem orientation="vertical" sx={{ display: { xs: "none", md: "block" } }} />

        <Stack spacing={1.25} sx={{ flex: "1 1 0", minWidth: 0, height: { md: "100%" } }}>
          <Box sx={PAYMENT_SECTION_GRID_SX}>
            <Typography
              sx={{
                fontWeight: 900,
                gridColumn: 1,
                minWidth: 0
              }}>
              Прочие платежи
            </Typography>
            <PaymentAmountCell typographySx={PAYMENT_AMOUNT_TOTAL_TYPO_SX}>
              {formatRubles(otherPaidAmountRubles)}
            </PaymentAmountCell>

            {otherPayments.length > 0 ? (
              otherPayments.map((payment) => (
                <PaymentListRow
                  key={payment.id}
                  comment={payment.comment}
                  amountRubles={payment.amountRubles}
                  paid={Boolean(payment.paidAt)}
                  onMarkPaid={!payment.paidAt && canMarkPaid ? () => void markPaid(payment.id) : undefined}
                  markPaidDisabled={isBusy}
                />
              ))
            ) : (
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  gridColumn: "1 / -1"
                }}>
                Прочих платежей пока нет
              </Typography>
            )}
          </Box>

          {canAddOtherPayments && !otherAddOpen ? (
            <Box sx={{ flexShrink: 0, pt: 1 }}>
              <AddPaymentTrigger disabled={isBusy} onClick={() => setOtherAddOpen(true)} />
            </Box>
          ) : null}

          {canAddOtherPayments && otherAddOpen ? (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              sx={{
                alignItems: { sm: "flex-end" },
                flexShrink: 0,
                pt: 1
              }}>
              <TextField
                variant="standard"
                label="Сумма, ₽"
                placeholder="Напр. 8000"
                value={otherAmountInput}
                onChange={(e) => setOtherAmountInput(e.target.value)}
                disabled={isBusy}
                size="small"
                slotProps={{ htmlInput: { inputMode: "decimal" } }}
              />
              <TextField
                variant="standard"
                label="Назначение платежа (прочее)"
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
