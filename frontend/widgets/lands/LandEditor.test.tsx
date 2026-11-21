import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material";
import type { ComponentProps } from "react";
import type { AuthMembership } from "@/core/auth/authorization";
import { createAppTheme } from "@/core/theme/createAppTheme";
import {
  emptyLandDraft,
  type LandKind,
  type LandListing,
} from "@/entities/land/types";
import { LandEditor } from "./LandEditor";
import type { AddressSuggestion, GeocodedPoint } from "@/entities/geocoding/types";

type TestMembership = Pick<
  AuthMembership,
  "providerId" | "providerName" | "role" | "status"
>;
let memberships: TestMembership[] = [];
const { request, push, renderMap } = vi.hoisted(() => ({
  request: vi.fn(),
  push: vi.fn(),
  renderMap: vi.fn<
    (_props: ComponentProps<typeof import("./LandMap").LandMap>) => null
  >(() => null),
}));
vi.mock("next-auth/react", () => ({
  useSession: () => ({
    status: "authenticated",
    data: { user: { id: "owner", memberships } },
  }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("./LandMap", () => ({ LandMap: renderMap }));
vi.mock("@/features/select-city/model/load-regional-capitals", () => ({
  loadRegionalCapitals: async () => [city, secondCity].map((item) => ({ ...item, featured: false })),
  suggestCities: async () => [],
}));
vi.mock("@/entities/land/api", async (original) => ({
  ...(await original<typeof import("@/entities/land/api")>()),
  landApi: request,
}));

const owner: TestMembership = {
  providerId: "bureau",
  providerName: "Бюро",
  role: "OWNER",
  status: "ACTIVE",
};

const manager: TestMembership = {
  providerId: "agency",
  providerName: "Агентство",
  role: "MANAGER",
  status: "ACTIVE",
};

const city = {
  id: "city",
  name: "Екатеринбург",
  regionCode: "66",
  regionName: "Свердловская область",
  displayName: "г Екатеринбург, Свердловская область",
};
const source = { id: "test", name: "Тестовый справочник", url: "https://example.test/addresses" };
const cityCenter = { latitude: 56.838607, longitude: 60.605514 };
const secondCity = { ...city, id: "perm", name: "Пермь", regionCode: "59", regionName: "Пермский край", displayName: "Пермь" };

const draft: LandListing = {
  ...emptyLandDraft(),
  id: "saved-draft",
  status: "DRAFT",
  version: 3,
  canManage: true,
  city: null,
  authorName: "Автор",
  provider: null,
  serviceId: null,
  places: [],
  photos: [],
  documents: [],
  documentCount: 0,
  documentStatus: "NOT_REQUESTED",
  documentReviewScope: null,
  documentReviewedAt: null,
  publishedAt: null,
  updatedAt: "",
  cadastralNumber: "66:41:020401:123",
  areaM2: 1200,
  permittedUses: ["ИЖС", "Садоводство"],
  purposes: ["HOME", "DACHA"],
  details: {
    electricity: "CONNECTED",
    powerKw: 15,
    access: "Грунтовая дорога",
  },
};

function renderEditor(props: ComponentProps<typeof LandEditor> = {}) {
  return render(
    <ThemeProvider theme={createAppTheme("light")}>
      <LandEditor {...props} />
    </ThemeProvider>,
  );
}

async function chooseCity(buttonLabel: string, name: string) {
  Element.prototype.scrollTo ??= vi.fn();
  const location = within(screen.getByRole("region", { name: "Расположение" }));
  fireEvent.click(location.getByRole("button", { name: buttonLabel }));
  const dialog = within(await screen.findByRole("dialog"));
  const [option] = await dialog.findAllByRole("button", { name: new RegExp(name) });
  await userEvent.click(option);
}

beforeEach(() => {
  memberships = [];
  request.mockReset();
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    const result = await request(url, init);
    return result instanceof Response ? result : Response.json(result);
  });
});

afterEach(() => vi.unstubAllGlobals());

it("groups ruble amounts in the editor and saves numeric prices, zero and empty values", async () => {
  const row: LandListing = {
    ...draft,
    dealType: "LEASE_ASSIGNMENT",
    priceRubles: 100000,
    details: { rentRubles: 0, rentPeriod: "MONTH" },
  };
  request.mockResolvedValue(row);
  renderEditor({ initial: row });
  const user = userEvent.setup();
  const price = screen.getByLabelText("Единовременная плата за уступку");
  const rent = screen.getByLabelText("Арендная плата", { exact: true });
  const save = screen.getAllByRole("button", { name: "Сохранить черновик" })[0];
  expect(price).toHaveValue("100\u00a0000");
  expect(rent).toHaveValue("0");

  await user.clear(price);
  await user.type(price, "0");
  await user.clear(rent);
  await user.paste("12 345.67");
  expect(rent).toHaveValue("12\u00a0345,67");
  await user.click(save);
  await screen.findByRole("status");
  expect(JSON.parse(request.mock.lastCall?.[1].body)).toMatchObject({
    priceRubles: 0,
    details: { rentRubles: 12345.67 },
  });

  await user.clear(rent);
  await user.click(save);
  await screen.findByRole("status");
  expect(JSON.parse(request.mock.lastCall?.[1].body).details.rentRubles).toBeNull();
});

it("keeps the share example out of saved drafts and previews the entered fraction", async () => {
  const row: LandListing = { ...draft, dealType: "SHARE" };
  request.mockResolvedValue(row);
  renderEditor({ initial: row });

  const share = within(screen.getByRole("group", { name: "Продаваемая доля в праве" }));
  const parts = share.getByLabelText("Сколько частей продаёте");
  const total = share.getByLabelText("Всего равных частей");
  const save = screen.getAllByRole("button", { name: "Сохранить черновик" })[0];
  expect(share.getByText("Пример ¼")).toBeVisible();
  expect(parts).toHaveValue(null);
  expect(total).toHaveValue(null);
  fireEvent.click(save);
  await screen.findByRole("status");
  const empty = JSON.parse(request.mock.lastCall?.[1].body).details;
  expect(empty).not.toHaveProperty("shareNumerator");
  expect(empty).not.toHaveProperty("shareDenominator");

  fireEvent.change(parts, { target: { value: "3" } });
  expect(share.queryByText("Пример ¼")).not.toBeInTheDocument();
  fireEvent.change(total, { target: { value: "2" } });
  expect(share.queryByText("3 из 2")).not.toBeInTheDocument();
  fireEvent.change(total, { target: { value: "4" } });
  expect(share.getByText("3 из 4")).toBeVisible();
  fireEvent.click(save);
  await screen.findByRole("status");
  expect(JSON.parse(request.mock.lastCall?.[1].body).details).toMatchObject({
    shareNumerator: 3,
    shareDenominator: 4,
  });
});

it("shows a legacy fraction above 200 and saves it once corrected", async () => {
  const row: LandListing = {
    ...draft,
    dealType: "SHARE",
    details: { ...draft.details, shareNumerator: 199, shareDenominator: 201 },
  };
  request.mockResolvedValue(row);
  renderEditor({ initial: row });
  const share = within(screen.getByRole("group", { name: "Продаваемая доля в праве" }));
  const total = share.getByLabelText("Всего равных частей");
  const save = screen.getAllByRole("button", { name: "Сохранить черновик" })[0];
  expect(total).toHaveValue(201);
  expect(total).toHaveAttribute("max", "200");
  expect(total).toHaveAccessibleDescription("Можно указать не больше 200 долей.");
  total.closest<HTMLElement>('[data-land-invalid="true"]')!.scrollIntoView = vi.fn();
  fireEvent.click(save);
  await screen.findByText("Проверьте количество долей.");
  expect(total).toHaveFocus();
  expect(request).not.toHaveBeenCalled();

  fireEvent.change(total, { target: { value: "200" } });
  expect(share.getByText("199 из 200")).toBeVisible();
  fireEvent.click(save);
  await screen.findByRole("status");
  expect(JSON.parse(request.mock.lastCall?.[1].body).details).toMatchObject({
    shareNumerator: 199,
    shareDenominator: 200,
  });
});

async function expectNewDraft(kind: LandKind, providerId: string | null) {
  request.mockResolvedValue({ ...draft, kind, providerId });
  fireEvent.click(
    screen.getAllByRole("button", { name: "Сохранить черновик" })[0],
  );
  await screen.findByRole("status");
  const [path, init] = request.mock.calls[0];
  expect(path).toBe("");
  expect(init.method).toBe("POST");
  expect(JSON.parse(init.body)).toMatchObject({ kind, providerId });
}

it.each([
  { state: "new", initial: undefined },
  { state: "reopened", initial: draft },
])(
  "keeps all sale sections in order before and after saving a $state draft",
  async ({ initial }) => {
    request.mockResolvedValue(draft);
    renderEditor({ initial });
    const headings = () =>
      screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    const order = [
      "Паспорт участка",
      "Объявление для покупателей",
      "Расположение",
      "Характеристики",
      "Цена и условия",
      "Документы и связь",
    ];
    expect(headings()).toEqual(order);
    const announcement = within(
      screen.getByRole("region", { name: "Объявление для покупателей" }),
    );
    expect(announcement.getByRole("textbox", { name: "Название" })).toBeVisible();
    expect(announcement.getByRole("textbox", { name: "Описание" })).toBeVisible();
    expect(announcement.getByText("Добавить фото")).toBeVisible();
    const characteristics = within(
      screen.getByRole("region", { name: "Характеристики" }),
    );
    expect(characteristics.getByLabelText("Ограничения, обременения, зоны")).toBeVisible();
    expect(characteristics.getByLabelText("Какие постройки есть и как они передаются")).toBeVisible();

    fireEvent.click(screen.getAllByRole("button", { name: "Сохранить черновик" })[0]);
    await screen.findByRole("status");
    expect(headings()).toEqual(order);
  },
);

it.each<{ account: string; unavailable: TestMembership[] }>([
  { account: "a personal account", unavailable: [] },
  {
    account: "an account without publishing rights",
    unavailable: [
      { ...owner, role: "EMPLOYEE" },
      { ...manager, status: "INVITED" },
      { ...owner, status: "SUSPENDED" },
    ],
  },
])(
  "opens a personal sale from a selection link for $account",
  async ({ unavailable }) => {
    memberships = unavailable;
    renderEditor({ initialKind: "SELECTION" });
    expect(screen.queryByLabelText("Профиль автора")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("radiogroup", { name: "Вид предложения" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Услуга подбора")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Полная цена участка")).toBeVisible();
    await expectNewDraft("SALE", null);
    expect(screen.getByLabelText("Полная цена участка")).toBeVisible();
  },
);

it("offers both authors for a sale and automatically uses the sole provider for selection", async () => {
  memberships = [manager];
  renderEditor();
  const author = screen.getByRole("combobox", { name: "Профиль автора" });
  expect(author).toHaveTextContent("Личный профиль");
  fireEvent.mouseDown(author);
  expect(
    screen.getByRole("option", { name: manager.providerName }),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("option", { name: "Личный профиль" }));
  fireEvent.click(screen.getByRole("radio", { name: "Услуга подбора" }));
  expect(screen.queryByLabelText("Профиль автора")).not.toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Стоимость подбора" }),
  ).toBeVisible();
  await expectNewDraft("SELECTION", manager.providerId);
});

it("offers only eligible providers for selection and saves the chosen author", async () => {
  memberships = [
    owner,
    manager,
    { ...owner, providerId: "staff", providerName: "Отдел", role: "EMPLOYEE" },
  ];
  renderEditor({ initialKind: "SELECTION" });
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Профиль автора" }));
  expect(screen.getAllByRole("option")).toHaveLength(2);
  expect(
    screen.getByRole("option", { name: owner.providerName }),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("option", { name: manager.providerName }));
  await expectNewDraft("SELECTION", manager.providerId);
});

it.each([
  { latitude: null, longitude: null },
  { latitude: 56.76, longitude: 60.54 },
])(
  "uses the city center as a map reference on reopening a draft with coordinates $latitude, $longitude",
  async (point) => {
    const row = { ...draft, city, cityId: city.id, ...point };
    request.mockImplementation(async (path) =>
      path.startsWith("/api/geocoding/city-center?") ? { point: { ...cityCenter, precision: "city", source } } : { ...row, version: 4 },
    );
    renderEditor({ initial: row });
    if (point.latitude === null) await screen.findByText(/Метка в центре/);
    else expect(request).not.toHaveBeenCalled();
    expect(renderMap.mock.lastCall?.[0]).toMatchObject({
      point,
      previewCity: point.latitude === null ? { ...city, center: cityCenter } : null,
    });
    fireEvent.click(
      screen.getAllByRole("button", { name: "Сохранить черновик" })[0],
    );
    await screen.findByRole("status");
    expect(JSON.parse(request.mock.lastCall?.[1].body)).toMatchObject({
      cityId: city.id,
      ...point,
    });
  },
);

it("uses the selected city's center as the starting point and preserves a manual correction", async () => {
  request.mockImplementation(async (path) => path.startsWith("/api/geocoding/city-center?") ? { point: { ...cityCenter, precision: "city", source } } : draft);
  renderEditor();
  await chooseCity("Выбрать город", city.name);
  await screen.findByText(/Метка в центре/);
  expect(screen.getByLabelText("Широта")).toHaveValue(cityCenter.latitude);
  expect(screen.getByLabelText("Долгота")).toHaveValue(cityCenter.longitude);
  fireEvent.click(screen.getAllByRole("button", { name: "Сохранить черновик" })[0]);
  await screen.findByRole("status");
  const saved = JSON.parse(request.mock.lastCall?.[1].body);
  expect(saved).toMatchObject({ cityId: city.id, ...cityCenter });
  expect(saved).not.toHaveProperty("source");
  expect(saved).not.toHaveProperty("precision");

  fireEvent.change(screen.getByLabelText("Широта"), { target: { value: "56.81" } });
  await chooseCity(city.name, city.name);
  await screen.findByText(/Метка в центре/);
  expect(screen.getByLabelText("Широта")).toHaveValue(56.81);
  expect(screen.getByLabelText("Долгота")).toHaveValue(cityCenter.longitude);
  fireEvent.click(screen.getByRole("button", { name: "К точке участка" }));
  expect(renderMap.mock.lastCall?.[0]).toMatchObject({
    previewCity: null,
    point: { latitude: 56.81, longitude: cityCenter.longitude },
  });
});

it.each(["switch", "clear", "pick", "address"] as const)("ignores a superseded city lookup after %s", async (action) => {
  let finish!: (value: typeof cityCenter) => void;
  const pending = new Promise<typeof cityCenter>((resolve) => { finish = resolve; });
  const perm = { latitude: 58.01, longitude: 56.25 };
  request.mockImplementation(async (path) => {
    if (path === "/api/geocoding/address-suggestions") return { items: [boulevard], source };
    return { point: { ...(path.endsWith(secondCity.id) ? perm : await pending), precision: "city", source } };
  });
  renderEditor();
  await chooseCity("Выбрать город", city.name);
  expect(screen.getByText(/Ищем центр/)).toBeVisible();
  if (action === "switch") await chooseCity(city.name, secondCity.name);
  if (action === "clear") fireEvent.click(screen.getByRole("button", { name: "Сбросить локацию" }));
  if (action === "pick") act(() => renderMap.mock.lastCall?.[0].onPick?.(56.72, 60.5));
  if (action === "address") {
    fireEvent.change(screen.getByRole("combobox", { name: "Адрес или ориентир" }), { target: { value: "тбил" } });
    fireEvent.click(await screen.findByRole("option", { name: boulevard.label }));
  }
  await act(async () => { finish(cityCenter); });
  const expected = { switch: perm.latitude, clear: null, pick: 56.72, address: boulevard.point!.latitude };
  expect(screen.getByLabelText("Широта")).toHaveValue(expected[action]);
  expect(screen.getAllByRole("button", { name: "Сохранить черновик" })[0]).toBeEnabled();
});

const boulevard: AddressSuggestion = {
  label: "г Екатеринбург, Тбилисский б-р",
  reference: {
    source: source.id,
    text: "620073, Свердловская обл, г Екатеринбург, Чкаловский р-н, Тбилисский б-р",
    key: "street-id",
  },
  point: { latitude: 56.7928361, longitude: 60.6285346, precision: "street", source },
};

const parcelNumber = "66:25:2901002:1319";
const parcelLocation = {
  status: "found",
  kind: "parcel",
  buildingAddress: null,
  address: "Свердловская обл, г Сысерть, ул Черемуховая, уч 18",
  city: { ...city, id: "sysert", name: "Сысерть" },
  point: { latitude: 56.52036, longitude: 60.825611, precision: "street", source },
};

it("looks up a pasted cadastral number on confirmation and saves the linked city, address and point", async () => {
  const user = userEvent.setup();
  request.mockImplementation(async (path) => path === "/api/geocoding/cadastral-location" ? parcelLocation : draft);
  renderEditor();
  const input = screen.getByRole("textbox", { name: "Кадастровый номер" });
  await user.click(input);
  await user.paste(parcelNumber);
  await user.tab();
  expect(request).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Сохранить кадастровый номер" }));
  expect(await screen.findByText("Найден участок.")).toBeVisible();
  expect(request).toHaveBeenCalledTimes(1);
  expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({ cadastralNumber: parcelNumber });
  expect(screen.getByRole("combobox", { name: "Адрес или ориентир" })).toHaveValue(parcelLocation.address);
  expect(screen.getByRole("button", { name: "Сысерть" })).toBeVisible();
  expect(renderMap.mock.lastCall?.[0].addressPoint).toEqual(parcelLocation.point);
  await user.click(screen.getAllByRole("button", { name: "Сохранить черновик" })[0]);
  expect(JSON.parse(request.mock.lastCall?.[1].body)).toMatchObject({
    cadastralNumber: parcelNumber,
    cityId: "sysert",
    address: parcelLocation.address,
    latitude: parcelLocation.point.latitude,
    longitude: parcelLocation.point.longitude,
  });
  act(() => renderMap.mock.lastCall?.[0].onPick?.(56.51, 60.82));
  fireEvent.change(input, { target: { value: "66:25:2901002:123" } });
  expect(screen.getByRole("combobox", { name: "Адрес или ориентир" })).toHaveValue("");
  expect(screen.getByRole("button", { name: "Выбрать город" })).toBeVisible();
  expect(screen.getByLabelText("Широта")).toHaveValue(56.51);
});

it("uses the building address as a land listing landmark for a cadastral unit", async () => {
  const building = "г Москва, ул Сухонская, д 11";
  request.mockResolvedValue({ ...parcelLocation, kind: "unit", address: building + ", кв 89", buildingAddress: building });
  renderEditor({ initial: draft });
  fireEvent.click(screen.getByRole("button", { name: "Сохранить кадастровый номер" }));
  await screen.findByText(/Номер относится к помещению/);
  expect(screen.getByRole("combobox", { name: "Адрес или ориентир" })).toHaveValue(building);
});

it("confirms with Enter and keeps manual location edits made during a cadastral lookup", async () => {
  let finish!: (value: typeof parcelLocation) => void;
  request.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  renderEditor({ initial: { ...draft, address: "У ворот" } });
  const input = screen.getByRole("textbox", { name: "Кадастровый номер" });
  fireEvent.change(input, { target: { value: "66:25" } });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(request).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: parcelNumber } });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(screen.getAllByRole("button", { name: "Сохранить черновик" })[0]).toBeDisabled();
  act(() => renderMap.mock.lastCall?.[0].onPick?.(56.52, 60.8));
  expect(request.mock.calls[0][1].signal.aborted).toBe(true);
  await act(async () => { finish(parcelLocation); });
  expect(screen.getByLabelText("Широта")).toHaveValue(56.52);
  expect(screen.getByRole("combobox", { name: "Адрес или ориентир" })).toHaveValue("У ворот");
  expect(screen.getAllByRole("button", { name: "Сохранить черновик" })[0]).toBeEnabled();
});

