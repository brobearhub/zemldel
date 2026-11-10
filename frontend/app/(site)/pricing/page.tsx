import type { Metadata } from "next";
import { fetchBackendJson } from "@/shared/api/backend/server";
import { money, type BillingCatalog } from "@/widgets/billing/model";
import { PlanComparison } from "@/widgets/billing/PlanComparison";
import s from "@/widgets/billing/billing.module.css";

export const metadata: Metadata = {
  title: "Тарифы для исполнителей — Земледел",
  description:
    "Стандарт бесплатно, Лайт и Бизнес — на месяц или год. Сравните возможности для работы с клиентами.",
};
export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const catalog = await fetchBackendJson<BillingCatalog>("/billing/catalog", {
    cache: "no-store",
  });
  return (
    <main className={s.root}>
      <header className={s.hero}>
        <span className={s.eyebrow}>Тарифы для исполнителей</span>
        <h1>
          Больше возможностей.
          <br />В вашем ритме.
        </h1>
        <p className={s.muted}>
          Начните бесплатно и выберите подходящие возможности для оформления
          услуг, публикации историй и статистики.
        </p>
      </header>
      <PlanComparison catalog={catalog} />
      <section className={s.section}>
        <h2>Отдельные услуги</h2>
        <p>
          Смена адреса профиля — 1 000 ₽ за изменение, не входит в тарифы.
          Доступна один раз в календарный месяц после предыдущей смены.
          Новый адрес проверяется перед оплатой и применяется после её подтверждения.
        </p>
      </section>
      <section className={s.section}>
        <h2>Вопросы о тарифах</h2>
        <details>
          <summary>Как считаются лимиты историй?</summary>
          <p>
            Лимит общий для профиля и его сотрудников и обновляется в полночь по
            часовому поясу профиля. Удаление истории не возвращает публикацию.
            Месячные и годовые планы дают одинаковые возможности. Фото — до 10 МБ,
            видео на Бизнесе — до 100 МБ и 2 минут. В одной истории можно разместить
            одно фото или видео. Символы оформления также входят в лимит текста.
          </p>
        </details>
        <details>
          <summary>Как считается срок тарифа?</summary>
          <p>
            Тариф можно оплатить на календарный месяц или год. Годовая оплата
            дешевле на 10%: Лайт — {money(catalog.LITE_YEAR.amount)} ₽, Бизнес — {money(catalog.BUSINESS_YEAR.amount)} ₽ сразу за
            год. При повышении тарифа или переходе с месяца на год учитывается
            стоимость неиспользованного срока. Понижение тарифа и переход с года
            на месяц действуют после окончания оплаченного срока.
          </p>
        </details>
        <details>
          <summary>Будут ли автоматические списания?</summary>
          <p>
            При оплате можно отдельно включить автопродление. По умолчанию оно выключено.
            Владелец может отключить автопродление в кабинете. При неудачной
            оплате доступ сохраняется на 3 дня, с повторными попытками через 24
            и 48 часов.
          </p>
        </details>
        <details>
          <summary>Как отказаться от продления?</summary>
          <p>
            Откройте «Настройки → Тариф» и выключите тумблер «Автопродление».
            Следующие автоматические списания отключатся. Оплаченные возможности
            сохранятся до конца срока, после чего включится бесплатный Стандарт.
            При покупке можно оплатить один период без автопродления.
          </p>
        </details>
      </section>
    </main>
  );
}
