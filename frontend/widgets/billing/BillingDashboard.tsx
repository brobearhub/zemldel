"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FormControlLabel, MenuItem, Switch, TextField } from "@mui/material";
import { fetchIdempotentWrite } from "@/shared/api/idempotent-write";
import {
  billingProducts,
  money,
  productFor,
  periodLabel,
  type BillingPeriod,
  productNames,
  statusNames,
  type BillingOrder,
  type BillingOverview,
  type Product,
} from "./model";
import s from "./billing.module.css";
import {
  BillingReceiptSummary,
  BillingPlanFeatures,
  BillingPlanChoices,
} from "./BillingReceipt";
import paper from "./billing-paper.module.css";

const timezones = [
  ["Europe/Kaliningrad", "Калининград"],
  ["Europe/Moscow", "Москва"],
  ["Europe/Kirov", "Киров"],
  ["Europe/Volgograd", "Волгоград"],
  ["Europe/Astrakhan", "Астрахань"],
  ["Europe/Saratov", "Саратов"],
  ["Europe/Ulyanovsk", "Ульяновск"],
  ["Europe/Samara", "Самара"],
  ["Asia/Yekaterinburg", "Екатеринбург"],
  ["Asia/Omsk", "Омск"],
  ["Asia/Novosibirsk", "Новосибирск"],
  ["Asia/Barnaul", "Барнаул"],
  ["Asia/Tomsk", "Томск"],
  ["Asia/Novokuznetsk", "Новокузнецк"],
  ["Asia/Krasnoyarsk", "Красноярск"],
  ["Asia/Irkutsk", "Иркутск"],
  ["Asia/Chita", "Чита"],
  ["Asia/Yakutsk", "Якутск"],
  ["Asia/Khandyga", "Хандыга"],
  ["Asia/Vladivostok", "Владивосток"],
  ["Asia/Ust-Nera", "Усть-Нера"],
  ["Asia/Magadan", "Магадан"],
  ["Asia/Sakhalin", "Южно-Сахалинск"],
  ["Asia/Srednekolymsk", "Среднеколымск"],
  ["Asia/Kamchatka", "Петропавловск-Камчатский"],
  ["Asia/Anadyr", "Анадырь"],
];

function timezoneOffset(timeZone: string) {
  const now = new Date();
  const offsetMinutes = (zone: string) => {
    const offset = new Intl.DateTimeFormat("en", {
      timeZone: zone,
      timeZoneName: "shortOffset",
    })
      .formatToParts(now)
      .find((part) => part.type === "timeZoneName")!.value;
    const [hours, minutes = "0"] = (offset.replace("GMT", "") || "0").split(":");
    return Number(hours) * 60 + (hours.startsWith("-") ? -1 : 1) * Number(minutes);
  };
  const difference = offsetMinutes(timeZone) - offsetMinutes("Europe/Moscow");
  const sign = difference > 0 ? "+" : difference < 0 ? "−" : "";
  const hours = Math.floor(Math.abs(difference) / 60);
  const minutes = Math.abs(difference) % 60;
  return `${sign}${hours} ч${minutes ? ` ${minutes} мин` : ""}`;
}

async function readResponse<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok)
    throw new Error(
      typeof body.message === "string" && body.message.trim()
        ? body.message
        : typeof body.error === "string" && body.error.trim()
          ? body.error
          : "Не удалось получить ответ сервера",
    );
  return body as T;
}
function bankUrl(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    ![
      "pay.tbank.ru",
      "pay.tbank-online.com",
      "securepay.tinkoff.ru",
      "securepay.tbank.ru",
    ].includes(url.hostname)
  )
    throw new Error("Некорректная ссылка банка");
  return url.href;
}
function date(value: string) {
  return new Date(value).toLocaleDateString("ru-RU", {
    timeZone: "Europe/Moscow",
  });
}
function isProduct(value?: string): value is Product {
  return Object.hasOwn(billingProducts, value ?? "");
}

