import { render, screen } from "@testing-library/react";
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
          ctaText: "Записаться",
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

  it("shows city name in otherCities variant", () => {
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
          ctaText: "Записаться",
          rating: 4.8,
        }}
      />
    );

    expect(screen.getByText("Екатеринбург")).toBeInTheDocument();
    expect(screen.getByText("4.8")).toBeInTheDocument();
  });
});
