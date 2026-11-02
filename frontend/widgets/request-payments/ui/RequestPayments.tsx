"use client";

import { useEffect, useState, type ReactNode } from "react";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import QueueIcon from "@mui/icons-material/Queue";
import { Alert, Box, Button, Divider, IconButton, Stack, TextField, Typography } from "@mui/material";
import {
  formatRubles,
  parseRublesInput,
  type RequestPaymentItemDto,
  type RequestPaymentType,
  type RequestPriceProposalDto,
  type RequestStatus,
} from "@/entities/request";
import {
  acceptCustomerRequestPrice,
  acceptProRequestPrice,
  addCustomerRequestPayment,
  addProRequestPayment,
  markCustomerRequestPaymentPaid,
  markProRequestPaymentPaid,
  proposeCustomerRequestPrice,
  proposeProRequestPrice,
} from "@/entities/request/api/request-payments";
import { resolveRequestPriceView } from "@/entities/request/lib/request-finance";
import { useConfirm } from "@/shared/ui/confirm";
import { resolveRequestPaymentPermissions } from "../model/request-payment-permissions";

const PAYMENT_ACTION_SLOT_WIDTH = 32;
const PAYMENT_SECTION_GRID_SX = {
  display: "grid",
  gridTemplateColumns: {
    xs: "minmax(0, 1fr) auto auto",
    sm: `minmax(0, 1fr) auto ${PAYMENT_ACTION_SLOT_WIDTH}px`,
  },
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
  width: { xs: "auto", sm: PAYMENT_ACTION_SLOT_WIDTH },
  minWidth: { xs: 0, sm: PAYMENT_ACTION_SLOT_WIDTH },
  maxWidth: { xs: "none", sm: PAYMENT_ACTION_SLOT_WIDTH },
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
  markPaidLoading,
  authorCaption,
}: {
  comment: string;
  amountRubles: number;
  paid: boolean;
  onMarkPaid?: () => void;
  markPaidDisabled?: boolean;
  markPaidLoading?: boolean;
  authorCaption?: string | null;
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
          <Stack direction="row" spacing={0.25} sx={{ alignItems: "center", color: "success.main" }}>
            <CheckIcon fontSize="small" />
            <Typography variant="caption" sx={{ display: { xs: "inline", sm: "none" } }}>
              Оплачено
            </Typography>
          </Stack>
        ) : onMarkPaid ? (
          <Button
            aria-label="Отметить как оплачено"
            size="small"
            loading={Boolean(markPaidLoading)}
            disabled={Boolean(markPaidDisabled)}
            onClick={onMarkPaid}
            startIcon={<CheckIcon fontSize="small" />}
            sx={{ color: "text.secondary", minWidth: 0, px: 0.5 }}
          >
            <Typography component="span" variant="caption" sx={{ display: { xs: "inline", sm: "none" } }}>
              Оплачено
            </Typography>
          </Button>
        ) : (
          <CheckIcon fontSize="small" sx={{ color: "text.secondary" }} />
        )}
      </Box>
      {authorCaption ? (
        <Typography variant="caption" sx={{ color: "text.secondary", gridColumn: "1 / -1" }}>
          {authorCaption}
        </Typography>
      ) : null}
    </>
  );
}

function expenseAuthorCaption(payment: RequestPaymentItemDto): string {
  const who =
    payment.createdBySide === "CUSTOMER"
      ? "Клиент"
      : payment.createdBySide === "PROVIDER"
        ? "Исполнитель"
        : "Участник";
  const when = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(payment.createdAt));
  return `${who} · ${when}`;
}

function AddPaymentTrigger({
  disabled,
  onClick,
  label,
}: {
  disabled?: boolean;
  onClick: () => void;
  label: string;
}) {
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
        {label}
      </Button>
    </Box>
  );
}

export type RequestPaymentsProps = {
  mode: "customer" | "provider";
  requestId: string;
  conversationId?: string;
  status: RequestStatus;
  lockedAt: string | null | undefined;
  isLocked?: boolean;
  totalAmountRubles: number | null;
  servicePriceRubles: number | null;
  priceProposal: RequestPriceProposalDto | null;
  canProposePrice: boolean;
  canAcceptPrice: boolean;
  paidAmountRubles: number;
  remainingAmountRubles: number | null;
  payments: readonly RequestPaymentItemDto[];
  busy?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onChanged?: () => Promise<void> | void;
};

