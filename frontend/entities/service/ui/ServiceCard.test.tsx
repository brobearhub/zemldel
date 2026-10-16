import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ServiceCard } from "./ServiceCard";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("ServiceCard", () => {
  it("builds correct link and shows price, title, rating for myCity variant", () => {
    render(
      <ServiceCard
        variant="myCity"
        item={{
          id: "svc-1",
          title: "Услуга 1",
          price: "от 25 000 ₽",
          provider: { id: "prov-1", name: "Провайдер 1", city: null },
          rating: 4.9,
          reviewCount: 1,
        }}
      />
    );

    expect(screen.getByRole("link")).toHaveAttribute("href", "/services/svc-1");
    expect(screen.getByText("от 25 000 ₽")).toBeInTheDocument();
    expect(screen.getByText("Услуга 1")).toBeInTheDocument();
    expect(screen.getByText("4.9")).toBeInTheDocument();
  });

  it("shows work places and expands the rest", async () => {
    const user = userEvent.setup();
    render(
      <ServiceCard
        variant="otherCities"
        item={{
          id: "svc-2",
          title: "Услуга 2",
          price: "2000 ₽",
          provider: {
            id: "prov-2",
            name: "Провайдер 2",
            city: { id: "city-1", name: "Екатеринбург", regionCode: "66", regionName: "Свердловская область" },
          },
          places: [
            { kind: "city", cityId: "1", name: "Казань", regionCode: "16", regionName: "респ. Татарстан" },
            { kind: "city", cityId: "2", name: "Сочи", regionCode: "23", regionName: "край Краснодарский" },
            { kind: "city", cityId: "3", name: "Пермь", regionCode: "59", regionName: "край Пермский" },
            { kind: "region", name: "обл. Московская", regionCode: "50", regionName: "обл. Московская" },
          ],
          rating: 4.8,
        }}
      />
    );

    expect(screen.getByText("Казань, Сочи, Пермь")).toBeInTheDocument();
    expect(screen.queryByText(/Московская/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "ещё 1" }));
    expect(screen.getByText(/Московская обл\./)).toBeInTheDocument();
    expect(screen.getByText("4.8")).toBeInTheDocument();
  });

  it("shows the label ribbon when a stock badge is set", () => {
    render(
      <ServiceCard
        item={{
          id: "svc-3",
          title: "Услуга 3",
          price: "1000 ₽",
          provider: { id: "prov-3", name: "Провайдер 3", city: null },
          stockBadge: "Осталось 3 слота",
          paletteColor: "info",
        }}
      />
    );

    expect(screen.getByText("Осталось 3 слота")).toBeInTheDocument();
  });

  it("does not link the card when linked is false", () => {
    render(
      <ServiceCard
        linked={false}
        item={{
          id: "svc-4",
          title: "Превью",
          price: "15 000 ₽",
          provider: { id: "prov-4", name: "Провайдер", city: null },
        }}
      />
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Превью")).toBeInTheDocument();
  });
});