it.each(["not_found", "ambiguous", "unavailable"])("keeps the draft editable if cadastral lookup is %s", async (status) => {
  request.mockImplementation(async () => {
    if (status === "unavailable") throw new Error();
    return { status };
  });
  renderEditor({ initial: { ...draft, address: "У озера", latitude: 56.82, longitude: 60.7 } });
  fireEvent.click(screen.getByRole("button", { name: "Сохранить кадастровый номер" }));
  await screen.findByText(/вручную/i, { selector: "span[aria-live]" });
  expect(screen.getByRole("combobox", { name: "Адрес или ориентир" })).toHaveValue("У озера");
  expect(screen.getByLabelText("Широта")).toHaveValue(56.82);
  expect(screen.getByRole("button", { name: "Сохранить кадастровый номер" })).toBeEnabled();
});

it("places a selected street on the map and saves its coordinates in the draft", async () => {
  const row = { ...draft, address: "У леса", latitude: 56.76, longitude: 60.54 };
  request.mockImplementation(async (path) =>
    path === "/api/geocoding/address-suggestions" ? { items: [boulevard], source } : { ...row, version: 4 },
  );
  const user = userEvent.setup();
  renderEditor({ initial: row });
  const input = screen.getByRole("combobox", { name: "Адрес или ориентир" });
  expect(input).toHaveValue(row.address);
  expect(request).not.toHaveBeenCalled();
  await user.click(input);
  fireEvent.change(input, { target: { value: "екат тбил" } });
  await screen.findByRole("option", { name: boulevard.label });
  expect(screen.getByRole("link", { name: source.name })).toHaveAttribute("href", source.url);
  expect(screen.getByLabelText("Широта")).toHaveValue(row.latitude);
  await user.keyboard("{ArrowDown}{Enter}");
  expect(input).toHaveValue(boulevard.label);
  expect(screen.getByLabelText("Широта")).toHaveValue(56.7928361);
  expect(screen.getByLabelText("Долгота")).toHaveValue(60.6285346);
  expect(screen.getByText(/с точностью до улицы/)).toBeVisible();
  expect(renderMap.mock.lastCall?.[0]).toMatchObject({
    point: { latitude: 56.7928361, longitude: 60.6285346 },
    addressPoint: boulevard.point,
  });
  expect(request).toHaveBeenCalledTimes(1);
  expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({ query: "екат тбил" });
  await user.click(screen.getAllByRole("button", { name: "Сохранить черновик" })[0]);
  expect(request.mock.lastCall?.[0]).toBe("/saved-draft");
  expect(JSON.parse(request.mock.lastCall?.[1].body)).toMatchObject({
    address: boulevard.label,
    latitude: 56.7928361,
    longitude: 60.6285346,
  });
});

