import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  ProviderTeamManagement,
  type ProviderMembersResponse,
} from "./ProviderTeamManagement";
import { ProviderTeam } from "./ProviderTeam";

const data: ProviderMembersResponse = {
  id: "p",
  name: "ООО Бурый медведь",
  slug: "bear",
  type: "COMPANY",
  members: [
    {
      id: "m",
      role: "OWNER",
      status: "ACTIVE",
      jobTitle: "Руководитель",
      user: {
        id: "u",
        name: "Павел Усов",
        email: "owner@example.test",
        image: null,
      },
    },
  ],
  teamInvitations: [],
};
afterEach(() => vi.unstubAllGlobals());

it("приглашает сотрудника с произвольной должностью и минимальным доступом", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ id: "i" })))
    .mockResolvedValueOnce(new Response(JSON.stringify(data)));
  vi.stubGlobal("fetch", fetchMock);
  render(
    <ProviderTeamManagement
      providerId="p"
      isOwner
      data={data}
      onChange={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText(/Email сотрудника/), {
    target: { value: "worker@example.test" },
  });
  fireEvent.change(screen.getByRole("combobox", { name: /Должность/ }), {
    target: { value: "Специалист по межеванию" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Отправить приглашение" }),
  );
  await screen.findByText(/Приглашение отправлено на worker@example.test/);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
    email: "worker@example.test",
    jobTitle: "Специалист по межеванию",
    role: "EMPLOYEE",
  });
  expect(screen.queryByText("Сотрудник добавлен")).not.toBeInTheDocument();
});

it("отправляет выбранную роль менеджера и показывает русскую ошибку сети", async () => {
  const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
  vi.stubGlobal("fetch", fetchMock);
  render(
    <ProviderTeamManagement
      providerId="p"
      isOwner
      data={data}
      onChange={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText(/Email сотрудника/), {
    target: { value: "manager@example.test" },
  });
  fireEvent.change(screen.getByRole("combobox", { name: /Должность/ }), {
    target: { value: "Руководитель проектов" },
  });
  fireEvent.mouseDown(screen.getByRole("combobox", { name: /Роль доступа/ }));
  fireEvent.click(screen.getByRole("option", { name: "Менеджер" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Отправить приглашение" }),
  );
  await screen.findByText(
    "Не удалось связаться с сервером. Попробуйте ещё раз.",
  );
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).role).toBe("MANAGER");
  expect(screen.queryByText("Failed to fetch")).not.toBeInTheDocument();
});

it("не предлагает менеджеру приглашения и показывает команду в публичном блоке", async () => {
  const { unmount } = render(
    <ProviderTeamManagement
      providerId="p"
      isOwner={false}
      data={data}
      onChange={vi.fn()}
    />,
  );
  expect(screen.queryByText("Пригласить сотрудника")).not.toBeInTheDocument();
  unmount();
  render(
    <ProviderTeam
      members={[
        { id: "1", name: "Иван Иванов", jobTitle: "Геодезист", image: null },
        { id: "2", name: "Анна Петрова", jobTitle: "Юрист", image: null },
      ]}
    />,
  );
  await waitFor(() =>
    expect(screen.getByText("Геодезист")).toBeInTheDocument(),
  );
  expect(screen.getByText("Анна Петрова")).toBeInTheDocument();
});