export function BillingDashboard({
  providerId,
  providerName,
  returnOrder,
  initialProduct,
}: {
  providerId: string;
  providerName: string;
  returnOrder?: string;
  initialProduct?: string;
}) {
  const endpoint = `/api/billing/providers/${providerId}`;
  const [data, setData] = useState<BillingOverview | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Product | null>(
    isProduct(initialProduct) ? initialProduct : null,
  );
  const [autoRenew, setAutoRenew] = useState(true);
  const [period, setPeriod] = useState<BillingPeriod>(
    initialProduct?.endsWith("_YEAR") ? "YEAR" : "MONTH",
  );
  const [quote, setQuote] = useState<{
    amount: number;
    quoteAt: string;
    mode: "purchase" | "schedule" | "current";
  } | null>(null);
  useEffect(() => {
    if (!selected) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuote(null);
    setAutoRenew(true);
    fetch(`${endpoint}/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product: selected }),
    })
      .then(
        readResponse<{
          amount: number;
          quoteAt: string;
          mode: "purchase" | "schedule" | "current";
        }>,
      )
      .then((value) => {
        if (!cancelled) setQuote(value);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, endpoint]);
  const dialog = useRef<HTMLDialogElement>(null);
  const load = useCallback(async () => {
    const overview = await readResponse<BillingOverview>(
      await fetch(endpoint, { cache: "no-store" }),
    );
    setData(overview);
    return overview;
  }, [endpoint]);

  useEffect(() => {
    load().catch((e: Error) => setError(e.message));
  }, [load]);
  useEffect(() => {
    if (selected && data) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selected, data]);

  const refresh = useCallback(
    async (id: string) => {
      const order = await readResponse<BillingOrder>(
        await fetch(`${endpoint}/orders/${id}/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        }),
      );
      await load();
      return order;
    },
    [endpoint, load],
  );

  useEffect(() => {
    if (!returnOrder || !/^[a-f\d-]{36}$/i.test(returnOrder)) return;
    let canceled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    async function check() {
      try {
        const order = await refresh(returnOrder!);
        if (canceled) return;
        setMessage(
          order.status === "CONFIRMED"
            ? "Оплата подтверждена. Тариф обновлён."
            : `Статус платежа: ${statusNames[order.status] ?? "Обрабатывается банком"}.`,
        );
        if (
          [
            "NEW",
            "FORM_SHOWED",
            "AUTHORIZED",
            "INITIALIZING",
            "CONFIRMING",
          ].includes(order.status) &&
          ++attempts < 4
        )
          timer = setTimeout(check, 5000);
      } catch (e) {
        if (!canceled) setError((e as Error).message);
      }
    }
    void check();
    return () => {
      canceled = true;
      clearTimeout(timer);
    };
  }, [returnOrder, refresh]);

  async function pay() {
    if (!selected || busy || !quote || quote.mode !== "purchase") return;
    setBusy(true);
    setError("");
    try {
      const order = await readResponse<BillingOrder>(
        await fetchIdempotentWrite(`${endpoint}/checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product: selected,
            autoRenew,
            quoteAt: quote.quoteAt,
            expectedAmount: quote.amount,
          }),
        }),
      );
      if (order.paymentUrl) {
        window.location.assign(bankUrl(order.paymentUrl));
        return;
      }
      setSelected(null);
      await load();
      setMessage(
        order.status === "CONFIRMED"
          ? "Этот платёж уже оплачен."
          : "Платёж сохранён. Проверьте его статус в истории; при ошибке создания можно повторить покупку.",
      );
    } catch (e) {
      setSelected(null);
      setError((e as Error).message);
      await load().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings(input: {
    timezone?: string;
    autoRenew?: boolean;
    nextPlan?: string | null;
    nextBillingPeriod?: BillingPeriod | null;
  }) {
    setBusy(true);
    setError("");
    try {
      setData(
        await readResponse<BillingOverview>(
          await fetch(`${endpoint}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          }),
        ),
      );
      setMessage(
        input.nextPlan === "STANDARD" || input.autoRenew === false
          ? "Продление отключено. Оплаченный срок сохранён."
          : "Настройки сохранены",
      );
      setSelected(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function checkOrder(id: string) {
    setBusy(true);
    setError("");
    try {
      const order = await refresh(id);
      setMessage(
        `Статус: ${statusNames[order.status] ?? "Обрабатывается банком"}`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const disabled = busy || !data?.enabled || !data.canPay || data.needsReview;
  return (
    <div className={`${s.root} ${paper.root}`}>
      <header className={paper.pageHeader}>
        <nav aria-label="Хлебные крошки" className={paper.breadcrumb}>
          <Link href="/pro/settings">Настройки</Link> / Тариф и оплата
        </nav>
        <span className={paper.caption}>{providerName}</span>
        <h1>Тариф и оплата</h1>
      </header>
      <div className={paper.receipt}>
        {error && (
          <div className={s.error} role="alert">
            {error
              .split(";")
              .map((part, index) => {
                const text = part.trim();
                return index === 0
                  ? text
                  : text.charAt(0).toLocaleUpperCase("ru-RU") + text.slice(1);
              })
              .filter(Boolean)
              .join("\n")}
            {!data && (
              <div className={s.actions}>
                <button
                  type="button"
                  className={s.secondary}
                  onClick={() => {
                    setError("");
                    load().catch((e: Error) => setError(e.message));
                  }}
                >
                  Повторить загрузку
                </button>
              </div>
            )}
          </div>
        )}
        {message && (
          <div className={s.notice} role="status">
            {message}
          </div>
        )}
        {!data && !error && <p role="status">Загружаем тариф и историю…</p>}
        {data && (
          <>
            {!data.enabled && (
              <div className={s.notice}>
                Оплата ещё не настроена. Покупки станут доступны после
                подключения терминала.
              </div>
            )}
            {!data.canPay && (
              <div className={s.notice}>
                Покупать тарифы может владелец профиля.
              </div>
            )}
            {data.needsReview && (
              <div className={s.error}>
                Платёж требует сверки. Новые покупки временно недоступны.
              </div>
            )}
            <div className={paper.workspace}>
              <BillingReceiptSummary data={data} returnOrder={returnOrder} />
              <div className={paper.leftColumn}>
                <BillingPlanFeatures data={data} />
                <BillingPlanChoices
                  data={data}
                  period={period}
                  onPeriodChange={setPeriod}
                  onSelect={setSelected}
                  disabled={disabled}
                  busy={busy}
                />
                <section
                  className={`${paper.section} ${paper.renewalSection}`}
                  aria-labelledby="renewal-title"
                >
                  <h2 id="renewal-title" className={paper.sectionTitle}>
                    03 / Продление и настройки
                  </h2>
                  {data.graceUntil && new Date(data.graceUntil) > new Date() && (
                    <div className={s.error}>
                      Не удалось продлить тариф. Доступ сохранён до{" "}
                      {date(data.graceUntil)}. Проверьте оплату.
                    </div>
                  )}
                  {data.notices.map((notice) => (
                    <p key={notice.id} role="status">
                      {notice.message}
                    </p>
                  ))}
                  {data.autoRenew || data.renewalPending ? (
                    <p>
                      {data.renewalPending
                        ? "Подключается автопродление."
                        : "Автопродление включено."}{" "}
                      Можно отказаться от продления и пользоваться тарифом до конца
                      оплаченного срока.
                    </p>
                  ) : (
                    <p role="status">
                      Продление отключено. Автоматических списаний не будет.
                      {data.plan !== "STANDARD" && data.planExpiresAt
                        ? ` Оплаченные возможности доступны до ${date(data.planExpiresAt)}, затем — Стандарт.`
                        : ""}
                    </p>
                  )}
                  {data.autoRenew &&
                    (data.nextPlan ?? data.plan) !== "STANDARD" && (
                      <p className={`${s.muted} ${paper.muted}`}>
                        Следующее продление:{" "}
                        {productNames[data.nextPlan ?? data.plan]} ·{" "}
                        {money(
                          data.catalog[
                            productFor(
                              (data.nextPlan ?? data.plan) as "LITE" | "BUSINESS",
                              data.nextBillingPeriod ?? data.billingPeriod,
                            )
                          ].amount,
                        )}{" "}
                        ₽ за{" "}
                        {periodLabel(data.nextBillingPeriod ?? data.billingPeriod)}.
                      </p>
                    )}
                  {data.canPay && (
                    <div className={s.actions}>
                      <FormControlLabel
                        label="Автопродление"
                        control={
                          <Switch
                            size="small"
                            checked={data.autoRenew || data.renewalPending}
                            disabled={
                              busy ||
                              (!data.autoRenew &&
                                !data.renewalPending &&
                                !data.canAutoRenew)
                            }
                            onChange={(_, checked) =>
                              saveSettings(
                                checked
                                  ? { autoRenew: true }
                                  : { nextPlan: "STANDARD", autoRenew: false },
                              )
                            }
                            slotProps={{
                              input: {
                                role: "switch",
                                "aria-describedby":
                                  !data.autoRenew &&
                                  !data.renewalPending &&
                                  !data.canAutoRenew
                                    ? "auto-renew-help"
                                    : undefined,
                              },
                            }}
                          />
                        }
                      />
                      {!data.autoRenew &&
                        !data.renewalPending &&
                        !data.canAutoRenew && (
                          <p
                            id="auto-renew-help"
                            className={`${s.muted} ${paper.muted}`}
                          >
                            Чтобы включить автопродление, разрешите его при
                            следующей оплате картой.
                          </p>
                        )}
                      {data.nextPlan && data.nextPlan !== "STANDARD" && (
                        <>
                          <p>
                            После окончания срока: {productNames[data.nextPlan]},
                            оплата за{" "}
                            {periodLabel(
                              data.nextBillingPeriod ?? data.billingPeriod,
                            )}
                            .
                            {!data.autoRenew
                              ? " Для перехода понадобится ручная оплата."
                              : ""}
                          </p>
                          <button
                            type="button"
                            className={s.secondary}
                            disabled={busy}
                            onClick={() =>
                              saveSettings({
                                nextPlan: null,
                                nextBillingPeriod: null,
                              })
                            }
                          >
                            Отменить переход
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  <form
                    className={paper.timezone}
                    key={data.timezone}
                    onSubmit={(event) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      void saveSettings({
                        timezone: String(form.get("timezone")).trim(),
                      });
                    }}
                  >
                    <div>
                      <label htmlFor="billing-timezone">Часовой пояс профиля</label>
                      <p className={paper.muted}>Для суточного лимита историй</p>
                    </div>
                    <div className={paper.timezoneControls}>
                      <TextField
                        id="billing-timezone"
                        name="timezone"
                        select
                        defaultValue={data.timezone}
                        size="small"
                        required
                        disabled={busy || !data.canPay}
                        slotProps={{
                          select: {
                            renderValue: (value) =>
                              timezones.find(([timezone]) => timezone === value)?.[1] ??
                              String(value),
                            inputProps: {
                              "aria-label": "Часовой пояс профиля",
                            },
                            MenuProps: {
                              slotProps: { paper: { sx: { maxHeight: 320 } } },
                            },
                          },
                        }}
                      >
                        {!timezones.some(([timezone]) => timezone === data.timezone) && (
                          <MenuItem
                            value={data.timezone}
                            sx={{ display: "none" }}
                          >
                            {data.timezone}
                          </MenuItem>
                        )}
                        {timezones.map(([timezone, city]) => (
                            <MenuItem
                              key={timezone}
                              value={timezone}
                              sx={{
                                justifyContent: "space-between",
                                gap: 3,
                                whiteSpace: "normal",
                              }}
                            >
                              <span>{city}</span>
                              <span
                                className={paper.timezoneOffset}
                                title="Разница во времени с Москвой"
                              >
                                {timezoneOffset(timezone)}
                              </span>
                            </MenuItem>
                          ))}
                      </TextField>
                      <button
                        type="submit"
                        className={s.secondary}
                        disabled={busy || !data.canPay}
                      >
                        Сохранить
                      </button>
                    </div>
                  </form>
                </section>
              </div>
              <div className={paper.rightColumn}>
                <section
                  className={`${paper.section} ${paper.historySection}`}
                  aria-labelledby="payment-history-title"
                >
                  <h2 id="payment-history-title">История платежей</h2>
                  <p className={`${s.muted} ${paper.muted}`}>
                    Последние 30 операций. После возврата из банка подтверждение
                    может занять несколько секунд.
                  </p>
                  {!data.orders.length ? (
                    <p>Пока нет платежей. Здесь появятся покупки тарифа.</p>
                  ) : (
                    <ul className={paper.history}>
                      {data.orders.map((order) => (
                        <li key={order.id}>
                          <div className={paper.orderRow}>
                            <div className={paper.orderDescription}>
                              <strong>
                                {productNames[order.product] ?? "Платёж"}
                              </strong>
                              <time dateTime={order.createdAt}>
                                {date(order.createdAt)}
                              </time>
                            </div>
                            <span className={paper.orderAmount}>
                              {money(order.amount)} ₽
                            </span>
                            <span
                              className={paper.orderStatus}
                              data-confirmed={order.status === "CONFIRMED"}
                            >
                              {statusNames[order.status] ?? "Обрабатывается банком"}
                            </span>
                            <div className={paper.orderActions}>
                              {order.paymentUrl && data.canPay && (
                                <a
                                  className={s.button}
                                  href={bankUrl(order.paymentUrl)}
                                >
                                  Продолжить оплату
                                </a>
                              )}
                              <button
                                type="button"
                                className={s.secondary}
                                disabled={busy || !data.enabled}
                                onClick={() => checkOrder(order.id)}
                              >
                                Проверить статус
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </div>
          </>
        )}
      </div>
      <footer className={paper.footer}>
        <Link href="/pricing">Сравнить тарифы →</Link>
        <Link href="/pro/settings/promotion">
          Статистика, шаблоны и задачи команды →
        </Link>
      </footer>
      <dialog
        ref={dialog}
        className={`${s.dialog} ${paper.dialog}`}
        onCancel={(event) => {
          if (busy) event.preventDefault();
          else setSelected(null);
        }}
        onClose={() => setSelected(null)}
        aria-labelledby="checkout-title"
      >
        {selected && data && (
          <>
            <h2 id="checkout-title">{productNames[selected]}</h2>
            <p className={`${s.big} ${paper.dialogPrice}`}>
              {money(quote?.amount ?? data.catalog[selected].amount)} ₽
              <span className={`${s.muted} ${paper.muted}`}>
                {" "}
                / {periodLabel(billingProducts[selected].period)}
              </span>
            </p>
            {quote?.mode === "schedule" ? (
              <p>
                Переход состоится после окончания оплаченного срока
                {data?.planExpiresAt ? ` — ${date(data.planExpiresAt)}` : ""}.
                {data?.autoRenew
                  ? " Автопродление оплатит выбранный тариф и период."
                  : " Автопродление выключено. Для перехода потребуется ручная оплата."}
              </p>
            ) : quote?.mode === "current" ? (
              <p>
                Этот тариф и период уже оплачены. Продлить их можно по окончании
                срока.
              </p>
            ) : (
              <>
                <p>
                  {billingProducts[selected].period === "YEAR"
                    ? "Оплата сразу за год со скидкой 10%."
                    : "Оплата за календарный месяц."}{" "}
                  Стоимость неиспользованного оплаченного срока учитывается при
                  повышении тарифа или переходе на год.
                </p>
                <p>
                  Вы перейдёте на защищённую страницу Т‑Банка.
                </p>
                <label>
                  <input
                    type="checkbox"
                    checked={autoRenew}
                    onChange={(event) => setAutoRenew(event.target.checked)}
                    disabled={busy}
                  />{" "}
                  Продлевать автоматически за{" "}
                  {money(data.catalog[selected].amount)} ₽ раз в{" "}
                  {periodLabel(billingProducts[selected].period)}. Отказаться от
                  продления можно в кабинете в любой момент.
                </label>
              </>
            )}
            <div className={s.actions}>
              <button
                type="button"
                className={s.button}
                disabled={
                  busy ||
                  !data?.canPay ||
                  data.needsReview ||
                  !quote ||
                  quote.mode === "current" ||
                  (quote.mode === "purchase" && !data.enabled)
                }
                onClick={() =>
                  quote?.mode === "schedule"
                    ? saveSettings({
                        nextPlan: billingProducts[selected].plan,
                        nextBillingPeriod: billingProducts[selected].period,
                      })
                    : pay()
                }
              >
                {busy
                  ? "Сохраняем…"
                  : quote?.mode === "schedule"
                    ? "Запланировать переход"
                    : "Перейти к оплате"}
              </button>
              <button
                type="button"
                className={s.secondary}
                disabled={busy}
                onClick={() => setSelected(null)}
              >
                Отмена
              </button>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
