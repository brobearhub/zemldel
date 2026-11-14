import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RequestAssignee, RequestAssignment } from "./RequestAssignee";

vi.mock("@/core/store/hooks", () => ({
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({
      auth: {
        user: {
          activeProviderId: "p",
          memberships: [{ providerId: "p", role: "MANAGER" }],
        },
      },
    }),
}));
afterEach(() => vi.unstubAllGlobals());

it("сохраняет родительское имя исполнителя и полное имя назначенного сотрудника", () => {
  render(
    <RequestAssignee
      providerName={"ООО «Бурый медведь»"}
      member={{
        id: "m",
        name: "Иван Иванов",
        jobTitle: "Геодезист",
        image: null,
      }}
    />,
  );
  expect(
    screen.getByText("Исполнитель: ООО «Бурый медведь»"),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Сотрудник: Геодезист · Иван Иванов"),
  ).toBeInTheDocument();
});

it("назначает участника команды, не меняя исполнителя заявки", async () => {
  const member = {
    id: "m",
    name: "Иван Иванов",
    jobTitle: "Геодезист",
    image: null,
  };
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          members: [
            {
              ...member,
              role: "EMPLOYEE",
              status: "ACTIVE",
              user: { name: member.name, email: "worker@example.test" },
            },
          ],
        }),
      ),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ assignedMember: member })),
    );
  vi.stubGlobal("fetch", fetchMock);
  const onChange = vi.fn();
  render(
    <RequestAssignment
      requestId="r"
      providerId="p"
      providerName="Компания"
      member={null}
      onChange={onChange}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Назначить сотрудника" }));
  await screen.findByRole("combobox", { name: "Сотрудник" });
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Сотрудник" }));
  fireEvent.click(
    screen.getByRole("option", { name: "Геодезист · Иван Иванов" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
  await waitFor(() => expect(onChange).toHaveBeenCalledWith(member));
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
    memberId: "m",
  });
});
