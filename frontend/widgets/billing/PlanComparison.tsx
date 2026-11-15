"use client";
import { useState } from "react";
import Link from "next/link";
import Button from "@mui/material/Button";
import {
  comparison,
  plans,
  money,
  productFor,
  periodLabel,
  requestsAvailability,
  type BillingPeriod,
  type BillingCatalog,
} from "./model";
import { BillingPeriodSelector } from "./BillingPeriodSelector";
import { PlanFeatureLabel } from "./PlanFeatureLabel";
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
      <p className={s.notice}>
        <strong>{requestsAvailability}</strong>{" "}
        «Бизнес» дополнительно позволяет увидеть, кто добавил вас в избранное,
        и первым предложить свои услуги.
      </p>
      <div
        className={s.tabs}
        aria-label="Выбор тарифа для сравнения"
      >
        {plans.map((plan, index) => (
          <Button
            key={plan.id}
            type="button"
            size="small"
            variant={index === selected ? "contained" : "outlined"}
            className={s.smallButton}
            aria-pressed={index === selected}
            onClick={() => setSelected(index)}
          >
            {plan.name}
          </Button>
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
                  <Button
                    component={Link}
                    size="small"
                    variant="contained"
                    fullWidth
                    className={s.smallButton}
                    href={`/pro/settings/tariff${plan.id !== "STANDARD" ? `?product=${productFor(plan.id, period)}` : ""}`}
                  >
                    {plan.id === "STANDARD" ? "Начать бесплатно" : "Выбрать тариф"}
                  </Button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparison.map((feature) => (
              <tr key={feature.label}>
                <th scope="row">
                  <PlanFeatureLabel feature={feature} />
                </th>
                {feature.values.map((value, index) => (
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
