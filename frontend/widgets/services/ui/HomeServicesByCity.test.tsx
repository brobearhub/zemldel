import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { HomeServicesByCity } from "./HomeServicesByCity";
import { authReducer } from "@/core/store/authSlice";
import type { ServiceRecord } from "@/entities/service";
import type { AuthState } from "@/core/store/authSlice";
import { CitySelectProvider } from "@/features/select-city";

function createTestStore(auth: AuthState) {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth,
    },
  });
}

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("HomeServicesByCity", () => {
  const baseService: Omit<ServiceRecord, "id" | "title" | "provider"> = {
    price: "1000 ₽",
    ctaText: "Записаться",
    categoryId: "cat-1",
    category: { id: "cat-1", name: "Main", slug: "main", parentId: null, sortOrder: null },
    status: "PUBLISHED",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.removeItem("zemledel:selected-city:v1");
  });

  it("shows all services for guest in one section (no selected city)", async () => {
    const store = createTestStore({ status: "unauthenticated", user: null, error: null });

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            ...baseService,
            id: "s1",
            title: "Услуга 1",
            provider: {
              id: "p1",
              name: "P1",
              city: { id: "c1", name: "Екатеринбург", regionCode: "66", regionName: "Свердловская область" },
            },
            publishedAt: "2026-09-10T10:00:00.000Z",
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    render(
      <Provider store={store}>
        <CitySelectProvider>
          <HomeServicesByCity />
        </CitySelectProvider>
      </Provider>
    );

    expect(await screen.findByText("Услуга 1")).toBeInTheDocument();
    expect(screen.getByText("Услуги")).toBeInTheDocument();
    expect(screen.queryByText("Услуги в других городах")).not.toBeInTheDocument();
  });

  it("splits services by customer city when authenticated (two requests)", async () => {
    const store = createTestStore({
      status: "authenticated",
      error: null,
      user: {
        id: "u1",
        email: "a@b.c",
        name: "User",
        image: null,
        systemRole: "CUSTOMER",
        activeProviderId: null,
        customerCity: { id: "c1", name: "Екатеринбург", regionCode: "66", regionName: "Свердловская область" },
        memberships: [],
        linkedAuthProviders: [],
        stepUpVerifiedAt: {},
      },
    });

    const fetchMock = vi.spyOn(global, "fetch");
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/services?cityId=c1")) {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              {
                ...baseService,
                id: "s1",
                title: "Моя услуга",
                publishedAt: "2026-09-20T10:00:00.000Z",
                provider: {
                  id: "p1",
                  name: "P1",
                  city: { id: "c1", name: "Екатеринбург", regionCode: "66", regionName: "Свердловская область" },
                },
              },
            ]),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );
      }

      if (url.includes("/api/services?excludeCityId=c1")) {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              {
                ...baseService,
                id: "s2",
                title: "Чужая услуга",
                publishedAt: "2026-09-21T10:00:00.000Z",
                provider: {
                  id: "p2",
                  name: "P2",
                  city: { id: "c2", name: "Москва", regionCode: "77", regionName: "Москва" },
                },
              },
            ]),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    });

    render(
      <Provider store={store}>
        <CitySelectProvider>
          <HomeServicesByCity />
        </CitySelectProvider>
      </Provider>
    );

    expect(await screen.findByText("Екатеринбург")).toBeInTheDocument();
    expect(await screen.findByText("Моя услуга")).toBeInTheDocument();
    expect(screen.getByText("Услуги в других городах")).toBeInTheDocument();
    expect(screen.getByText("Чужая услуга")).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/services?cityId=c1"));
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/services?excludeCityId=c1"));
    });
  });

  it("hides the my-city section when there are no local services", async () => {
    const store = createTestStore({
      status: "authenticated",
      error: null,
      user: {
        id: "u1",
        email: "a@b.c",
        name: "User",
        image: null,
        systemRole: "CUSTOMER",
        activeProviderId: null,
        customerCity: { id: "c1", name: "Екатеринбург", regionCode: "66", regionName: "Свердловская область" },
        memberships: [],
        linkedAuthProviders: [],
        stepUpVerifiedAt: {},
      },
    });

    vi.spyOn(global, "fetch").mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/services?cityId=c1")) {
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      }
      if (url.includes("/api/services?excludeCityId=c1")) {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              {
                ...baseService,
                id: "s2",
                title: "Чужая услуга",
                publishedAt: "2026-09-21T10:00:00.000Z",
                provider: {
                  id: "p2",
                  name: "P2",
                  city: { id: "c2", name: "Москва", regionCode: "77", regionName: "Москва" },
                },
              },
            ]),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );
      }
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    });

    render(
      <Provider store={store}>
        <CitySelectProvider>
          <HomeServicesByCity />
        </CitySelectProvider>
      </Provider>
    );

    expect(await screen.findByText("Чужая услуга")).toBeInTheDocument();
    expect(screen.getByText("Услуги в других городах")).toBeInTheDocument();
    expect(screen.queryByText("Услуги")).not.toBeInTheDocument();
    expect(screen.queryByText("Екатеринбург")).not.toBeInTheDocument();
  });

  it("sorts services inside each section by publishedAt desc", async () => {
    const store = createTestStore({
      status: "authenticated",
      error: null,
      user: {
        id: "u1",
        email: "a@b.c",
        name: "User",
        image: null,
        systemRole: "CUSTOMER",
        activeProviderId: null,
        customerCity: { id: "c1", name: "Екатеринбург", regionCode: "66", regionName: "Свердловская область" },
        memberships: [],
        linkedAuthProviders: [],
        stepUpVerifiedAt: {},
      },
    });

    vi.spyOn(global, "fetch").mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/services?cityId=c1")) {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              {
                ...baseService,
                id: "s-old",
                title: "Старая в моем городе",
                publishedAt: "2026-09-01T10:00:00.000Z",
                provider: {
                  id: "p1",
                  name: "P1",
                  city: { id: "c1", name: "Екатеринбург", regionCode: "66", regionName: "Свердловская область" },
                },
              },
              {
                ...baseService,
                id: "s-new",
                title: "Новая в моем городе",
                publishedAt: "2026-09-10T10:00:00.000Z",
                provider: {
                  id: "p2",
                  name: "P2",
                  city: { id: "c1", name: "Екатеринбург", regionCode: "66", regionName: "Свердловская область" },
                },
              },
            ]),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );
      }

      if (url.includes("/api/services?excludeCityId=c1")) {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              {
                ...baseService,
                id: "s-other-old",
                title: "Старая в другом городе",
                publishedAt: "2026-09-02T10:00:00.000Z",
                provider: {
                  id: "p3",
                  name: "P3",
                  city: { id: "c2", name: "Москва", regionCode: "77", regionName: "Москва" },
                },
              },
              {
                ...baseService,
                id: "s-other-new",
                title: "Новая в другом городе",
                publishedAt: "2026-09-20T10:00:00.000Z",
                provider: {
                  id: "p4",
                  name: "P4",
                  city: { id: "c2", name: "Москва", regionCode: "77", regionName: "Москва" },
                },
              },
            ]),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    });

    render(
      <Provider store={store}>
        <CitySelectProvider>
          <HomeServicesByCity />
        </CitySelectProvider>
      </Provider>
    );

    const myNew = await screen.findByText("Новая в моем городе");
    const myOld = screen.getByText("Старая в моем городе");
    expect(myNew.compareDocumentPosition(myOld) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const otherNew = screen.getByText("Новая в другом городе");
    const otherOld = screen.getByText("Старая в другом городе");
    expect(otherNew.compareDocumentPosition(otherOld) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
