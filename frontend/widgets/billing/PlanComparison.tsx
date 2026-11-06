"use client";
import { useState } from "react";
import Link from "next/link";
import { comparison, plans } from "./model";
import s from "./billing.module.css";

export function PlanComparison() {
  const [selected, setSelected] = useState(1);
  return (
    <>
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
                    {plan.price === 0 ? "Бесплатно" : `${plan.price} ₽`}
                  </span>
                  <span className={s.muted}>
                    {plan.price === 0 ? "Без срока действия" : "за месяц"}
                  </span>
                  <p className={s.muted}>{plan.description}</p>
                  <Link
                    className={`${s.button} ${s.wide}`}
                    href={`/pro/billing${plan.price ? `?product=${plan.id}` : ""}`}
                  >
                    {plan.price ? "Попробовать оплату" : "Начать бесплатно"}
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
