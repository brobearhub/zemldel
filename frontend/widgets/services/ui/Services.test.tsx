import { render, screen, waitFor } from "@testing-library/react";
import { Services } from "./Services";
import { Provider } from "react-redux";
import { makeStore } from "@/core/store/store";
import { setServices } from "@/widgets/services/model/service.slice";
import { legalService, mainService } from "../../../tests/fixtures/services";
import type { ServiceRecord } from "@/entities/service";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("Services widget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderWithStore(dtos: ServiceRecord[] = []) {
    const store = makeStore();
    store.dispatch(setServices(dtos));
    return render(
      <Provider store={store}>
        <Services />
      </Provider>
    );
  }

  it("renders section headings even when empty", async () => {
    renderWithStore([]);

    await waitFor(() => {
      expect(screen.getByText("Основные услуги")).toBeInTheDocument();
      expect(screen.getByText("Юридические услуги")).toBeInTheDocument();
    });
  });

  it("renders categories and cards from store", async () => {
    renderWithStore([mainService, legalService]);

    await waitFor(() => {
      expect(screen.getByText("Основные услуги")).toBeInTheDocument();
      expect(screen.getByText("Юридические услуги")).toBeInTheDocument();
      expect(screen.getByText(mainService.title)).toBeInTheDocument();
      expect(screen.getByText(legalService.title)).toBeInTheDocument();
    });
  });
});
