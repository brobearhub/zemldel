import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LocationPicker } from "./LocationPicker";
import { CityAutocomplete } from "@/shared/ui/CityAutocomplete";
import { ServiceGeographyField } from "@/features/select-service-places/ui/ServiceGeographyField";

const city = { id: "kazan", name: "Казань", regionCode: "16", regionName: "Татарстан", displayName: "Казань", featured: false };
const retryName = "Попробуйте еще раз";

beforeEach(() => {
  Element.prototype.scrollTo = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("shows retry only after the third failure, reloads capitals and retries city search", async () => {
  let rejectThird!: (error: Error) => void;
  const fetchMock = vi.spyOn(globalThis, "fetch")
    .mockRejectedValueOnce(new Error("signal timed out"))
    .mockRejectedValueOnce(new Error("signal timed out"))
    .mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectThird = reject; }));
  render(<LocationPicker value={null} onSelect={vi.fn()} />);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  expect(screen.queryByRole("button", { name: retryName })).not.toBeInTheDocument();
  expect(screen.getByRole("progressbar")).toBeInTheDocument();
  await act(async () => rejectThird(new Error("signal timed out")));
  expect(await screen.findByRole("button", { name: retryName })).toBeInTheDocument();
  expect(screen.queryByText("signal timed out")).not.toBeInTheDocument();
  fetchMock.mockRejectedValueOnce(new Error("offline"))
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce(new Response(JSON.stringify([city])));
  fireEvent.click(screen.getByRole("button", { name: retryName }));
  expect(await screen.findByText("Казань")).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(6);
  fetchMock.mockRejectedValue(new Error("offline"));
  fireEvent.change(screen.getByRole("textbox", { name: "Поиск города" }), { target: { value: "Ка" } });
  expect(await screen.findByRole("button", { name: retryName })).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(9);
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([city])));
  fireEvent.click(screen.getByRole("button", { name: retryName }));
  await waitFor(() => expect(screen.queryByRole("button", { name: retryName })).not.toBeInTheDocument());
  expect(await screen.findByText("Казань")).toBeInTheDocument();
});

it.each([false, true])("retries autocomplete lookup (capitals: %s)", async (suggestCapitals: boolean) => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
  const onChange = vi.fn();
  render(<CityAutocomplete label="Город" value={null} onChange={onChange} suggestCapitals={suggestCapitals} />);
  const input = screen.getByRole("combobox");
  fireEvent.focus(input);
  fireEvent.mouseDown(input);
  if (!suggestCapitals) fireEvent.change(input, { target: { value: "Ка" } });
  const button = await screen.findByRole("button", { name: retryName });
  expect(fetchMock).toHaveBeenCalledTimes(3);
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([city])));
  fireEvent.click(button);
  fireEvent.click(await screen.findByRole("option"));
  expect(onChange).toHaveBeenCalledWith(city);
  expect(fetchMock).toHaveBeenCalledTimes(4);
});

it("retries geography search and a failed next page without losing previous cities", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
  render(<ServiceGeographyField value={[]} onChange={vi.fn()} />);
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "Ка" } });
  fireEvent.click(await screen.findByRole("button", { name: retryName }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(6));
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ regions: [], cities: [{ ...city, kind: "city" }], hasMore: true })));
  fireEvent.click(await screen.findByRole("button", { name: retryName }));
  expect(await screen.findByText("Казань")).toBeInTheDocument();
  const list = screen.getByRole("listbox");
  Object.defineProperties(list, { scrollHeight: { value: 1000 }, clientHeight: { value: 200 }, scrollTop: { value: 790, writable: true } });
  fireEvent.scroll(list);
  expect(await screen.findByRole("button", { name: retryName })).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(10);
  expect(screen.getByText("Казань")).toBeInTheDocument();
  // Scrolling again must not start a fourth automatic attempt.
  list.scrollTop = 0;
  fireEvent.scroll(list);
  list.scrollTop = 790;
  fireEvent.scroll(list);
  expect(fetchMock).toHaveBeenCalledTimes(10);
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ regions: [], cities: [{ ...city, id: "kaspiysk", name: "Каспийск", kind: "city" }], hasMore: false })));
  fireEvent.click(screen.getByRole("button", { name: retryName }));
  expect(await screen.findByText("Каспийск")).toBeInTheDocument();
  expect(screen.getByText("Казань")).toBeInTheDocument();
  expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain("offset=1");
});

it("hides matching name and region even when the selected city has another ID", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
    regions: [],
    cities: [{ ...city, kind: "city" }],
    hasMore: false,
  })));
  render(<ServiceGeographyField
    value={[{ kind: "city", cityId: "another-id", name: " КАЗАНЬ ", regionCode: city.regionCode, regionName: city.regionName }]}
    onChange={vi.fn()}
  />);
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "Казань" } });
  expect(await screen.findByText("Все найденные места уже добавлены")).toBeInTheDocument();
  expect(screen.queryByRole("option")).not.toBeInTheDocument();
});

it("deduplicates lookup results by name and region but permits a different region", async () => {
  const onChange = vi.fn();
  const other = { ...city, id: "other-region", regionCode: "43", regionName: "Кировская область", kind: "city" };
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
    regions: [],
    cities: [{ ...city, kind: "city" }, { ...city, id: "duplicate", name: "КАЗАНЬ", kind: "city" }, other],
    hasMore: false,
  })));
  const view = render(<ServiceGeographyField value={[]} onChange={onChange} />);
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "Казань" } });
  expect(await screen.findAllByRole("option")).toHaveLength(2);
  view.rerender(<ServiceGeographyField
    value={[{ kind: "city", cityId: "selected-alias", name: city.name, regionCode: city.regionCode, regionName: city.regionName }]}
    onChange={onChange}
  />);
  expect(await screen.findAllByRole("option")).toHaveLength(1);
  fireEvent.click(screen.getByRole("option"));
  expect(onChange).toHaveBeenCalledOnce();
  expect(onChange.mock.calls[0][0]).toHaveLength(2);
  expect(onChange.mock.calls[0][0][1].regionCode).toBe("43");
});
