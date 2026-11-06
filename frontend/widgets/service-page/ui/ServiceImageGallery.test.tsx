import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ServiceImageGallery } from "./ServiceImageGallery";

vi.mock("@/shared/ui/cdn-image", () => ({
  CdnFillImage: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

it("shows all ten photos with previous/next navigation and wraps around", async () => {
  const images = Array.from({ length: 10 }, (_, index) => `/photo-${index}.png`);
  render(<ServiceImageGallery images={images} title="Услуга" />);
  expect(screen.getByAltText("Услуга — фото 1")).toHaveAttribute("src", images[0]);
  await userEvent.click(screen.getByRole("button", { name: "Предыдущее фото услуги" }));
  expect(screen.getByAltText("Услуга — фото 10")).toHaveAttribute("src", images[9]);
  expect(screen.getByText("10 / 10")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Следующее фото услуги" }));
  expect(screen.getByAltText("Услуга — фото 1")).toHaveAttribute("src", images[0]);
});
