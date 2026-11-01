import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
  RequestCustomerDto,
  RequestProDto,
  RequestStatus,
  RequestSubjectType,
} from "@/entities/request";
import {
  createCustomerRequestLifecycleBehavior,
  createProviderRequestLifecycleBehavior,
} from "../model/request-lifecycle-behavior";
import { RequestLifecycleActions } from "./RequestLifecycleActions";
import { describe, expect, it, vi } from "vitest";

function makeProvider(overrides: Partial<RequestProDto> = {}): RequestProDto {
  return {
    id: "r1",
    subjectType: "FREEFORM" satisfies RequestSubjectType,
    serviceId: null,
    serviceTitle: null,
    categoryId: null,
    categoryName: null,
    message: null,
    location: null,
    status: "ACTIVE" satisfies RequestStatus,
    providerId: "p1",
    dealTerms: null,
    offerVersion: null,
    termsVersion: null,
    contractAcceptedAt: null,
    acceptanceRequestedAt: null,
    autoAcceptAt: null,
    acceptedAt: null,
    currentSubmission: null,
    deliverySubmissions: [],
    offerStatus: "SELECTED",
    offerSelectedAt: null,
    offerDeclinedAt: null,
    requestCityId: null,
    requestCity: null,
    fiasInactiveWarning: false,
    lockedAt: null,
    customerName: null,
    customerEmail: null,
    customerPhone: null,
    customerImage: null,
    conversationsCount: 0,
    isLocked: false,
    customerLastMessage: null,
    providerLastMessage: null,
    awaitingCustomerReply: false,
    lastMessageAt: null,
    totalAmountRubles: null,
    servicePriceRubles: null,
    paidAmountRubles: 0,
    remainingAmountRubles: null,
    payments: [],
    cadastralNumbers: [],
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-01T10:00:00.000Z",
    ...overrides,
  };
}

function makeCustomer(
  overrides: Partial<RequestCustomerDto> = {},
): RequestCustomerDto {
  return {
    id: "r1",
    subjectType: "FREEFORM" satisfies RequestSubjectType,
    status: "ACCEPTANCE_PENDING" satisfies RequestStatus,
    serviceId: null,
    categoryId: null,
    message: null,
    location: null,
    providerId: "p1",
    dealTerms: null,
    offerVersion: null,
    termsVersion: null,
    contractAcceptedAt: null,
    acceptanceRequestedAt: "2026-11-01T10:00:00.000Z",
    autoAcceptAt: "2026-11-08T10:00:00.000Z",
    acceptedAt: null,
    currentSubmission: null,
    deliverySubmissions: [],
    selectedProviderIds: ["p1"],
    declinedProviderIds: [],
    lastSelectionAt: "2026-10-01T10:00:00.000Z",
    offers: [],
    requestCityId: null,
    requestCity: null,
    fiasInactiveWarning: false,
    lockedAt: "2026-10-01T10:00:00.000Z",
    serviceTitle: null,
    serviceImage: null,
    categoryName: null,
    providerName: null,
    providerPhone: null,
    providerEmail: null,
    providerImage: null,
    customerName: null,
    customerEmail: null,
    customerUserId: "u1",
    totalAmountRubles: null,
    servicePriceRubles: null,
    paidAmountRubles: 0,
    remainingAmountRubles: null,
    payments: [],
    cadastralNumbers: [],
    canDeleteByCustomer: false,
    providerLastMessage: null,
    customerLastMessage: null,
    awaitingProviderReply: false,
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-11-01T10:00:00.000Z",
    ...overrides,
  };
}

function createProviderBehavior(
  request: RequestProDto,
  markRendered = vi.fn(),
) {
  return {
    behavior: createProviderRequestLifecycleBehavior({
      request,
      actions: {
        startWork: vi.fn(),
        markRendered,
        requestAcceptance: vi.fn(),
        complete: vi.fn(),
        declineOffer: vi.fn(),
      },
    }),
    markRendered,
  };
}

