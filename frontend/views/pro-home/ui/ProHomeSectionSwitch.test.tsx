import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProHomeSectionSwitch } from "./ProHomeSectionSwitch";

const { fetchRequestList } = vi.hoisted(() => ({ fetchRequestList: vi.fn() }));
vi.mock("@/widgets/pro-my-services/lib/fetch-request-list", () => ({ fetchRequestList }));
vi.mock("@/widgets/pro-my-services/model/FreeRequestNotificationsProvider", () => ({
  useFreeRequestNotifications: () => ({ hasNew: false }),
}));

beforeEach(() => {
  fetchRequestList.mockReset();
});
afterEach(cleanup);

function setup(serviceIds: string[]) {
  return render(
    <StrictMode>
      <ProHomeSectionSwitch
        serviceIds={serviceIds}
        services={<p>Лента услуг</p>}
        freeRequests={<p>Лента свободных</p>}
        reminders={<p>Список напоминаний</p>}
      />
    </StrictMode>,
  );
}

describe("initial request feed selection", () => {
  it("keeps service requests selected if any service has open requests", async () => {
    fetchRequestList.mockImplementation(({ serviceId }) =>
      Promise.resolve({ items: serviceId === "second" ? [{ id: "request" }] : [] }),
    );
    setup(["first", "second"]);
    expect(await screen.findByText("Лента услуг")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Заявки по услугам" })).toHaveAttribute("aria-selected", "true");
    expect(fetchRequestList).toHaveBeenCalledTimes(2);
    expect(fetchRequestList).not.toHaveBeenCalledWith({ serviceId: null }, expect.anything(), expect.anything());
  });

  it("opens free requests when services have none and free requests exist", async () => {
    fetchRequestList.mockImplementation(({ serviceId }) =>
      Promise.resolve({ items: serviceId === null ? [{ id: "free" }] : [] }),
    );
    setup(["first"]);
    expect(await screen.findByText("Лента свободных")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Свободные заявки" })).toHaveAttribute("aria-selected", "true");
  });

  it.each([[[]], [["first", "second"]]])("opens reminders when both feeds are empty (%j)", async (serviceIds) => {
    fetchRequestList.mockResolvedValue({ items: [] });
    setup(serviceIds);
    expect(await screen.findByText("Список напоминаний")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Напоминания" })).toHaveAttribute("aria-selected", "true");
  });

  it("opens the service feed when a service request fails to load", async () => {
    fetchRequestList.mockRejectedValue(new Error("offline"));
    setup(["first"]);
    expect(await screen.findByText("Лента услуг")).toBeInTheDocument();
    expect(fetchRequestList).not.toHaveBeenCalledWith({ serviceId: null }, expect.anything(), expect.anything());
  });

  it("opens the free feed when its request fails to load", async () => {
    fetchRequestList.mockRejectedValue(new Error("offline"));
    setup([]);
    expect(await screen.findByText("Лента свободных")).toBeInTheDocument();
  });

  it.each(["Напоминания", "Заявки по услугам"])("does not override a manual choice of %s while loading", async (name) => {
    let resolve!: (value: { items: unknown[] }) => void;
    fetchRequestList.mockImplementation(() => new Promise((done) => { resolve = done; }));
    setup([]);
    const tab = screen.getByRole("tab", { name });
    fireEvent.click(tab);
    expect(tab).toHaveAttribute("aria-selected", "true");
    await waitFor(() => expect(resolve).toBeTypeOf("function"));
    await act(async () => resolve({ items: [{ id: "free" }] }));
    await waitFor(() => expect(tab).toHaveAttribute("aria-selected", "true"));
  });
});
