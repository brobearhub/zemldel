import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PublicUnlinkedRequestForm } from "./PublicUnlinkedRequestForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/features/select-city", () => ({
  useSelectedCity: () => ({
    id: "city-1",
    value: "Москва",
    cityLabel: "Москва",
    regionLabel: "Москва",
  }),
  LocationField: () => <div>location-field</div>,
}));

vi.mock("@/shared/ui/CadastralNumberChipsField", () => ({
  CadastralNumberChipsField: () => <div>cadastral-field</div>,
}));

vi.mock("@/widgets/public-service/ui/RequestFormLogo", () => ({
  RequestFormLogo: () => <div>logo</div>,
}));

describe("PublicUnlinkedRequestForm", () => {
  it("объясняет сценарий выбора среди нескольких исполнителей", () => {
    render(<PublicUnlinkedRequestForm isAuthenticated variant="card" />);

    expect(
      screen.getByText("Заявку увидят несколько подходящих исполнителей. Сравните ответы в чатах и выберите одного.")
    ).toBeInTheDocument();
  });
});
