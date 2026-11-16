"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  NoSsr,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  formatRubles,
  parseRublesInput,
  resolveRequestFinanceSummary,
  resolveRequestPriceView,
  type RequestPaymentItemDto,
  type RequestPaymentType,
  type RequestPriceProposalDto,
  type RequestStatus,
} from "@/entities/request";
import {
  addCustomerRequestPayment,
  addProRequestPayment,
  markCustomerRequestPaymentPaid,
  markProRequestPaymentPaid,
  proposeProRequestPrice,
} from "@/entities/request/api/request-payments";
import { useConfirm } from "@/shared/ui/confirm";
import { resolveRequestPaymentPermissions } from "../model/request-payment-permissions";

const WIDE_PAYMENT_LAYOUT = "@container request-payments (min-width: 840px)";
const WIDE_PAYMENT_LIST_LAYOUT =
  "@container request-payment-list (min-width: 520px)";
const paymentLeaderStyles = {
  minWidth: 0,
  borderBottom: "1px dotted",
  borderColor: "divider",
  transform: "translateY(5px)",
} as const;
const paymentFormStyles = {
  pt: 1,
  "& .MuiButton-root.MuiButton-sizeSmall": {
    minHeight: 0,
  },
  "&::before": {
    content: '""',
    display: "block",
    mx: { xs: -2, sm: -2.5 },
    mb: 1,
    borderTop: 1,
    borderColor: "divider",
  },
} as const;
const paymentDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const paymentDateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "long",
  timeStyle: "short",
});

function amountLabel(amount: number | null): string {
  return amount == null ? "—" : formatRubles(amount);
}

function PaymentSummaryRow({
  caption,
  expanded,
  contentId,
  sectionName,
  onToggle,
  action,
}: {
  caption: string;
  expanded: boolean;
  contentId: string;
  sectionName: string;
  onToggle: () => void;
  action?: ReactNode;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto 48px",
        columnGap: 1,
        alignItems: "center",
        px: { xs: 2, sm: 2.5 },
        pt: 1,
      }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          gridColumn: 1,
          gridRow: 1,
          minWidth: 0,
        }}
      >
        {caption}
      </Typography>
      {action ? (
        <Box
          sx={{
            gridColumn: 2,
            gridRow: 1,
            justifySelf: "end",
            "@container request-payments (max-width: 520px)": {
              gridColumn: "1 / 4",
              gridRow: 2,
            },
          }}
        >
          {action}
        </Box>
      ) : null}
      <IconButton
        size="small"
        color="inherit"
        aria-expanded={expanded}
        aria-controls={contentId}
        aria-label={`${expanded ? "Свернуть" : "Развернуть"}: ${sectionName}`}
        onClick={onToggle}
        sx={{
          gridColumn: 3,
          gridRow: 1,
          width: 48,
          height: 48,
          color: "text.secondary",
        }}
      >
        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </IconButton>
    </Box>
  );
}

function WorkPriceSection({
  amount,
  paid,
  remaining,
  overpaid,
  hasPayments,
  hasDetails,
  expanded,
  onToggle,
  onEntered,
  action,
  children,
}: {
  amount: number | null;
  paid: number;
  remaining: number | null;
  overpaid: number;
  hasPayments: boolean;
  hasDetails: boolean;
  expanded: boolean;
  onToggle: () => void;
  onEntered: () => void;
  action: ReactNode;
  children: ReactNode;
}) {
  const contentId = useId();
  const paymentCaption =
    overpaid > 0
      ? `Переплата за работы ${formatRubles(overpaid)}`
      : amount != null && remaining === 0
        ? "Оплачено полностью"
        : paid > 0
          ? `Оплачено ${formatRubles(paid)}${remaining == null ? "" : ` · Осталось ${formatRubles(remaining)}`}`
          : amount == null
            ? "Цена пока не установлена"
            : hasPayments
              ? "Оплат не отмечено"
              : "Оплат пока нет";
  const price = (
    <Typography
      sx={{
        fontSize: "1.5rem",
        lineHeight: "32px",
        fontWeight: 700,
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
      }}
    >
      {amountLabel(amount)}
    </Typography>
  );

  return (
    <Box
      component="section"
      aria-label="Стоимость работ"
      sx={{
        minWidth: 0,
      }}
    >
      <Stack
        spacing={0}
        sx={{
          pb: 1.5,
        }}
      >
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            alignItems: "center",
            px: { xs: 2, sm: 2.5 },
            pt: 1.5,
            pb: 1,
            minHeight: 68,
            bgcolor: "background.secondary",
          }}
        >
          <Typography
            component="h3"
            sx={{
              flex: 1,
              minWidth: 0,
              fontSize: "1.125rem",
              lineHeight: "28px",
              fontWeight: 700,
            }}
          >
            Цена работ
          </Typography>
          {price}
        </Stack>
        <PaymentSummaryRow
          caption={paymentCaption}
          expanded={expanded}
          contentId={contentId}
          sectionName="Стоимость работ"
          onToggle={onToggle}
          action={expanded ? action : null}
        />
      </Stack>
      <Collapse in={expanded && hasDetails} onEntered={onEntered}>
        <Stack
          id={contentId}
          spacing={2}
          sx={{
            px: { xs: 2, sm: 2.5 },
            pb: { xs: 2, sm: 2.5 },
            minWidth: 0,
          }}
        >
          {children}
        </Stack>
      </Collapse>
    </Box>
  );
}

