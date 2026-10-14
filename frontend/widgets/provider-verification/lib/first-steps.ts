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
}): { visible: boolean; progressLabel: string; steps: FirstStepItem[] } {
  const serviceDone = input.hasPublishedService;
  const verificationDone = input.verificationStatus === "VERIFIED";
  const verificationUnavailable = input.providerType === "INDIVIDUAL";
  const doneCount = 1 + (serviceDone ? 1 : 0) + (verificationDone ? 1 : 0);

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
        title: "Пройдите проверку — значок и место выше в выдаче",
        done: verificationDone,
        optional: true,
        href: verificationUnavailable || verificationDone ? undefined : "/pro/profile/verification",
        note: verificationUnavailable ? "Проверка для физлиц появится позже" : undefined,
      },
    ],
  };
}