export function RequestPayments(props: RequestPaymentsProps) {
  const confirm = useConfirm();
  const permissions = resolveRequestPaymentPermissions({
    status: props.status,
    mode: props.mode,
    isLocked: Boolean(props.isLocked),
    canProposePrice: props.canProposePrice,
    canAcceptPrice: props.canAcceptPrice,
  });
  const priceView = resolveRequestPriceView({
    totalAmountRubles: props.totalAmountRubles,
    servicePriceRubles: props.servicePriceRubles,
    priceProposal: props.priceProposal,
  });
  const [totalInput, setTotalInput] = useState(() => {
    if (props.totalAmountRubles != null) return String(props.totalAmountRubles);
    if (props.priceProposal != null) return String(props.priceProposal.amountRubles);
    if (props.servicePriceRubles != null) return String(props.servicePriceRubles);
    return "";
  });
  const [totalEditOpen, setTotalEditOpen] = useState(false);
  const [contractAmountInput, setContractAmountInput] = useState("");
  const [contractComment, setContractComment] = useState("");
  const [otherAmountInput, setOtherAmountInput] = useState("");
  const [otherComment, setOtherComment] = useState("");
  const [contractAddOpen, setContractAddOpen] = useState(false);
  const [otherAddOpen, setOtherAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onBusyChange = props.onBusyChange;
  useEffect(() => {
    onBusyChange?.(saving);
    return () => onBusyChange?.(false);
  }, [onBusyChange, saving]);

  const isBusy = Boolean(props.busy) || saving;
  const remaining = props.remainingAmountRubles;
  const payments = props.payments ?? [];
  const total = props.totalAmountRubles;
  const totalIsSet = total != null;
  const canEditTotal = permissions.canProposePrice;
  const isEditingTotal = canEditTotal && (props.priceProposal == null || totalEditOpen);
  const canAddContractPayments = permissions.canAddPayment;
  const canAddOtherPayments = permissions.canAddPayment;
  const canMarkPaid = permissions.canMarkPaid;
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

  async function proposePrice() {
    const rubles = parseRublesInput(totalInput);
    if (rubles == null) {
      setError("Укажите полную цену больше нуля (целое число рублей)");
      return;
    }
    setSaving(true);
    setPendingAction("total");
    setError(null);
    try {
      if (props.mode === "provider") {
        await proposeProRequestPrice(props.requestId, rubles);
      } else {
        await proposeCustomerRequestPrice(
          props.requestId,
          rubles,
          props.conversationId,
        );
      }
      setTotalInput("");
      setTotalEditOpen(false);
      await props.onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось предложить цену");
    } finally {
      setSaving(false);
      setPendingAction(null);
    }
  }

  async function acceptPrice() {
    if (!props.priceProposal || !permissions.canAcceptPrice || isBusy) return;
    setSaving(true);
    setPendingAction("accept-price");
    setError(null);
    try {
      if (props.mode === "provider") {
        await acceptProRequestPrice(props.requestId, props.priceProposal.id);
      } else {
        await acceptCustomerRequestPrice(
          props.requestId,
          props.priceProposal.id,
          props.conversationId,
        );
      }
      await props.onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось принять цену");
    } finally {
      setSaving(false);
      setPendingAction(null);
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
    setPendingAction(`add:${input.type}`);
    setError(null);
    try {
      const payload = { amountRubles: rubles, comment: trimmed, type: input.type };
      if (props.mode === "provider") {
        await addProRequestPayment(props.requestId, payload);
      } else {
        await addCustomerRequestPayment(
          props.requestId,
          payload,
          props.conversationId,
        );
      }
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
      setPendingAction(null);
    }
  }

  async function markPaid(paymentId: string) {
    if (!canMarkPaid || isBusy) return;
    const ok = await confirm({
      title: "Отметить как оплаченное?",
      description: "Стороны фиксируют, что эта сумма оплачена напрямую. Отметку нельзя снять.",
      confirmText: "Оплачено",
      confirmColor: "success",
    });
    if (!ok) return;

    setSaving(true);
    setPendingAction(`paid:${paymentId}`);
    setError(null);
    try {
      if (props.mode === "provider") {
        await markProRequestPaymentPaid(props.requestId, paymentId);
      } else {
        await markCustomerRequestPaymentPaid(
          props.requestId,
          paymentId,
          props.conversationId,
        );
      }
      await props.onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отметить платёж как оплаченный");
    } finally {
      setSaving(false);
      setPendingAction(null);
    }
  }

  return (
    <Stack spacing={1.5} sx={{ flex: 1, minHeight: "100%", minWidth: 0, maxWidth: "100%" }}>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {props.status === "COMPLETED"
          ? "Работы завершены. Здесь можно зафиксировать поступившие оплаты."
          : props.status === "CLOSED" || props.status === "CANCELLED"
            ? "Заявка закрыта. Здесь сохранена история цены и оплат."
            : permissions.canEditPrice
              ? "Одна сторона предлагает цену, противоположная — явно принимает"
              : "Согласованная цена работ и история оплат по заявке."}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        Оплата идёт напрямую между вами и {props.mode === "provider" ? "клиентом" : "исполнителем"}. Здесь вы фиксируете договорённости и отметки.
      </Typography>
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
              Цена работ
            </Typography>
            <PaymentAmountCell
              typographySx={PAYMENT_AMOUNT_TOTAL_TYPO_SX}
                action={
                canEditTotal && !isEditingTotal ? (
                  <Button
                    aria-label="Редактировать цену"
                    size="small"
                    disabled={isBusy}
                    onClick={() => {
                      setTotalInput(
                        formatRublesForInput(
                          props.priceProposal?.amountRubles ?? props.totalAmountRubles ?? props.servicePriceRubles ?? 0,
                        ),
                      );
                      setTotalEditOpen(true);
                    }}
                    startIcon={<EditOutlinedIcon fontSize="small" />}
                    sx={{ minWidth: 0, px: 0.5, color: "text.secondary" }}
                  >
                    <Typography component="span" variant="caption" sx={{ display: { xs: "inline", sm: "none" } }}>
                      Изменить
                    </Typography>
                  </Button>
                ) : null
              }
            >
              {totalIsSet
                ? `Согласовано: ${formatRubles(total)}`
                : props.priceProposal
                  ? `Предложено: ${formatRubles(props.priceProposal.amountRubles)}`
                  : "Цена не согласована"}
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
                  markPaidLoading={pendingAction === `paid:${payment.id}`}
                />
              ))
            ) : (
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  gridColumn: "1 / -1"
                }}>
                Оплат пока нет
              </Typography>
            )}

            {priceView.changedNote ? (
              <Typography variant="body2" sx={{ color: "text.secondary", gridColumn: "1 / -1" }}>
                {priceView.servicePriceLabel}. {priceView.changedNote}
              </Typography>
            ) : null}

            <Typography
              sx={{
                fontWeight: 700,
                gridColumn: 1,
                minWidth: 0,
                pt: 0.5
              }}>
              К оплате:
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
                    aria-label="Предложить цену"
                    color="primary"
                    loading={pendingAction === "total"}
                    disabled={isBusy}
                    onClick={() => void proposePrice()}
                  >
                    <CheckIcon />
                  </IconButton>
                  <Typography variant="caption" sx={{ display: { xs: "inline", sm: "none" }, color: "text.secondary" }}>
                    Предложить
                  </Typography>
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

              {permissions.canAcceptPrice && props.priceProposal ? (
                <Button
                  variant="contained"
                  color="success"
                  loading={pendingAction === "accept-price"}
                  disabled={isBusy}
                  onClick={() => void acceptPrice()}
                >
                  Принять {formatRubles(props.priceProposal.amountRubles)}
                </Button>
              ) : null}

              {priceView.servicePriceLabel &&
              ((totalIsSet && total !== props.servicePriceRubles) ||
                (isEditingTotal && parseRublesInput(totalInput) != null && parseRublesInput(totalInput) !== props.servicePriceRubles)) ? (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {priceView.servicePriceLabel}
                </Typography>
              ) : null}

              {canAddContractPayments && !isEditingTotal && !contractAddOpen ? (
                <AddPaymentTrigger disabled={isBusy} label="Добавить оплату" onClick={() => setContractAddOpen(true)} />
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
                    loading={pendingAction === "add:CONTRACT"}
                    disabled={isBusy || !canSubmitContract}
                    onClick={() => void addPayment({ type: "CONTRACT", amountInput: contractAmountInput, comment: contractComment })}
                  >
                    <QueueIcon />
                  </IconButton>
                  <Typography variant="caption" sx={{ display: { xs: "inline", sm: "none" }, color: "text.secondary" }}>
                    Добавить
                  </Typography>
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
              Дополнительные расходы
            </Typography>
            <PaymentAmountCell>{null}</PaymentAmountCell>
            {otherPayments.length > 0 ? (
              <Typography variant="body2" sx={{ color: "text.secondary", gridColumn: "1 / -1", overflowWrap: "anywhere" }}>
                Оплачено {formatRubles(otherPaidAmountRubles)} из {formatRubles(otherPayments.reduce((sum, item) => sum + item.amountRubles, 0))}
              </Typography>
            ) : null}

            {otherPayments.length > 0 ? (
              otherPayments.map((payment) => (
                <PaymentListRow
                  key={payment.id}
                  comment={payment.comment}
                  amountRubles={payment.amountRubles}
                  paid={Boolean(payment.paidAt)}
                  onMarkPaid={!payment.paidAt && canMarkPaid ? () => void markPaid(payment.id) : undefined}
                  markPaidDisabled={isBusy}
                  markPaidLoading={pendingAction === `paid:${payment.id}`}
                  authorCaption={expenseAuthorCaption(payment)}
                />
              ))
            ) : (
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  gridColumn: "1 / -1"
                }}>
                Дополнительных расходов пока нет
              </Typography>
            )}
          </Box>

          {canAddOtherPayments && !otherAddOpen ? (
            <Box sx={{ flexShrink: 0, pt: 1 }}>
              <AddPaymentTrigger disabled={isBusy} label="Добавить расход" onClick={() => setOtherAddOpen(true)} />
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
                loading={pendingAction === "add:OTHER"}
                disabled={isBusy || !canSubmitOther}
                onClick={() => void addPayment({ type: "OTHER", amountInput: otherAmountInput, comment: otherComment })}
              >
                    <QueueIcon />
                  </IconButton>
                  <Typography variant="caption" sx={{ display: { xs: "inline", sm: "none" }, color: "text.secondary" }}>
                    Добавить
                  </Typography>
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