function MoneyRow({
  label,
  amount,
  emphasized = false,
}: {
  label: string;
  amount: number | null;
  emphasized?: boolean;
}) {
  return (
    <Stack
      direction="row"
      spacing={2}
      useFlexGap
      sx={{
        alignItems: "baseline",
        justifyContent: "space-between",
        flexWrap: "wrap",
      }}
    >
      <Typography
        variant="body2"
        sx={{
          fontWeight: emphasized ? 700 : 400,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
      >
        {amountLabel(amount)}
      </Typography>
    </Stack>
  );
}

function ExpenseSection({
  amount,
  paid,
  remaining,
  expanded,
  onToggle,
  onEntered,
  children,
}: {
  amount: number;
  paid: number;
  remaining: number;
  expanded: boolean;
  onToggle: () => void;
  onEntered?: () => void;
  children: ReactNode;
}) {
  const id = useId();
  const titleId = `${id}-title`;
  const contentId = `${id}-content`;
  const paymentCaption =
    amount > 0 && remaining === 0
      ? "Оплачено полностью"
      : `Оплачено ${formatRubles(paid)} · Осталось ${formatRubles(remaining)}`;

  return (
    <Box
      component="section"
      aria-labelledby={titleId}
      sx={{
        minWidth: 0,
        borderRadius: 1.5,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        overflow: "hidden",
        bgcolor: "background.paper",
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: "center",
          px: { xs: 2, sm: 2.5 },
          pt: 1.5,
          pb: 1,
          minHeight: 68,
          bgcolor: "background.secondary",
          "@container request-payments (max-width: 320px)": {
            flexWrap: "wrap",
            justifyContent: "flex-end",
          },
        }}
      >
        <Typography
          id={titleId}
          component="h3"
          sx={{
            flex: 1,
            minWidth: 0,
            fontSize: "1.125rem",
            lineHeight: "28px",
            fontWeight: 700,
            "@container request-payments (max-width: 320px)": {
              flexBasis: "100%",
            },
          }}
        >
          Дополнительные расходы
        </Typography>
        <Typography
          sx={{
            fontSize: "1.5rem",
            lineHeight: "32px",
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
          }}
        >
          {formatRubles(amount)}
        </Typography>
      </Stack>
      <Box
        sx={{
          pb: expanded ? 0 : 1.5,
        }}
      >
        <PaymentSummaryRow
          caption={paymentCaption}
          expanded={expanded}
          contentId={contentId}
          sectionName="Дополнительные расходы"
          onToggle={onToggle}
        />
      </Box>
      <Collapse in={expanded} onEntered={onEntered}>
        <Stack
          id={contentId}
          spacing={0.5}
          sx={{
            px: { xs: 2, sm: 2.5 },
            pt: 1.5,
            pb: 1.5,
            minWidth: 0,
          }}
        >
          {children}
        </Stack>
      </Collapse>
    </Box>
  );
}

function PaymentListRow({
  payment,
  onMarkPaid,
  busy,
  loading,
}: {
  payment: RequestPaymentItemDto;
  onMarkPaid?: () => void;
  busy: boolean;
  loading: boolean;
}) {
  const id = useId();
  const paid = payment.paidAt != null;
  const paidAt = payment.paidAt ? new Date(payment.paidAt) : null;
  const paymentDateLabel =
    paidAt && !Number.isNaN(paidAt.getTime())
      ? paymentDateFormatter.format(paidAt)
      : null;
  const paymentDateTitle =
    paymentDateLabel && paidAt
      ? `Оплачено ${paymentDateTimeFormatter.format(paidAt)}`
      : undefined;

  return (
    <Box
      role="group"
      aria-labelledby={id}
      sx={{
        display: "grid",
        gridTemplateColumns: "88px minmax(0, 1fr) max-content 48px",
        alignItems: "center",
        columnGap: 1,
        minHeight: 48,
        minWidth: 0,
        [WIDE_PAYMENT_LIST_LAYOUT]: {
          // Anchor dates to the row width so different titles and amounts do not move them.
          gridTemplateColumns:
            "minmax(0, calc(68% - 130.5px)) 96px minmax(12px, 1fr) max-content 64px",
          columnGap: 1.5,
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          minWidth: 0,
          gridColumn: "1 / -1",
          gridRow: 1,
          [WIDE_PAYMENT_LIST_LAYOUT]: {
            gridColumn: 1,
          },
        }}
      >
        <Typography
          variant="body2"
          sx={{
            minWidth: 0,
            overflowWrap: "anywhere",
          }}
        >
          <Box component="span" id={id}>
            {payment.comment}
          </Box>
        </Typography>
        <Box
          aria-hidden="true"
          sx={{
            ...paymentLeaderStyles,
            display: "none",
            flex: 1,
            minWidth: 12,
            [WIDE_PAYMENT_LIST_LAYOUT]: {
              display: "block",
            },
          }}
        />
      </Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          minWidth: 0,
          gridColumn: 1,
          gridRow: 2,
          [WIDE_PAYMENT_LIST_LAYOUT]: {
            gridColumn: 2,
            gridRow: 1,
            justifyContent: "center",
          },
        }}
      >
        {paymentDateLabel ? (
          <NoSsr>
            <Typography
              component="time"
              variant="body2"
              dateTime={payment.paidAt ?? undefined}
              title={paymentDateTitle}
              sx={{
                color: "text.secondary",
                whiteSpace: "nowrap",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {paymentDateLabel}
            </Typography>
          </NoSsr>
        ) : (
          <Box
            aria-hidden="true"
            sx={{
              ...paymentLeaderStyles,
              width: "100%",
            }}
          />
        )}
      </Box>
      <Box
        aria-hidden="true"
        sx={{
          ...paymentLeaderStyles,
          gridColumn: 2,
          gridRow: 2,
          [WIDE_PAYMENT_LIST_LAYOUT]: {
            gridColumn: 3,
            gridRow: 1,
          },
        }}
      />
      <Typography
        variant="body2"
        sx={{
          gridColumn: 3,
          gridRow: 2,
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
          textAlign: "right",
          [WIDE_PAYMENT_LIST_LAYOUT]: {
            gridColumn: 4,
            gridRow: 1,
          },
        }}
      >
        {formatRubles(payment.amountRubles)}
      </Typography>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          gridColumn: 4,
          gridRow: 2,
          [WIDE_PAYMENT_LIST_LAYOUT]: {
            gridColumn: 5,
            gridRow: 1,
          },
        }}
      >
        <Checkbox
          size="small"
          checked={paid}
          disabled={busy || paid || !onMarkPaid}
          onChange={onMarkPaid}
          slotProps={{
            input: {
              "aria-label": `${paid ? "Оплачено" : "Оплата"}: ${payment.comment}, ${formatRubles(payment.amountRubles)}`,
              "aria-busy": loading,
            },
          }}
          icon={
            loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <Box
                component="span"
                sx={{
                  width: 20,
                  height: 20,
                  border: "1px solid",
                  borderColor: "currentColor",
                  borderRadius: "4px",
                }}
              />
            )
          }
          sx={{
            width: 48,
            height: 48,
            color: "text.secondary",
            "& .MuiSvgIcon-root": {
              fontSize: 20,
            },
            "&.Mui-checked.Mui-disabled": {
              color: "primary.main",
            },
            "&.Mui-focusVisible": {
              outline: "2px solid currentColor",
              outlineOffset: 2,
            },
          }}
        />
      </Box>
    </Box>
  );
}