it.each(["resolved", "corrected", "missing"])("resolves the selected full address when coordinates are missing: %s", async (scenario) => {
  let finish!: (point: GeocodedPoint | null) => void;
  const resolution = new Promise<GeocodedPoint | null>((resolve) => { finish = resolve; });
  request.mockImplementation(async (path) =>
    path === "/api/geocoding/resolve-address" ? { point: await resolution } : { items: [{ ...boulevard, point: null }], source },
  );
  const user = userEvent.setup();
  renderEditor({ initial: { ...draft, latitude: 56.72, longitude: 60.5 } });
  const input = screen.getByRole("combobox", { name: "Адрес или ориентир" });
  fireEvent.change(input, { target: { value: "тбил" } });
  await user.click(await screen.findByRole("option", { name: boulevard.label }));
  expect(JSON.parse(request.mock.lastCall?.[1].body)).toEqual({
    reference: boulevard.reference,
  });
  const save = screen.getAllByRole("button", { name: "Сохранить черновик" })[0];
  expect(save).toBeDisabled();
  if (scenario === "corrected") {
    act(() => renderMap.mock.lastCall?.[0].onPick?.(56.75, 60.56));
    expect(save).toBeEnabled();
  }
  await act(async () => { finish(scenario === "missing" ? null : boulevard.point); });
  expect(save).toBeEnabled();
  if (scenario === "corrected") {
    expect(screen.getByLabelText("Широта")).toHaveValue(56.75);
    expect(screen.getByLabelText("Долгота")).toHaveValue(60.56);
    expect(screen.queryByText(/с точностью до улицы/)).toBeNull();
  } else if (scenario === "missing") {
    expect(screen.getByText(/Для этого адреса нет координат/)).toBeVisible();
    expect(screen.getByLabelText("Широта")).toHaveValue(56.72);
  } else {
    expect(screen.getByLabelText("Широта")).toHaveValue(56.7928361);
    expect(renderMap.mock.lastCall?.[0].addressPoint).toEqual(boulevard.point);
  }
});

