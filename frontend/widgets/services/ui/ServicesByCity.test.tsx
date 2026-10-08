import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ServicesByCity } from "./ServicesByCity";
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

const baseService: Omit<ServiceRecord, "id" | "title" | "provider"> = {
  price: "1000 ₽",
  ctaText: "Записаться",
  categoryId: "cat-1",
  category: { id: "cat-1", name: "Main", slug: "main", parentId: null, sortOrder: null },
  status: "PUBLISHED",
};

describe("ServicesByCity", () => {
  beforeEach(() => {
    window.localStorage.removeItem("zemledel:selected-city:v1");
  });

  it("hides the my-city section when there are no local services", () => {
    const store = createTestStore({
      status: "authenticated",
      error: null,
      user: {
        id: "u1",
        email: "a@b.c",
        name: "User",
        image: null,
        phone: null,
        systemRole: "CUSTOMER",
        activeProviderId: null,
        customerCity: { id: "c1", name: "Екатеринбург", regionCode: "66", regionName: "Свердловская область" },
        memberships: [],
        linkedAuthProviders: [],
        stepUpVerifiedAt: {},
      },
    });

    render(
      <Provider store={store}>
        <CitySelectProvider>
          <ServicesByCity
            items={[
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
            ]}
          />
        </CitySelectProvider>
      </Provider>
    );

    expect(screen.getByText("Чужая услуга")).toBeInTheDocument();
    expect(screen.getByText("Услуги в других городах")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Услуги" })).not.toBeInTheDocument();
  });
});
