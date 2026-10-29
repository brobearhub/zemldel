import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ServiceLeadSection } from "./ServiceLeadSection";

vi.mock("@/features/create-service-request-lead", () => ({
  ServiceAskQuestionButton: ({ serviceId }: { serviceId: string }) => <div>ask:{serviceId}</div>,
  ServiceLeadCaptureForm: ({ serviceId }: { serviceId: string }) => <div>capture:{serviceId}</div>,
}));

describe("ServiceLeadSection", () => {
  it("для авторизованного пользователя объясняет создание чата", () => {
    render(
      <ServiceLeadSection
        serviceId="s1"
        serviceTitle="Кадастровые работы"
        isAuthenticated
        initialCustomerEmail={null}
      />
    );

    expect(screen.getByText("Оставить заявку")).toBeInTheDocument();
    expect(
      screen.getByText("Заявка появится в вашем профиле, а чат с исполнителем откроется сразу после отправки.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Мы создадим заявку по услуге «Кадастровые работы», откроем чат с исполнителем и, если добавите вопрос, отправим его в чат сразу.")
    ).toBeInTheDocument();
  });
});
