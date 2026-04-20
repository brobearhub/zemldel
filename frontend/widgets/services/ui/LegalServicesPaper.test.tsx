import { render, screen, waitFor } from "@testing-library/react";
import { LegalServicesPaper } from "./LegalServicesPaper";
import { legalService, mainService } from "../../../tests/fixtures/services";

describe("LegalServicesPaper", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    global.fetch = fetchMock as any;
  });

  it("renders only legal service titles", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [mainService, legalService],
    });

    render(<LegalServicesPaper />);

    await waitFor(() => {
      expect(screen.getByText("Юридические услуги")).toBeInTheDocument();
      expect(screen.getByText(legalService.title)).toBeInTheDocument();
      expect(screen.queryByText(mainService.title)).not.toBeInTheDocument();
    });
  });

  it("shows fallback error text on failed request", async () => {
    fetchMock.mockRejectedValue("network issue");

    render(<LegalServicesPaper />);

    await waitFor(() => {
      expect(screen.getByText("Ошибка загрузки")).toBeInTheDocument();
    });
  });

  it("shows explicit error when response is not ok", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    render(<LegalServicesPaper />);

    await waitFor(() => {
      expect(screen.getByText("Failed to fetch services")).toBeInTheDocument();
    });
  });
});
