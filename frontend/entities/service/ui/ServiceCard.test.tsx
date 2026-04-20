import { render, screen } from "@testing-library/react";
import { ServiceCard } from "./ServiceCard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/core/store/hooks", () => ({
  useAppSelector: vi.fn(() => ({ status: "unauthenticated" })),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("ServiceCard", () => {
  it("builds correct link and shows singular review label", () => {
    render(
      <ServiceCard
        item={{
          id: "svc-1",
          title: "Услуга 1",
          price: "1000 ₽",
          provider: { id: "prov-1", name: "Провайдер 1", city: null },
          ctaText: "Записаться",
          rating: 4.8,
          reviewCount: 1,
        }}
      />
    );

    expect(screen.getByRole("link")).toHaveAttribute("href", "/services/svc-1");
    expect(screen.getByText("1 отзыв")).toBeInTheDocument();
  });

  it("shows plural review labels", () => {
    const { rerender } = render(
      <ServiceCard
        item={{
          id: "svc-2",
          title: "Услуга 2",
          price: "2000 ₽",
          provider: { id: "prov-2", name: "Провайдер 2", city: null },
          ctaText: "Записаться",
          reviewCount: 3,
        }}
      />
    );

    expect(screen.getByText("3 отзыва")).toBeInTheDocument();

    rerender(
      <ServiceCard
        item={{
          id: "svc-3",
          title: "Услуга 3",
          price: "3000 ₽",
          provider: { id: "prov-3", name: "Провайдер 3", city: null },
          ctaText: "Записаться",
          reviewCount: 7,
        }}
      />
    );

    expect(screen.getByText("7 отзывов")).toBeInTheDocument();
  });
});
