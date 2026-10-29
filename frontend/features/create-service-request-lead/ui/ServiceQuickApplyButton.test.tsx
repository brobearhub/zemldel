import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceQuickApplyButton } from "./ServiceQuickApplyButton";

const router = {
  push: vi.fn(),
};

const requestDraft = {
  savePendingRequestDraft: vi.fn(),
  buildRequestAuthHref: vi.fn(() => "/signup?kind=SERVICE"),
};

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("@/entities/request", () => ({
  savePendingRequestDraft: (...args: unknown[]) => requestDraft.savePendingRequestDraft(...args),
  buildRequestAuthHref: (...args: unknown[]) => requestDraft.buildRequestAuthHref(...args),
}));

describe("ServiceQuickApplyButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("для авторизованного пользователя скроллит к форме заявки", () => {
    const section = document.createElement("div");
    section.id = "consultation";
    section.scrollIntoView = vi.fn();
    document.body.appendChild(section);

    render(<ServiceQuickApplyButton serviceId="s1" isAuthenticated />);

    fireEvent.click(screen.getByRole("button", { name: "Оставить заявку" }));

    expect(section.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
    expect(router.push).not.toHaveBeenCalled();
  });

  it("для гостя сохраняет draft и ведёт на signup", () => {
    render(<ServiceQuickApplyButton serviceId="s1" isAuthenticated={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Оставить заявку" }));

    expect(requestDraft.savePendingRequestDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "SERVICE",
        serviceId: "s1",
      })
    );
    expect(requestDraft.buildRequestAuthHref).toHaveBeenCalledWith("signup", {
      kind: "SERVICE",
      serviceId: "s1",
    });
    expect(router.push).toHaveBeenCalledWith("/signup?kind=SERVICE");
  });
});
