import type { Metadata } from "next";
import Link from "next/link";
import { PlanComparison } from "@/widgets/billing/PlanComparison";
import s from "@/widgets/billing/billing.module.css";

export const metadata: Metadata = {
  title: "Тарифы для исполнителей — Земледел",
  description:
    "Стандарт бесплатно, Лайт 299 ₽ и Бизнес 999 ₽ в месяц. Сравните возможности для работы с клиентами.",
};
export default function PricingPage() {
  return (
    <main className={s.root}>
      <header className={s.hero}>
        <span className={s.eyebrow}>Тарифы для исполнителей</span>
        <h1>
          Больше возможностей.
          <br />В вашем ритме.
        </h1>
        <p className={s.muted}>
          Начните бесплатно. Выберите больше откликов, регионов и инструментов,
          когда они понадобятся.
        </p>
      </header>
      <div className={s.notice}>
        <strong>Тестируем оплату.</strong> Сейчас подключён тестовый терминал:
        деньги не списываются. Тестовая покупка переключает тариф и доступные возможности профиля.
      </div>
      <PlanComparison />
      <section className={`${s.card} ${s.section}`}>
        <div className={s.row}>
          <div>
            <h2>Нужно ещё несколько откликов?</h2>
            <p>
              10 дополнительных откликов — <strong>99 ₽</strong>
            </p>
            <p className={s.muted}>
              Для Стандарта и Лайта. Без срока действия. Сначала расходуется
              дневной лимит.
            </p>
          </div>
          <Link className={s.secondary} href="/pro/billing?product=REPLIES_10">
            Попробовать пакет
          </Link>
        </div>
      </section>
      <section className={s.section}>
        <h2>Вопросы о тарифах</h2>
        <details>
          <summary>Как считается месяц?</summary>
          <p>
            Тариф действует календарный месяц. При повышении на Бизнес стоимость оставшегося срока Лайта вычитается из оплаты нового месяца. Понижение действует после окончания оплаченного срока.
          </p>
        </details>
        <details>
          <summary>Будут ли автоматические списания?</summary>
          <p>
            При оплате автопродление включено галочкой — её можно снять. Владелец может отключить автопродление в кабинете. При неудачной оплате доступ сохраняется на 3 дня, с повторными попытками через 24 и 48 часов. Пакеты откликов не продлеваются автоматически.
          </p>
        </details>
        <details>
          <summary>Что происходит с дополнительными откликами?</summary>
          <p>
            Пакеты суммируются и не сгорают. На Бизнесе резерв сохраняется и не
            расходуется.
          </p>
        </details>
      </section>
    </main>
  );
}
