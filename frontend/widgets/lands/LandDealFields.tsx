import { Typography } from "@mui/material";
import CurrencyRubleRounded from "@mui/icons-material/CurrencyRubleRounded";
import {
  RENT_PERIODS,
  type LandDetails,
  type LandDraft,
} from "@/entities/land/types";
import {
  LandCheckbox,
  LandFieldPair,
  LandFormCard,
  type LandEditorInputs,
} from "./LandEditorControls";
import { LandShareFields } from "./LandShareFields";

const servicePrices = {
  FIXED: "Фиксированная",
  FROM: "От суммы",
  AGREEMENT: "По договорённости",
};

const leaseTerms = {
  landlord: "Арендодатель",
  transferConditions: "Условия передачи прав и обязанностей",
  landlordConsent: "Согласие или уведомление арендодателя",
  extraPayments: "Дополнительные платежи",
  arrears: "Задолженность",
} as const;

export function LandDealFields({
  form,
  inputs,
  changeDetails,
}: {
  form: LandDraft;
  inputs: LandEditorInputs;
  changeDetails: (patch: Partial<LandDetails>) => void;
}) {
  const d = form.details;
  if (form.kind === "SELECTION") {
    return (
      <LandFormCard
        title="Стоимость подбора"
        icon={<CurrencyRubleRounded />}
      >
        {inputs.detail("priceMode", "Как указать цену", {
          choices: servicePrices,
          allowEmpty: false,
        })}
        {d.priceMode !== "AGREEMENT" && (
          <LandFieldPair>
            {inputs.field(
              "priceRubles",
              d.priceMode === "FROM" ? "Стоимость от" : "Стоимость услуги",
              { type: "money", suffix: "₽" },
            )}
            {inputs.detail("priceUnit", "Единица оплаты", {
              helper: "Например, за подбор.",
            })}
          </LandFieldPair>
        )}
      </LandFormCard>
    );
  }
  const share = form.dealType === "SHARE";
  const lease = form.dealType === "LEASE_ASSIGNMENT";
  const priceLabel = share
    ? "Цена продаваемой доли"
    : lease
      ? "Единовременная плата за уступку"
      : "Полная цена участка";
  return (
    <LandFormCard
      title="Цена и условия"
      icon={<CurrencyRubleRounded />}
    >
      {share && (
        <LandShareFields
          details={d}
          inputs={inputs}
        />
      )}
      {inputs.field("priceRubles", priceLabel, { type: "money", suffix: "₽" })}
      {lease && (
        <>
          <LandFieldPair>
            {inputs.detail("rentRubles", "Арендная плата", {
              type: "money",
              suffix: "₽",
            })}
            {inputs.detail("rentPeriod", "Период арендной платы", {
              choices: RENT_PERIODS,
              allowEmpty: false,
            })}
          </LandFieldPair>
          <LandCheckbox
            label="Договор на неопределённый срок"
            checked={d.leaseIndefinite}
            onChange={(leaseIndefinite) => changeDetails({ leaseIndefinite })}
          />
          {!d.leaseIndefinite &&
            inputs.detail("leaseUntil", "Дата окончания договора", {
              type: "date",
            })}
          {Object.entries(leaseTerms).map(([key, label]) =>
            inputs.detail(key as keyof typeof leaseTerms, label, { rows: 2 }),
          )}
          <Typography
            variant="caption"
            color="text.secondary"
          >
            Если сведений нет, укажите «Неизвестно».
          </Typography>
        </>
      )}
      {share && (
        <>
          {inputs.detail("useAgreement", "Порядок пользования", { rows: 2 })}
          {inputs.detail("coOwnerNotice", "Уведомления сособственников", {
            rows: 2,
            helper: "Если сведений нет, укажите «Неизвестно».",
          })}
        </>
      )}
      <LandCheckbox
        label="Возможен торг"
        checked={d.negotiable}
        onChange={(negotiable) => changeDetails({ negotiable })}
      />
      {inputs.detail("included", "Что входит в предложение", { rows: 2 })}
    </LandFormCard>
  );
}
