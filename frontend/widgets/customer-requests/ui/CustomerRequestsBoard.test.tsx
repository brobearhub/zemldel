import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RequestCustomerDto } from "@/entities/request";
import { CustomerRequestsBoard } from "./CustomerRequestsBoard";

function request(overrides: Partial<RequestCustomerDto> & Pick<RequestCustomerDto, "id" | "status">): RequestCustomerDto {
  return {
    subjectType: "FREEFORM",
    serviceId: null,
    categoryId: null,
    message: "Текст заявки",
    location: null,
    providerId: null,
    dealTerms: null,
    offerVersion: null,
    termsVersion: null,
    contractAcceptedAt: null,
    acceptanceRequestedAt: null,
    autoAcceptAt: null,
    acceptedAt: null,
    selectedProviderIds: [],
    declinedProviderIds: [],
    lastSelectionAt: null,
    offers: [],
    requestCityId: null,
    requestCity: null,
    fiasInactiveWarning: false,
    lockedAt: null,
    serviceTitle: null,
    serviceImage: null,
    categoryName: null,
    providerName: null,
    providerPhone: null,
    providerEmail: null,
    providerImage: null,
    customerName: null,
    customerEmail: null,
    customerUserId: null,
    createdAt: "2026-10-05T17:25:00.000Z",
    updatedAt: "2026-10-05T17:25:00.000Z",
    totalAmountRubles: null,
    paidAmountRubles: 0,
    remainingAmountRubles: null,
    payments: [],
    cadastralNumbers: [],
    canDeleteByCustomer: false,
    ...overrides,
  };
}

describe("CustomerRequestsBoard", () => {
  it("renders status columns and opens a request on card click", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onDelete = vi.fn();
    const openItem = request({
      id: "new-1",
      status: "NEW",
      subjectType: "SERVICE",
      message: "Сделай красиво",
      serviceTitle: "Межевание участка",
      serviceImage: "https://cdn.example/service.jpg",
    });
    const freeform = request({
      id: "closed-1",
      status: "CLOSED",
      message: "Старая заявка",
      serviceImage: "https://cdn.example/ignored.jpg",
    });

    render(
      <CustomerRequestsBoard
        items={[openItem, freeform]}
        deletingId={null}
        onOpen={onOpen}
        onDelete={onDelete}
      />
    );

    expect(screen.getByText("Новая · 1")).toBeInTheDocument();
    expect(screen.getByText("Закрыто · 1")).toBeInTheDocument();
    expect(screen.queryByText("Обсуждение · 0")).not.toBeInTheDocument();
    expect(screen.getByText("Межевание участка")).toBeInTheDocument();
    expect(screen.queryByText("Сделай красиво")).not.toBeInTheDocument();
    expect(screen.getByText("Старая заявка")).toBeInTheDocument();
    expect(screen.getAllByText(/день|дня|дней/).length).toBeGreaterThan(0);
    expect(document.querySelector('img[src="https://cdn.example/service.jpg"]')).not.toBeNull();
    expect(document.querySelector('img[src="https://cdn.example/ignored.jpg"]')).toBeNull();
    expect(document.querySelector('img[src="/hero-bg-house_static_day.jpg"]')).not.toBeNull();

    await user.click(screen.getByRole("link", { name: /Межевание участка/i }));
    expect(onOpen).toHaveBeenCalledWith(openItem);
  });

  it("deletes without opening the request", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onDelete = vi.fn();
    const deletable = request({
      id: "new-2",
      status: "NEW",
      message: "Удаляемая заявка",
      canDeleteByCustomer: true,
    });

    render(
      <CustomerRequestsBoard items={[deletable]} deletingId={null} onOpen={onOpen} onDelete={onDelete} />
    );

    await user.click(screen.getByRole("button", { name: "Удалить заявку" }));
    expect(onDelete).toHaveBeenCalledWith(deletable);
    expect(onOpen).not.toHaveBeenCalled();
  });
});
