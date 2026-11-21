import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { RegistrationEmailForm } from "./RegistrationEmailForm";
import {
  clearRegistrationProgress,
  readRegistrationProgress,
  type RegistrationProgress,
} from "./registration-progress";

const email = "client@example.test";
const verifiedPassword = vi.fn();

function Flow({ mode = "signup" }: { mode?: "signup" | "signin" }) {
  const [progress, setProgress] = useState<RegistrationProgress | null>(null);
  if (progress?.stage === "verified") return <p>Подтверждено</p>;
  return (
    <RegistrationEmailForm
      mode={mode}
      initialEmail=""
      accountKind={mode === "signup" ? "CUSTOMER" : null}
      notice={null}
      challenge={progress}
      onChange={setProgress}
      onPasswordRequired={verifiedPassword}
    />
  );
}

afterEach(() => {
  clearRegistrationProgress();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.useRealTimers();
});

it("сначала запрашивает только email, сохраняет ноль в начале кода и пропускает к регистрации после проверки", async () => {
  const resendAt = new Date(Date.now() + 60_000).toISOString();
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(Response.json({ status: "verification_required", accountKind: "CUSTOMER", resendAt }))
    .mockResolvedValueOnce(Response.json({ status: "registration_required", accountKind: "CUSTOMER", email }));
  vi.stubGlobal("fetch", fetchMock);
  render(<Flow />);
  expect(screen.getAllByRole("textbox")).toHaveLength(1);
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email.toUpperCase() } });
  fireEvent.click(screen.getByRole("button", { name: "Получить код" }));
  const field = await screen.findByLabelText("Код из письма");
  expect(screen.getByRole("button", { name: /Отправить новый код через/ })).toBeDisabled();
  expect(readRegistrationProgress()).toEqual({ stage: "code", accountKind: "CUSTOMER", email, resendAt });
  fireEvent.change(field, { target: { value: "0123" } });
  fireEvent.click(screen.getByRole("button", { name: "Подтвердить email" }));
  await screen.findByText("Подтверждено");
  expect(fetchMock.mock.calls.map(([path]) => path)).toEqual(["/api/auth/signup/start", "/api/auth/signup/verify"]);
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ email, code: "0123" });
  expect(readRegistrationProgress()).toEqual({ stage: "verified", accountKind: "CUSTOMER", email });
});

it("включает повторную отправку через минуту и использует тот же адрес при повторе", async () => {
  vi.useFakeTimers();
  const resendAt = new Date(Date.now() + 60_000).toISOString();
  const challenge = { stage: "code" as const, email, accountKind: null, resendAt };
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ status: "verification_required", resendAt }));
  vi.stubGlobal("fetch", fetchMock);
  render(<RegistrationEmailForm accountKind={null} initialEmail="" notice={null} challenge={challenge} onChange={vi.fn()} onPasswordRequired={verifiedPassword} />);
  act(() => vi.advanceTimersByTime(59_000));
  expect(screen.getByRole("button", { name: "Отправить новый код через 1 с" })).toBeDisabled();
  act(() => vi.advanceTimersByTime(1_000));
  const resend = screen.getByRole("button", { name: "Отправить новый код" });
  expect(resend).toBeEnabled();
  await act(async () => { fireEvent.click(resend); });
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email });
});

it("при входе подтверждает старый аккаунт и передаёт email в форму пароля", async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(Response.json({ status: "verification_required", resendAt: new Date(Date.now() + 60_000).toISOString() }))
    .mockResolvedValueOnce(Response.json({ status: "password_required", email }));
  vi.stubGlobal("fetch", fetchMock);
  render(<Flow mode="signin" />);
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.click(screen.getByRole("button", { name: "Продолжить" }));
  const input = await screen.findByLabelText("Код из письма");
  fireEvent.change(input, { target: { value: "1234" } });
  fireEvent.click(screen.getByRole("button", { name: "Подтвердить email" }));
  await waitFor(() => expect(verifiedPassword).toHaveBeenCalledWith(email));
  expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/signin/email");
  expect(readRegistrationProgress()).toBeNull();
});

it("при возобновлении с использованным кодом позволяет ввести только новый код", async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(Response.json({
      status: "verification_required", codeUnavailable: true, resendAt: new Date(Date.now() - 1000).toISOString(),
    }))
    .mockResolvedValueOnce(Response.json({
      status: "verification_required", resendAt: new Date(Date.now() + 60_000).toISOString(),
    }));
  vi.stubGlobal("fetch", fetchMock);
  render(<Flow />);
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.click(screen.getByRole("button", { name: "Получить код" }));
  const input = await screen.findByLabelText("Код из письма");
  expect(input).toBeDisabled();
  expect(screen.getByRole("button", { name: "Подтвердить email" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Отправить новый код" }));
  await waitFor(() => expect(input).toBeEnabled());
  expect(readRegistrationProgress()).toMatchObject({ stage: "code", email });
  expect(readRegistrationProgress()).not.toMatchObject({ codeUnavailable: true });
});

it("отправляет фактические значения полей при автозаполнении без событий изменения", async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(Response.json({ status: "verification_required", resendAt: new Date(Date.now() + 60000).toISOString() }))
    .mockResolvedValueOnce(Response.json({ status: "registration_required", email }));
  vi.stubGlobal("fetch", fetchMock);
  render(<Flow mode="signin" />);
  const emailField = screen.getByLabelText<HTMLInputElement>("Email");
  emailField.value = email;
  fireEvent.submit(emailField.form!);
  const code = await screen.findByLabelText<HTMLInputElement>("Код из письма");
  code.value = "0042";
  fireEvent.submit(code.form!);
  await screen.findByText("Подтверждено");
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email });
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ email, code: "0042" });
});