describe("RequestLifecycleActions delivery dialog", () => {
  it("не отправляет пустой итог", async () => {
    const user = userEvent.setup();
    const { behavior, markRendered } = createProviderBehavior(makeProvider());

    render(<RequestLifecycleActions behavior={behavior} />);

    await user.click(screen.getByRole("button", { name: "Услуга выполнена" }));
    await user.click(
      screen.getByRole("button", { name: "Передать на принятие" }),
    );

    expect(markRendered).not.toHaveBeenCalled();
    expect(screen.getByText("Укажите итог результата.")).toBeInTheDocument();
  });

  it("отправляет введённый итог без внешних пробелов", async () => {
    const user = userEvent.setup();
    const { behavior, markRendered } = createProviderBehavior(makeProvider());

    render(<RequestLifecycleActions behavior={behavior} />);

    await user.click(screen.getByRole("button", { name: "Услуга выполнена" }));
    await user.type(
      screen.getByRole("textbox", { name: "Итог результата" }),
      "  Результат готов  ",
    );
    await user.click(
      screen.getByRole("button", { name: "Передать на принятие" }),
    );

    expect(markRendered).toHaveBeenCalledWith("Результат готов");
  });

  it("не закрывает диалог и сохраняет итог при ошибке сдачи", async () => {
    const user = userEvent.setup();
    const markRendered = vi
      .fn<(summary: string) => Promise<void>>()
      .mockRejectedValue(new Error("Сдача отклонена"));
    const { behavior } = createProviderBehavior(
      makeProvider(),
      markRendered,
    );

    render(<RequestLifecycleActions behavior={behavior} />);

    await user.click(screen.getByRole("button", { name: "Услуга выполнена" }));
    const input = screen.getByRole("textbox", { name: "Итог результата" });
    await user.type(input, "Итог для повторной отправки");
    await user.click(
      screen.getByRole("button", { name: "Передать на принятие" }),
    );

    expect(
      await screen.findByRole("textbox", { name: "Итог результата" }),
    ).toHaveValue("Итог для повторной отправки");
    expect(markRendered).toHaveBeenCalledTimes(1);
  });

  it("при повторной сдаче показывает «Что исправлено»", async () => {
    const user = userEvent.setup();
    const { behavior } = createProviderBehavior(
      makeProvider({
        deliverySubmissions: [
          {
            id: "s1",
            sequence: 1,
            summary: "Первая версия",
            submittedAt: "2026-11-01T10:00:00.000Z",
            remarks: [],
          },
        ],
      }),
    );

    render(<RequestLifecycleActions behavior={behavior} />);

    await user.click(screen.getByRole("button", { name: "Услуга выполнена" }));

    expect(
      screen.getByRole("heading", { name: "Что исправлено" }),
    ).toBeInTheDocument();
  });
});

describe("RequestLifecycleActions customer acceptance", () => {
  it("показывает текущий итог, дату и версию рядом с действиями приёмки", () => {
    const request = makeCustomer({
      currentSubmission: {
        id: "s1",
        sequence: 1,
        summary: "Результат для проверки",
        submittedAt: "2026-11-01T10:00:00.000Z",
        remarks: [],
      },
      deliverySubmissions: [
        {
          id: "s1",
          sequence: 1,
          summary: "Результат для проверки",
          submittedAt: "2026-11-01T10:00:00.000Z",
          remarks: [],
        },
      ],
    });
    const behavior = createCustomerRequestLifecycleBehavior({
      request,
      canAcceptContract: false,
      actions: { openOfferDialog: vi.fn(), acceptResult: vi.fn() },
    });

    render(<RequestLifecycleActions behavior={behavior} />);

    expect(screen.getByText("Результат для проверки")).toBeInTheDocument();
    expect(
      screen.getByText(/Сдача версии 1 · 01\.11\.2026/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Принять результат" }),
    ).toBeInTheDocument();
  });
});
