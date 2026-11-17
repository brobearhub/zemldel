import { afterEach, expect, it, vi } from "vitest";
import { CustomerRequestDeleteConflictError, deleteCustomerRequest } from "./customer-requests";

afterEach(() => vi.unstubAllGlobals());

it("преобразует конфликт удаления в понятную ошибку", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
    JSON.stringify({ statusCode: 409, message: "Request cannot be deleted", error: "Conflict" }),
    { status: 409 },
  )));
  await expect(deleteCustomerRequest("request-1")).rejects.toBeInstanceOf(CustomerRequestDeleteConflictError);
});
