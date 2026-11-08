"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fetchIdempotentWrite } from "@/shared/api/idempotent-write";
import {
  productNames,
  statusNames,
  type BillingOrder,
  type BillingOverview,
  type Product,
} from "./model";
import s from "./billing.module.css";

async function readResponse<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok)
    throw new Error(
      typeof body.error === "string"
        ? body.error
        : typeof body.message === "string"
          ? body.message
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
    !["pay.tbank.ru", "securepay.tinkoff.ru", "securepay.tbank.ru"].includes(
      url.hostname,
    )
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
  return ["LITE", "BUSINESS", "REPLIES_10"].includes(value ?? "");
}
const prices = { LITE: 299, BUSINESS: 999, REPLIES_10: 99 };

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
  const [quote, setQuote] = useState<{
    amount: number;
    quoteAt: string;
  } | null>(null);
  const [timezone, setTimezone] = useState("Europe/Moscow");
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
      .then(readResponse<{ amount: number; quoteAt: string }>)
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
    setTimezone(overview.timezone);
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
            ? "Тестовая оплата подтверждена. Баланс обновлён."
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
    if (!selected || busy || !quote) return;
    setBusy(true);
    setError("");
    try {
      const order = await readResponse<BillingOrder>(
        await fetchIdempotentWrite(`${endpoint}/checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product: selected,
            autoRenew: selected !== "REPLIES_10" && autoRenew,
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
          ? "Этот тестовый платёж уже оплачен."
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
      setMessage("Настройки сохранены");
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
    <div className={s.root}>
      <div className={s.row}>
        <div>
          <span className={s.eyebrow}>{providerName}</span>
          <h1>Тариф и оплата</h1>
        </div>
        <Link
          className={s.secondary}
          href="/pricing"
        >
          Сравнить тарифы
        </Link>
      </div>
      <div className={s.notice}>
        <strong>Тестовый режим Т‑Банка.</strong> Тестовый платёж переключает
        тариф и ограничения профиля. Реальных списаний нет.
      </div>
      {error && (
        <div
          className={s.error}
          role="alert"
        >
          {error}
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
        <div
          className={s.notice}
          role="status"
        >
          {message}
        </div>
      )}
      {!data && !error && <p role="status">Загружаем тариф и историю…</p>}
      {data && (
        <>
          {!data.enabled && (
            <div className={s.notice}>
              Тестовая оплата ещё не настроена. Покупки станут доступны после
              подключения терминала.
            </div>
          )}
          {!data.canPay && (
            <div className={s.notice}>
              Покупать тарифы и пакеты может владелец профиля.
            </div>
          )}
          {data.needsReview && (
            <div className={s.error}>
              Платёж требует сверки. Новые покупки временно недоступны.
            </div>
          )}
          <section className={s.card}>
            <h2>Лимит откликов</h2>
            <p>
              {data.limits.replies === null
                ? "Без ограничений"
                : `Сегодня использовано ${data.dailyUsed} из ${data.limits.replies}`}
            </p>
            <p className={s.muted}>
              Общий лимит всех сотрудников профиля. Обновляется в полночь:{" "}
              {data.timezone}.
            </p>
            {data.graceUntil && new Date(data.graceUntil) > new Date() && (
              <div className={s.error}>
                Не удалось продлить тариф. Доступ сохранён до{" "}
                {date(data.graceUntil)}. Проверьте оплату.
              </div>
            )}
            {data.notices.map((notice) => (
              <p
                key={notice.id}
                role="status"
              >
                {notice.message}
              </p>
            ))}
            {data.canPay && (
              <div className={s.actions}>
                <label>
                  Часовой пояс{" "}
                  <input
                    className={s.textInput}
                    aria-label="Часовой пояс"
                    value={timezone}
                    onChange={(event) => setTimezone(event.target.value)}
                    list="billing-timezones"
                  />
                </label>
                <datalist id="billing-timezones">
                  {[
                    "Europe/Kaliningrad",
                    "Europe/Moscow",
                    "Europe/Samara",
                    "Asia/Yekaterinburg",
                    "Asia/Omsk",
                    "Asia/Krasnoyarsk",
                    "Asia/Irkutsk",
                    "Asia/Yakutsk",
                    "Asia/Vladivostok",
                    "Asia/Magadan",
                    "Asia/Kamchatka",
                  ].map((zone) => (
                    <option
                      key={zone}
                      value={zone}
                    />
                  ))}
                </datalist>
                <button
                  className={s.secondary}
                  disabled={busy}
                  onClick={() => saveSettings({ timezone })}
                >
                  Сохранить часовой пояс
                </button>
                <button
                  className={s.secondary}
                  disabled={busy || (!data.autoRenew && !data.canAutoRenew)}
                  onClick={() => saveSettings({ autoRenew: !data.autoRenew })}
                >
                  {data.autoRenew
                    ? "Отключить автопродление"
                    : "Включить автопродление"}
                </button>
                {data.plan !== "STANDARD" && (
                  <button
                    className={s.secondary}
                    disabled={busy}
                    onClick={() =>
                      saveSettings({ nextPlan: "STANDARD", autoRenew: false })
                    }
                  >
                    Стандарт после окончания срока
                  </button>
                )}
                {data.nextPlan && (
                  <>
                    <p>
                      После окончания срока: {productNames[data.nextPlan]}.{" "}
                      {data.nextPlan !== "STANDARD" && !data.autoRenew
                        ? "Для продления понадобится оплата."
                        : ""}
                    </p>
                    <button
                      className={s.secondary}
                      disabled={busy}
                      onClick={() => saveSettings({ nextPlan: null })}
                    >
                      Отменить переход
                    </button>
                  </>
                )}
              </div>
            )}
            <p>
              <Link href="/pro/settings/promotion">
                Статистика, шаблоны и задачи команды →
              </Link>
            </p>
          </section>
          <div className={s.cards}>
            <section className={`${s.card} ${s.accent}`}>
              <span className={s.eyebrow}>Текущий тестовый тариф</span>
              <div className={s.big}>{productNames[data.plan]}</div>
              <p>
                {data.plan === "STANDARD"
                  ? "Бесплатно, без срока действия"
                  : `Действует до ${date(data.planExpiresAt!)}`}
              </p>
              <p className={s.muted}>
                {data.autoRenew
                  ? "Автопродление включено"
                  : "Автопродление выключено"}
              </p>
              <div className={s.actions}>
                <button
                  type="button"
                  className={s.button}
                  disabled={
                    disabled ||
                    (data.plan === "LITE" &&
                      !!data.planExpiresAt &&
                      new Date(data.planExpiresAt) > new Date())
                  }
                  onClick={() =>
                    data.plan === "BUSINESS" &&
                    data.planExpiresAt &&
                    new Date(data.planExpiresAt) > new Date()
                      ? void saveSettings({ nextPlan: "LITE" })
                      : setSelected("LITE")
                  }
                >
                  {data.plan === "BUSINESS" &&
                  data.planExpiresAt &&
                  new Date(data.planExpiresAt) > new Date()
                    ? "Лайт со следующего месяца"
                    : data.plan === "LITE"
                      ? data.planExpiresAt &&
                        new Date(data.planExpiresAt) > new Date()
                        ? "Лайт подключён"
                        : "Оплатить Лайт"
                      : "Выбрать Лайт"}{" "}
                  · 299 ₽
                </button>
                <button
                  type="button"
                  className={s.secondary}
                  disabled={
                    disabled ||
                    (data.plan === "BUSINESS" &&
                      !!data.planExpiresAt &&
                      new Date(data.planExpiresAt) > new Date())
                  }
                  onClick={() => setSelected("BUSINESS")}
                >
                  {data.plan === "BUSINESS"
                    ? data.planExpiresAt &&
                      new Date(data.planExpiresAt) > new Date()
                      ? "Бизнес подключён"
                      : "Продлить Бизнес"
                    : "Выбрать Бизнес"}{" "}
                  · 999 ₽
                </button>
              </div>
            </section>
            <section className={s.card}>
              <span className={s.eyebrow}>Дополнительные отклики</span>
              <div className={s.big}>{data.replyCredits}</div>
              <p>В тестовом резерве · не сгорают</p>
              <p className={s.muted}>
                {data.plan === "BUSINESS"
                  ? "На Бизнесе отклики не ограничены. Резерв сохраняется."
                  : "Пакет: 10 откликов за 99 ₽. Резерв предназначен для откликов сверх дневного лимита."}
              </p>
              <button
                type="button"
                className={s.secondary}
                disabled={disabled || data.plan === "BUSINESS"}
                onClick={() => setSelected("REPLIES_10")}
              >
                Добавить 10 откликов · 99 ₽
              </button>
            </section>
          </div>
          <section className={s.card}>
            <h2>История тестовых платежей</h2>
            <p className={s.muted}>
              Последние 30 операций. После возврата из банка подтверждение может
              занять несколько секунд.
            </p>
            {!data.orders.length ? (
              <p>
                Пока нет платежей. Здесь появятся покупки тарифа и
                дополнительных откликов.
              </p>
            ) : (
              <ul className={s.history}>
                {data.orders.map((order) => (
                  <li key={order.id}>
                    <div className={s.row}>
                      <div>
                        <strong>
                          {productNames[order.product]} · {order.amount / 100} ₽
                        </strong>
                        <span className={s.muted}>
                          {date(order.createdAt)} ·{" "}
                          {statusNames[order.status] ?? "Обрабатывается банком"}
                        </span>
                      </div>
                      <div className={s.actions}>
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
        </>
      )}
      <dialog
        ref={dialog}
        className={s.dialog}
        onCancel={(event) => {
          if (busy) event.preventDefault();
          else setSelected(null);
        }}
        onClose={() => setSelected(null)}
        aria-labelledby="checkout-title"
      >
        {selected && (
          <>
            <h2 id="checkout-title">{productNames[selected]}</h2>
            <p className={s.big}>
              {quote ? quote.amount / 100 : prices[selected]} ₽
              {selected !== "REPLIES_10" && (
                <span className={s.muted}> / месяц</span>
              )}
            </p>
            <p>
              {selected === "REPLIES_10"
                ? "10 откликов без срока действия. Пакеты суммируются."
                : "Новый тариф действует месяц. При повышении стоимость остатка Лайта вычтена из суммы оплаты."}
            </p>
            <p>
              <strong>Это тестовая покупка.</strong> Деньги не списываются. Вы
              перейдёте на защищённую страницу Т‑Банка. Следующая оплата при
              включённом автопродлении — через месяц, по полной цене выбранного
              тарифа.
            </p>
            {selected !== "REPLIES_10" && (
              <label>
                <input
                  type="checkbox"
                  checked={autoRenew}
                  onChange={(event) => setAutoRenew(event.target.checked)}
                  disabled={busy}
                />{" "}
                Автоматически продлевать тариф за {prices[selected]} ₽ в месяц.
                Можно отключить в кабинете.
              </label>
            )}
            <div className={s.actions}>
              <button
                type="button"
                className={s.button}
                disabled={
                  disabled ||
                  !quote ||
                  (selected === "REPLIES_10" && data?.plan === "BUSINESS")
                }
                onClick={pay}
              >
                {busy ? "Создаём платёж…" : "Перейти к тестовой оплате"}
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
