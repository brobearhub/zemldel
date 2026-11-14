import { render, screen, within } from "@testing-library/react";
import { ProviderWorkPlaces } from "./ProviderWorkPlaces";
import type { ServicePlace } from "@/entities/service/lib/service-places";

const city: ServicePlace = {
  kind: "city",
  cityId: "ekb",
  name: "Екатеринбург",
  regionCode: "66",
  regionName: "Свердловская область",
};
const region: ServicePlace = {
  kind: "region",
  name: "Свердловская область",
  regionCode: "66",
  regionName: "Свердловская область",
};
const nationwide: ServicePlace = {
  kind: "region",
  name: "Вся Россия",
  regionCode: "RU",
  regionName: "Вся Россия",
};

it("keeps local and nationwide geography attached to their own services", () => {
  render(
    <ProviderWorkPlaces
      services={[
        { id: "local", title: "Межевание", places: [city] },
        { id: "national", title: "Консультация", places: [nationwide] },
      ]}
    />,
  );
  const section = screen.getByRole("region", { name: "География работы" });
  const rows = within(section).getAllByRole("definition");
  expect(rows).toHaveLength(2);
  expect(rows[0]).toHaveTextContent(/^Екатеринбург$/);
  expect(rows[0]).not.toHaveTextContent("Вся Россия");
  expect(rows[1]).toHaveTextContent("Вся Россия");
  expect(rows[1]).not.toHaveTextContent("Екатеринбург");
  expect(
    within(section).getByRole("link", { name: "Межевание" }),
  ).toHaveAttribute("href", "/services/local");
  expect(
    within(section).getByRole("link", { name: "Консультация" }),
  ).toHaveAttribute("href", "/services/national");
});

it("removes covered cities only inside the same service and links to editing in the cabinet", () => {
  render(
    <ProviderWorkPlaces
      services={[
        {
          id: "regional",
          title: "Оформление документов",
          places: [city, region, region],
        },
        { id: "local", title: "Межевание", places: [city] },
      ]}
      editableProfile
    />,
  );
  const rows = screen.getAllByRole("definition");
  expect(rows[0]).toHaveTextContent("Свердловская область");
  expect(rows[0]).not.toHaveTextContent("Екатеринбург");
  expect(rows[1]).toHaveTextContent("Екатеринбург");
  expect(
    screen.getByRole("link", { name: "Оформление документов" }),
  ).toHaveAttribute("href", "/pro/services/regional/edit");
});

it("does not invent geography for a legacy service without places", () => {
  render(
    <ProviderWorkPlaces
      services={[{ id: "legacy", title: "Услуга", places: [] }]}
    />,
  );
  expect(screen.getByText("География не указана")).toBeInTheDocument();
  expect(screen.queryByText(/Екатеринбург/)).not.toBeInTheDocument();
});

it("hides an empty public block and explains how to fill it in the provider profile", () => {
  const view = render(<ProviderWorkPlaces services={[]} />);
  expect(screen.queryByRole("region")).not.toBeInTheDocument();
  view.rerender(<ProviderWorkPlaces services={[]} editableProfile />);
  expect(
    screen.getByText(
      "Укажите города и регионы при публикации услуги — они появятся здесь.",
    ),
  ).toBeInTheDocument();
});
