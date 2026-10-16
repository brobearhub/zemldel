export type FirstStepProviderType = "INDIVIDUAL" | "SELF_EMPLOYED" | "SOLE_PROPRIETOR" | "COMPANY";

export type FirstStepVerificationStatus = "NOT_VERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";

export type FirstStepItem = {
  id: "profile" | "service" | "verification";
  title: string;
  done: boolean;
  href?: string;
  optional?: boolean;
  note?: string;
};

export function buildFirstSteps(input: {
  providerType: FirstStepProviderType;
  hasPublishedService: boolean;
  verificationStatus: FirstStepVerificationStatus;
  rejectReason?: string | null;
}): { visible: boolean; progressLabel: string; steps: FirstStepItem[] } {
  const serviceDone = input.hasPublishedService;
  const verificationDone = input.verificationStatus === "VERIFIED";
  const verificationUnavailable = input.providerType === "INDIVIDUAL";
  const doneCount = 1 + (serviceDone ? 1 : 0) + (verificationDone ? 1 : 0);
  const verificationTitle =
    input.verificationStatus === "PENDING"
      ? "На проверке"
      : input.verificationStatus === "VERIFIED"
        ? "Подтверждён"
        : input.verificationStatus === "REJECTED"
          ? `Отклонена: ${input.rejectReason?.trim() || "без указанной причины"}`
          : "Пройдите проверку — значок и место выше в выдаче";

  return {
    visible: !(serviceDone && (verificationDone || verificationUnavailable)),
    progressLabel: `${doneCount} из 3`,
    steps: [
      { id: "profile", title: "Профиль создан", done: true },
      {
        id: "service",
        title: "Добавьте первую услугу — она появится в каталоге и поиске",
        done: serviceDone,
        href: serviceDone ? undefined : "/pro/services/create",
      },
      {
        id: "verification",
        title: verificationTitle,
        done: verificationDone,
        optional: input.verificationStatus === "NOT_VERIFIED",
        href:
          verificationUnavailable || verificationDone || input.verificationStatus === "PENDING"
            ? undefined
            : "/pro/profile/verification",
        note: verificationUnavailable ? "Проверка для физлиц появится позже" : undefined,
      },
    ],
  };
}