function PaymentList({
  payments,
  onMarkPaid,
  busy,
  pendingAction,
}: {
  payments: readonly RequestPaymentItemDto[];
  onMarkPaid?: (paymentId: string) => void;
  busy: boolean;
  pendingAction: string | null;
}) {
  return (
    <Stack
      spacing={0.5}
      sx={{
        minWidth: 0,
        containerType: "inline-size",
        containerName: "request-payment-list",
      }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          alignSelf: "flex-end",
          width: 48,
          textAlign: "center",
          whiteSpace: "nowrap",
          [WIDE_PAYMENT_LIST_LAYOUT]: {
            width: 64,
          },
        }}
      >
        Оплата
      </Typography>
      {payments.map((payment) => (
        <PaymentListRow
          key={payment.id}
          payment={payment}
          busy={busy}
          loading={pendingAction === `paid:${payment.id}`}
          onMarkPaid={onMarkPaid ? () => onMarkPaid(payment.id) : undefined}
        />
      ))}
    </Stack>
  );
}

function sortPayments(
  a: RequestPaymentItemDto,
  b: RequestPaymentItemDto,
): number {
  if (a.paidAt == null && b.paidAt != null) return -1;
  if (a.paidAt != null && b.paidAt == null) return 1;
  return (
    new Date(b.paidAt ?? b.createdAt).getTime() -
    new Date(a.paidAt ?? a.createdAt).getTime()
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
  const contractAmountRef = useRef<HTMLInputElement>(null);
  const permissions = resolveRequestPaymentPermissions({
    status: props.status,
    mode: props.mode,
    isLocked: Boolean(props.isLocked),
    canProposePrice: props.canProposePrice,
  });
  const priceView = resolveRequestPriceView(props);
  const summary = resolveRequestFinanceSummary(props);
  const payments = props.payments;
  const pendingPriceProposal =
    props.priceProposal?.acceptedAt == null ? props.priceProposal : null;
  const total = props.totalAmountRubles;
  const totalIsSet = total != null;
  const contractPayments = payments
    .filter((payment) => payment.type === "CONTRACT")
    .sort(sortPayments);
  const otherPayments = payments
    .filter((payment) => payment.type === "OTHER")
    .sort(sortPayments);

  const [workExpanded, setWorkExpanded] = useState(false);
  const [expensesExpanded, setExpensesExpanded] = useState(false);
  const [totalInput, setTotalInput] = useState(() => {
    const initial =
      total ?? pendingPriceProposal?.amountRubles ?? props.servicePriceRubles;
    return initial == null ? "" : String(initial);
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

  useEffect(() => {
    if (contractAddOpen) contractAmountRef.current?.focus();
  }, [contractAddOpen]);

  const isBusy = Boolean(props.busy) || saving;
  const canMarkPaid = permissions.canMarkPaid;
  const isEditingTotal =
    permissions.canEditPrice && totalEditOpen;
  const canSubmitContract =
    parseRublesInput(contractAmountInput) != null &&
    contractComment.trim().length > 0;
  const canSubmitOther =
    parseRublesInput(otherAmountInput) != null &&
    otherComment.trim().length > 0;

  function closeContractForm() {
    setContractAddOpen(false);
    setContractAmountInput("");
    setContractComment("");
  }

  function closeExpenseForm() {
    setOtherAddOpen(false);
    setOtherAmountInput("");
    setOtherComment("");
  }

  async function changePrice() {
    if (!permissions.canEditPrice || isBusy) return;
    const rubles = parseRublesInput(totalInput);
    if (rubles == null) {
      setError("Укажите цену работ больше нуля (целое число рублей)");
      return;
    }
    setSaving(true);
    setPendingAction("total");
    setError(null);
    try {
      await proposeProRequestPrice(props.requestId, rubles);
      setTotalInput("");
      setTotalEditOpen(false);
      try {
        await props.onChanged?.();
      } catch {
        setError("Цена сохранена, но не удалось обновить данные. Обновите страницу.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось изменить цену");
    } finally {
      setSaving(false);
      setPendingAction(null);
    }
  }

  async function addPayment(input: {
    type: RequestPaymentType;
    amountInput: string;
    comment: string;
  }) {
    if (!permissions.canAddPayment || isBusy) return;
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
      const payload = {
        amountRubles: rubles,
        comment: trimmed,
        type: input.type,
      };
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
      setError(
        e instanceof Error ? e.message : "Не удалось добавить поступление",
      );
    } finally {
      setSaving(false);
      setPendingAction(null);
    }
  }

  async function markPaid(paymentId: string) {
    if (!canMarkPaid || isBusy) return;
    const payment = payments.find((item) => item.id === paymentId);
    if (!payment || payment.paidAt) return;
    const ok = await confirm({
      title: "Отметить как оплаченное?",
      description:
        `${payment.comment}: ${formatRubles(payment.amountRubles)}. ` +
        "Стороны фиксируют, что эта сумма оплачена напрямую. Отметку нельзя снять.",
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
      setError(
        e instanceof Error
          ? e.message
          : "Не удалось отметить платёж как оплаченный",
      );
    } finally {
      setSaving(false);
      setPendingAction(null);
    }
  }

  return (
    <Stack
      spacing={2.5}
      sx={{
        flex: 1,
        minWidth: 0,
        maxWidth: "100%",
        containerType: "inline-size",
        containerName: "request-payments",
        "& .MuiButton-root": {
          minHeight: 48,
          fontSize: "1rem",
          lineHeight: 1.5,
        },
      }}
    >
      {props.status === "COMPLETED" ||
      props.status === "CANCELLED" ||
      props.status === "CLOSED" ? (
        <Typography variant="body2" color="text.secondary">
          {props.status === "COMPLETED"
            ? "Работы завершены. Здесь можно зафиксировать поступившие оплаты."
            : "Заявка закрыта. Здесь сохранена история цены и оплат."}
        </Typography>
      ) : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: 3,
          alignItems: "start",
          [WIDE_PAYMENT_LAYOUT]: {
            gridTemplateColumns: "minmax(0, 1fr) 320px",
          },
        }}
      >
        <Paper
          component="section"
          aria-label="Итог по заявке"
          elevation={0}
          sx={(theme) => ({
            p: { xs: 2, sm: 3 },
            minWidth: 0,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.primary.main, 0.18),
            [WIDE_PAYMENT_LAYOUT]: {
              gridColumn: 2,
              gridRow: 1,
              position: "sticky",
              top: 24,
            },
          })}
        >
          <Stack spacing={2.5}>
            <Box aria-live="polite" aria-atomic="true">
              <Typography variant="body2" color="text.secondary">
                Всего по заявке
              </Typography>
              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: "2.25rem",
                  lineHeight: 1.25,
                  fontWeight: 800,
                  fontVariantNumeric: "tabular-nums",
                  overflowWrap: "anywhere",
                }}
              >
                {amountLabel(summary.totalAmountRubles)}
              </Typography>
            </Box>
            <Stack spacing={1}>
              <MoneyRow label="Стоимость работ" amount={total} />
              <MoneyRow label="Расходы" amount={summary.expensesAmountRubles} />
            </Stack>
            <Divider />
            <Stack spacing={1}>
              <MoneyRow label="Оплачено" amount={summary.paidAmountRubles} />
              <MoneyRow
                label="Осталось"
                amount={summary.remainingAmountRubles}
                emphasized
              />
              {summary.overpaidWorkAmountRubles > 0 ? (
                <MoneyRow
                  label="Переплата за работы"
                  amount={summary.overpaidWorkAmountRubles}
                />
              ) : null}
            </Stack>
            <Typography
              variant="body2"
              color="text.secondary"
              aria-label="Описание итога по заявке"
              sx={{
                fontStyle: "italic",
                fontSize: "0.875rem",
              }}
            >
              {!totalIsSet
                ? "Общий итог появится после указания цены работ. Расходы учтены отдельно."
                : summary.overpaidWorkAmountRubles > 0
                  ? "Переплата за работы не погашает дополнительные расходы автоматически."
                  : "Включает работы и все добавленные расходы."}
            </Typography>
          </Stack>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            minWidth: 0,
            borderRadius: 2,
            overflow: "hidden",
            [WIDE_PAYMENT_LAYOUT]: {
              gridColumn: 1,
              gridRow: 1,
            },
          }}
        >
          <WorkPriceSection
            amount={total}
            paid={props.paidAmountRubles}
            remaining={summary.remainingWorkAmountRubles}
            overpaid={summary.overpaidWorkAmountRubles}
            hasPayments={contractPayments.length > 0}
            hasDetails={
              (pendingPriceProposal != null && permissions.canEditPrice) ||
              isEditingTotal ||
              contractPayments.length > 0 ||
              contractAddOpen ||
              permissions.canAddPayment
            }
            expanded={workExpanded}
            onToggle={() => setWorkExpanded((value) => !value)}
            onEntered={() => {
              if (!contractAddOpen) return;
              contractAmountRef.current?.scrollIntoView?.({
                block: "center",
                behavior: "smooth",
              });
              contractAmountRef.current?.focus({ preventScroll: true });
            }}
            action={
              !isEditingTotal && permissions.canEditPrice ? (
                <Button
                  variant="text"
                  color="primary"
                  size="small"
                  disabled={isBusy}
                  onClick={() => {
                    const current =
                      total ??
                      pendingPriceProposal?.amountRubles ??
                      props.servicePriceRubles;
                    setTotalInput(current == null ? "" : String(current));
                    setTotalEditOpen(true);
                  }}
                  sx={{
                    fontWeight: 600,
                    "&&": {
                      minHeight: 0,
                    },
                  }}
                >
                  Изменить цену
                </Button>
              ) : null
            }
          >
            {pendingPriceProposal && permissions.canEditPrice && !isEditingTotal ? (
              <Alert
                severity="info"
                icon={false}
                sx={{
                  bgcolor: "action.hover",
                  color: "text.primary",
                }}
              >
                Ранее указано {formatRubles(pendingPriceProposal.amountRubles)}.
                {total == null
                  ? " Сохраните цену работ."
                  : ` Текущая цена работ — ${formatRubles(total)}.`}
              </Alert>
            ) : null}
            {isEditingTotal ? (
              <Stack
                component="form"
                aria-label="Изменение цены работ"
                spacing={1.5}
                onSubmit={(event) => {
                  event.preventDefault();
                  void changePrice();
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Укажите стоимость работ.
                </Typography>
                <TextField
                  label="Цена работ, ₽"
                  placeholder="Напр. 12000"
                  value={totalInput}
                  onChange={(event) => setTotalInput(event.target.value)}
                  disabled={isBusy}
                  size="small"
                  slotProps={{
                    htmlInput: {
                      inputMode: "numeric",
                    },
                  }}
                />
                {priceView.servicePriceLabel ? (
                  <Typography variant="body2" color="text.secondary">
                    {priceView.servicePriceLabel}
                  </Typography>
                ) : null}
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{
                    flexWrap: "wrap",
                  }}
                >
                  <Button
                    type="submit"
                    variant="contained"
                    size="small"
                    loading={pendingAction === "total"}
                    disabled={isBusy || parseRublesInput(totalInput) == null}
                  >
                    Изменить цену
                  </Button>
                  <Button
                    size="small"
                    color="inherit"
                    disabled={isBusy}
                    onClick={() => setTotalEditOpen(false)}
                  >
                    Отмена
                  </Button>
                </Stack>
              </Stack>
            ) : null}
            {contractPayments.length > 0 ? (
              <PaymentList
                payments={contractPayments}
                busy={isBusy}
                pendingAction={pendingAction}
                onMarkPaid={canMarkPaid ? (id) => void markPaid(id) : undefined}
              />
            ) : null}
            {permissions.canAddPayment && !contractAddOpen ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <Button
                  variant="text"
                  color="primary"
                  size="small"
                  startIcon={<AddIcon />}
                  disabled={isBusy}
                  onClick={() => {
                    setWorkExpanded(true);
                    setContractAddOpen(true);
                  }}
                  sx={{
                    color: "text.primary",
                  }}
                >
                  Добавить оплату
                </Button>
              </Box>
            ) : null}
            {permissions.canAddPayment && contractAddOpen ? (
              <Stack
                component="form"
                aria-label="Новая оплата за работы"
                spacing={1.5}
                onSubmit={(event) => {
                  event.preventDefault();
                  void addPayment({
                    type: "CONTRACT",
                    amountInput: contractAmountInput,
                    comment: contractComment,
                  });
                }}
                sx={paymentFormStyles}
              >
                <Stack
                  direction="row"
                  sx={{
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="subtitle2" component="h4">
                    Новая оплата за работы
                  </Typography>
                  <IconButton
                    aria-label="Закрыть форму оплаты"
                    size="small"
                    disabled={isBusy}
                    onClick={closeContractForm}
                    sx={{
                      width: 48,
                      height: 48,
                      flexShrink: 0,
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Stack>
                <TextField
                  inputRef={contractAmountRef}
                  label="Сумма, ₽"
                  placeholder="Напр. 6000"
                  value={contractAmountInput}
                  onChange={(event) =>
                    setContractAmountInput(event.target.value)
                  }
                  disabled={isBusy}
                  size="small"
                  slotProps={{
                    htmlInput: {
                      inputMode: "numeric",
                    },
                  }}
                />
                <TextField
                  label="Назначение платежа"
                  placeholder="Напр. Аванс за подготовку документов"
                  value={contractComment}
                  onChange={(event) => setContractComment(event.target.value)}
                  disabled={isBusy}
                  size="small"
                />
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{
                    flexWrap: "wrap",
                  }}
                >
                  <Button
                    type="submit"
                    variant="contained"
                    size="small"
                    aria-label="Добавить оплату за работы"
                    loading={pendingAction === "add:CONTRACT"}
                    disabled={isBusy || !canSubmitContract}
                  >
                    Добавить
                  </Button>
                  <Button
                    size="small"
                    color="inherit"
                    disabled={isBusy}
                    onClick={closeContractForm}
                  >
                    Отмена
                  </Button>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  После добавления отметьте факт оплаты, когда деньги будут
                  переведены.
                </Typography>
              </Stack>
            ) : null}
          </WorkPriceSection>
          <ExpenseSection
            amount={summary.expensesAmountRubles}
            paid={summary.paidExpensesAmountRubles}
            remaining={summary.remainingExpensesAmountRubles}
            expanded={expensesExpanded}
            onToggle={() => setExpensesExpanded((value) => !value)}
          >
            {otherPayments.length > 0 ? (
              <PaymentList
                payments={otherPayments}
                busy={isBusy}
                pendingAction={pendingAction}
                onMarkPaid={canMarkPaid ? (id) => void markPaid(id) : undefined}
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                Расходов пока нет
              </Typography>
            )}
            {permissions.canAddPayment && !otherAddOpen ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  pt: 1.5,
                }}
              >
                <Button
                  variant="text"
                  color="primary"
                  size="small"
                  aria-label="Добавить расход"
                  startIcon={<AddIcon />}
                  disabled={isBusy}
                  onClick={() => setOtherAddOpen(true)}
                  sx={{
                    color: "text.primary",
                  }}
                >
                  Добавить расход
                </Button>
              </Box>
            ) : null}
            {permissions.canAddPayment && otherAddOpen ? (
              <Stack
                component="form"
                aria-label="Новый расход"
                spacing={1.5}
                onSubmit={(event) => {
                  event.preventDefault();
                  void addPayment({
                    type: "OTHER",
                    amountInput: otherAmountInput,
                    comment: otherComment,
                  });
                }}
                sx={paymentFormStyles}
              >
                <Stack
                  direction="row"
                  sx={{
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="subtitle2" component="h4">
                    Новый расход
                  </Typography>
                  <IconButton
                    aria-label="Закрыть форму расхода"
                    size="small"
                    disabled={isBusy}
                    onClick={closeExpenseForm}
                    sx={{
                      width: 48,
                      height: 48,
                      flexShrink: 0,
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Stack>
                <TextField
                  label="Название расхода"
                  placeholder="Напр. Услуги инженера"
                  value={otherComment}
                  onChange={(event) => setOtherComment(event.target.value)}
                  disabled={isBusy}
                  size="small"
                />
                <TextField
                  label="Сумма, ₽"
                  placeholder="Напр. 3000"
                  value={otherAmountInput}
                  onChange={(event) => setOtherAmountInput(event.target.value)}
                  disabled={isBusy}
                  size="small"
                  slotProps={{
                    htmlInput: {
                      inputMode: "numeric",
                    },
                  }}
                />
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{
                    flexWrap: "wrap",
                  }}
                >
                  <Button
                    type="submit"
                    variant="contained"
                    size="small"
                    aria-label="Сохранить расход"
                    loading={pendingAction === "add:OTHER"}
                    disabled={isBusy || !canSubmitOther}
                  >
                    Добавить
                  </Button>
                  <Button
                    size="small"
                    color="inherit"
                    disabled={isBusy}
                    onClick={closeExpenseForm}
                  >
                    Отмена
                  </Button>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  После добавления отметьте факт оплаты, когда деньги будут
                  переведены.
                </Typography>
              </Stack>
            ) : null}
          </ExpenseSection>
        </Paper>
      </Box>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          pt: 2,
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        Оплата проходит напрямую между клиентом и исполнителем. Здесь вы
        фиксируете суммы и отмечаете оплату.
      </Typography>
    </Stack>
  );
}