it("asks for a fresh selection if the address provider changed while the form was open", async () => {
  request.mockImplementation(async (path) => path === "/api/geocoding/resolve-address"
    ? Response.json({}, { status: 409 })
    : { items: [{ ...boulevard, point: null }], source });
  renderEditor({ initial: { ...draft, latitude: 56.72, longitude: 60.5 } });
  const input = screen.getByRole("combobox", { name: "Адрес или ориентир" });
  fireEvent.change(input, { target: { value: "тбил" } });
  fireEvent.click(await screen.findByRole("option", { name: boulevard.label }));
  await screen.findByText(/Выберите адрес из списка ещё раз/);
  expect(screen.getByLabelText("Широта")).toHaveValue(56.72);
  expect(screen.getAllByRole("button", { name: "Сохранить черновик" })[0]).toBeEnabled();
});

it.each(["empty", "unavailable"])("saves a free-text landmark when suggestions are %s", async (state) => {
  const landmark = "У съезда к озеру";
  request.mockImplementation(async (path) => {
    if (path !== "/api/geocoding/address-suggestions") return draft;
    if (state === "empty") return { items: [], source };
    throw new Error("Suggestions unavailable");
  });
  renderEditor();
  const input = screen.getByRole("combobox", { name: "Адрес или ориентир" });
  fireEvent.change(input, { target: { value: landmark } });
  await screen.findByText(/Можно оставить введённый текст/);
  fireEvent.blur(input);
  fireEvent.click(screen.getAllByRole("button", { name: "Сохранить черновик" })[0]);
  await screen.findByRole("status");
  expect(request.mock.lastCall?.[0]).toBe("");
  expect(JSON.parse(request.mock.lastCall?.[1].body)).toMatchObject({ address: landmark });
});

