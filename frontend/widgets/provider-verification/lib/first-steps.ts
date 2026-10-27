export type FirstStepProviderType = "INDIVIDUAL" | "SELF_EMPLOYED" | "SOLE_PROPRIETOR" | "COMPANY";

export type FirstStepVerificationStatus = "NOT_VERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";

export type FirstStepItem = {
  id: "profile" | "service" | "verification";
  /** Короткая подпись под точкой маршрута. */
  label: string;
  /** Заголовок панели шага. */
  title: string;
  done: boolean;
  href?: string;
  actionLabel?: string;
  /** Следующий обязательный шаг — его действие главное на экране. */
  current?: boolean;
  optional?: boolean;
  error?: boolean;
  note?: string;
};

export type FirstSteps = {
  visible: boolean;
  progressLabel: string;
  steps: FirstStepItem[];
};

function verificationStep(input: {
  status: FirstStepVerificationStatus;
  unavailable: boolean;
  rejectReason?: string | null;
}): FirstStepItem {
  const base = { id: "verification" as const, label: "Проверка", done: input.status === "VERIFIED" };

  if (input.unavailable) {
    return { ...base, title: "Пройдите проверку", note: "Проверка для физлиц появится позже" };
  }
  if (input.status === "PENDING") {
    return { ...base, title: "Данные на проверке", note: "Сообщим, когда проверим" };
  }
  if (input.status === "VERIFIED") {
    return { ...base, title: "Подтверждён" };
  }
  if (input.status === "REJECTED") {
    return {
      ...base,
      title: "Проверка отклонена",
      note: `Причина: ${input.rejectReason?.trim() || "не указана"}. Исправьте данные и отправьте снова.`,
      error: true,
      href: "/pro/profile/verification",
      actionLabel: "Исправить данные",
    };
  }
  return {
    ...base,
    title: "Пройдите проверку",
    note: "На карточке появится значок, и в выдаче вы будете выше",
    optional: true,
    href: "/pro/profile/verification",
    actionLabel: "Пройти проверку",
  };
}

export function buildFirstSteps(input: {
  providerType: FirstStepProviderType;
  hasPublishedService: boolean;
  verificationStatus: FirstStepVerificationStatus;
  rejectReason?: string | null;
}): FirstSteps {
  const serviceDone = input.hasPublishedService;
  const verificationUnavailable = input.providerType === "INDIVIDUAL";
  const verification = verificationStep({
    status: input.verificationStatus,
    unavailable: verificationUnavailable,
    rejectReason: input.rejectReason,
  });
  const verificationSettled = verification.done || verificationUnavailable;

  // Why: проверка необязательна и не входит в счётчик, иначе пропустивший её навсегда «не доделал».
  const requiredTotal = 2;
  const requiredDone = 1 + (serviceDone ? 1 : 0);

  return {
    visible: !(serviceDone && verificationSettled),
    progressLabel: `${requiredDone} из ${requiredTotal}`,
    steps: [
      { id: "profile", label: "Аккаунт создан", title: "Аккаунт исполнителя создан", done: true },
      serviceDone
        ? { id: "service", label: "В каталоге", title: "Вы в каталоге", done: true }
        : {
            id: "service",
            label: "В каталоге",
            title: "Расскажите, какую работу выполняете",
            note: "Например, межевание участка или вынос границ. Укажите цену и описание, и заказчики найдут вас в поиске.",
            done: false,
            current: true,
            href: "/pro/services/create",
            actionLabel: "Добавить услугу",
          },
      verification,
    ],
  };
}
