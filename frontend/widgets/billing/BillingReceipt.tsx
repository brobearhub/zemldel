"use client";

import Link from "next/link";
import { BillingPeriodSelector } from "./BillingPeriodSelector";
import {
  comparison,
  money,
  periodLabel,
  plans,
  productFor,
  productNames,
  statusNames,
  type BillingOverview,
  type BillingPeriod,
  type Product,
} from "./model";
import p from "./billing-paper.module.css";

function date(value: string) {
  return new Date(value).toLocaleDateString("ru-RU", {
    timeZone: "Europe/Moscow",
  });
}

export function BillingReceiptSummary({
  data,
  returnOrder,
}: {
  data: BillingOverview;
  returnOrder?: string;
}) {
  const paidPlan = data.plan === "LITE" || data.plan === "BUSINESS";
  const product = paidPlan
    ? productFor(data.plan as "LITE" | "BUSINESS", data.billingPeriod)
    : null;
  // The returned order can still be pending or failed. Never label it paid from the plan alone.
  const order =
    data.orders.find((item) => item.id === returnOrder) ??
    data.orders.find(
      (item) => item.product === product && item.status === "CONFIRMED",
    );
  return (
    <section className={p.summary} aria-labelledby="current-plan-title">
      <div className={p.receiptHeading}>
        <span className={p.brand}>Земледел</span>
        <span
          className={p.orderStatus}
          data-confirmed={order?.status === "CONFIRMED"}
        >
          {order
            ? (statusNames[order.status] ?? "Обрабатывается банком")
            : "Текущий тариф"}
        </span>
      </div>
      <div className={p.planHeading}>
        <h2 id="current-plan-title">{productNames[data.plan]}</h2>
        <span>
          {product
            ? `${money(data.catalog[product].amount)} ₽ / ${periodLabel(data.billingPeriod)}`
            : "Бесплатно"}
        </span>
      </div>
      <p className={p.muted}>
        {paidPlan && data.planExpiresAt
          ? `Оплата за ${periodLabel(data.billingPeriod)}. Действует до ${date(data.planExpiresAt)}`
          : "Без срока действия"}
      </p>
      {order && (
        <div className={p.paymentTotal}>
          <div>
            <span className={p.caption}>
              {order.status === "CONFIRMED" ? "Оплачено" : "Сумма платежа"}
            </span>
            <p className={p.muted}>
              {productNames[order.product] ?? "Платёж"} /{" "}
              {date(order.createdAt)}
            </p>
          </div>
          <strong>{money(order.amount)} ₽</strong>
        </div>
      )}
    </section>
  );
}

export function BillingPlanFeatures({ data }: { data: BillingOverview }) {
  const entitlementIndex = plans.findIndex(
    (plan) => plan.id === data.entitlementPlan,
  );
  return (
    <section
      className={`${p.section} ${p.featuresSection}`}
      aria-labelledby="plan-features-title"
    >
      <h2 id="plan-features-title" className={p.sectionTitle}>
        01 / Возможности вашего тарифа
      </h2>
      <dl className={p.features}>
        {comparison.map(([label, ...values]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{values[entitlementIndex >= 0 ? entitlementIndex : 0]}</dd>
          </div>
        ))}
      </dl>
      <p className={p.included}>
        На всех тарифах: отклики и регионы без ограничений, команда и шаблоны.
      </p>
      <p className={p.muted}>
        Лимит историй общий для профиля и сотрудников. Обновляется в полночь
        по часовому поясу профиля.
      </p>
    </section>
  );
}

export function BillingPlanChoices({
  data,
  period,
  onPeriodChange,
  onSelect,
  disabled,
  busy,
}: {
  data: BillingOverview;
  period: BillingPeriod;
  onPeriodChange: (period: BillingPeriod) => void;
  onSelect: (product: Product) => void;
  disabled: boolean;
  busy: boolean;
}) {
  return (
    <section
      className={`${p.section} ${p.choicesSection}`}
      aria-labelledby="plan-choice-title"
    >
      <div className={p.sectionHeading}>
        <h2 id="plan-choice-title" className={p.sectionTitle}>
          02 / Тариф и период
        </h2>
        <Link href="/pricing">Сравнить возможности →</Link>
      </div>
      <BillingPeriodSelector
        value={period}
        onChange={onPeriodChange}
        disabled={busy}
        className={p.periods}
      />
      <ul className={p.plans}>
        {plans.map((plan, index) => {
          const product =
            plan.id !== "STANDARD" ? productFor(plan.id, period) : null;
          const current =
            data.plan === plan.id &&
            (plan.id === "STANDARD" ||
              (data.billingPeriod === period &&
                !!data.planExpiresAt &&
                new Date(data.planExpiresAt) > new Date()));
          return (
            <li key={plan.id}>
              <div>
                <h3>{plan.name}</h3>
                <p className={p.muted}>
                  {comparison[1][index + 1]}{" "}
                  {plan.id === "STANDARD" ? "история" : "историй"} / сутки ·{" "}
                  {comparison[5][index + 1]} фото в услуге
                </p>
              </div>
              <div className={p.planPrice}>
                <strong>
                  {product
                    ? `${money(data.catalog[product].amount)} ₽ / ${periodLabel(period)}`
                    : "Бесплатно"}
                </strong>
                <span className={p.muted}>
                  {plan.id === "STANDARD"
                    ? "Без срока действия"
                    : period === "YEAR"
                      ? "Скидка 10%. Вся сумма сразу"
                      : `Или ${money(data.catalog[productFor(plan.id, "YEAR")].amount)} ₽ сразу за год`}
                </span>
                {product ? (
                  <button
                    type="button"
                    className={p.textButton}
                    aria-label={`${plan.name}${current ? " подключён" : ""} · ${money(data.catalog[product].amount)} ₽ / ${periodLabel(period)}`}
                    disabled={disabled || current}
                    onClick={() => onSelect(product)}
                  >
                    {current ? "Подключён ✓" : "Выбрать →"}
                  </button>
                ) : (
                  <span className={p.included}>
                    {current
                      ? "Подключён ✓"
                      : !data.autoRenew &&
                          !data.renewalPending &&
                          data.nextPlan !== "LITE" &&
                          data.nextPlan !== "BUSINESS" &&
                          data.planExpiresAt
                        ? `После ${date(data.planExpiresAt)}`
                        : "При отключении продления"}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p>
        За год — скидка 10%, вся сумма сразу. Возможности тарифа одинаковые при
        любом периоде оплаты.
      </p>
      <p className={p.muted}>
        При повышении тарифа или переходе на год учтём остаток оплаченного
        срока. Понижение тарифа и переход с года на месяц — после его окончания.
      </p>
    </section>
  );
}