it("adds official and custom permitted uses to a saved listing without rewriting its old values", async () => {
  const user = userEvent.setup();
  request.mockResolvedValue({ ...draft, version: 4 });
  renderEditor({ initial: draft });
  await user.click(screen.getByLabelText("ВРИ по документам"));
  const dialog = within(
    screen.getByRole("dialog", { name: "Классификатор ВРИ" }),
  );
  const input = dialog.getByRole("textbox", {
    name: "Поиск по классификатору ВРИ",
  });
  fireEvent.change(input, { target: { value: "13.2" } });
  await user.click(dialog.getByText("Ведение садоводства", { exact: true }));
  fireEvent.change(input, { target: { value: "5.2.2" } });
  const item = dialog.getByRole("treeitem", {
    name: "5.2.2 Отдых и оздоровление детей",
  });
  act(() => item.focus());
  await user.keyboard(" ");
  expect(item).toHaveAttribute("aria-checked", "true");
  await user.click(dialog.getByRole("tab", { name: "Свой ВРИ" }));
  fireEvent.change(dialog.getByLabelText("Формулировка из документов"), {
    target: { value: "По документам 1999 года\nСвой вид из выписки" },
  });
  await user.click(dialog.getByRole("button", { name: "Применить" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByText("5.2.2 · Отдых и оздоровление детей")).toBeVisible();
  expect(request).not.toHaveBeenCalled();
  await user.click(
    screen.getAllByRole("button", { name: "Сохранить черновик" })[0],
  );
  await screen.findByRole("status");
  expect(JSON.parse(request.mock.calls[0][1].body).permittedUses).toEqual([
    ...draft.permittedUses,
    "Ведение садоводства",
    "Отдых и оздоровление детей",
    "По документам 1999 года",
    "Свой вид из выписки",
  ]);
});

it.each([true, undefined])(
  "resumes a saved parcel with document review intent %s",
  async (intent) => {
    const row = {
      ...draft,
      details: { ...draft.details, requestDocumentReview: intent },
    };
    request.mockResolvedValue({ ...row, version: 4 });
    renderEditor({ initial: row });
    expect(screen.getByLabelText("Кадастровый номер")).toHaveValue(
      row.cadastralNumber,
    );
    expect(screen.getByLabelText("Площадь всего участка")).toHaveValue(12);
    expect(screen.getByLabelText("Для дачи")).toBeChecked();
    expect(screen.getByRole("combobox", { name: "Электричество" })).toHaveTextContent("Подключено");
    expect(screen.getByLabelText("Мощность электричества")).toHaveValue(15);
    expect(screen.getByLabelText("Подъезд и доступ к участку")).toHaveValue("Грунтовая дорога");
    expect(
      screen.getByLabelText("Запросить проверку документов"),
    ).toHaveProperty("checked", Boolean(intent));
    fireEvent.change(screen.getByLabelText("Название"), {
      target: { value: "Новое название" },
    });
    fireEvent.click(
      screen.getAllByRole("button", { name: "Сохранить черновик" })[1],
    );
    await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());
    expect(request).toHaveBeenCalledTimes(1);
    const [path, init] = request.mock.calls[0];
    expect(path).toBe("/saved-draft");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toMatchObject({
      title: "Новое название",
      version: 3,
      areaM2: 1200,
      purposes: row.purposes,
      permittedUses: row.permittedUses,
      details: { ...draft.details, requestDocumentReview: Boolean(intent) },
    });
  },
);
