"use client";
import { useState } from "react";
import Link from "next/link";
import {
  comparison,
  plans,
  money,
  productFor,
  periodLabel,
  type BillingPeriod,
  type BillingCatalog,
} from "./model";
import { BillingPeriodSelector } from "./BillingPeriodSelector";
import s from "./billing.module.css";

export function PlanComparison({ catalog }: { catalog: BillingCatalog }) {
  const [selected, setSelected] = useState(2);
  const [period, setPeriod] = useState<BillingPeriod>("MONTH");
  return (
    <>
      <BillingPeriodSelector
        value={period}
        onChange={setPeriod}
      />
      <p className={s.muted}>
        При оплате за год скидка 10%. Вся сумма оплачивается сразу.
      </p>
      <div
        className={s.tabs}
        aria-label="Выбор тарифа для сравнения"
      >
        {plans.map((plan, index) => (
          <button
            key={plan.id}
            type="button"
            className={index === selected ? s.button : s.secondary}
            aria-pressed={index === selected}
            onClick={() => setSelected(index)}
          >
            {plan.name}
          </button>
        ))}
      </div>
      <div className={s.tableWrap}>
        <table
          className={s.table}
          aria-label="Сравнение тарифов исполнителя"
        >
          <thead>
            <tr>
              <th scope="col">
                Возможности
                <br />
                <span className={s.muted}>Для вашего профиля исполнителя</span>
              </th>
              {plans.map((plan, index) => (
                <th
                  key={plan.id}
                  scope="col"
                  data-hidden={index !== selected}
                >
                  <div className={s.planName}>{plan.name}</div>
                  <span className={s.price}>
                    {plan.id === "STANDARD"
                      ? "Бесплатно"
                      : `${money(catalog[productFor(plan.id, period)].amount)} ₽`}
                  </span>
                  <span className={s.muted}>
                    {plan.id === "STANDARD"
                      ? "Без срока действия"
                      : `за ${periodLabel(period)}`}
                  </span>
                  <p className={s.muted}>{plan.description}</p>
                  <Link
                    className={`${s.button} ${s.wide}`}
                    href={`/pro/settings/tariff${plan.id !== "STANDARD" ? `?product=${productFor(plan.id, period)}` : ""}`}
                  >
                    {plan.id === "STANDARD" ? "Начать бесплатно" : "Выбрать тариф"}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparison.map(([label, ...values]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                {values.map((value, index) => (
                  <td
                    key={index}
                    data-hidden={index !== selected}
                  >
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
