import { render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { RequestCustomerDto } from "@/entities/request";
import { CustomerRequestDetailClient } from "./CustomerRequestDetailClient";

vi.mock("@/widgets/chat/ui/ChatThreeColumnLayout", () => ({
  ChatThreeColumnLayout: ({ middle }: { middle: React.ReactNode }) => middle,
}));
vi.mock("@/widgets/customer-requests/ui/CustomerRequestConversationWorkspace", () => ({
  CustomerRequestConversationWorkspace: () => null,
}));

afterEach(() => window.history.replaceState(null, "", "/"));

it("removes the creation marker while preserving the rest of the URL", () => {
  window.history.replaceState(null, "", "/profile/requests/1?created=1&conversationId=chat#section");
  render(<CustomerRequestDetailClient initialRequest={{} as RequestCustomerDto} justCreated />);
  expect(window.location.pathname + window.location.search + window.location.hash)
    .toBe("/profile/requests/1?conversationId=chat#section");
});
