import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { CdnOptimizedAvatar } from "./CdnOptimizedAvatar";

const source = "https://cdn.zemledel.ru/public/users/1/avatar.jpg";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("optimizes the avatar without a second MUI image preload and keeps its ref", () => {
  const imageConstructor = vi.spyOn(window, "Image");
  const ref = createRef<HTMLDivElement>();
  render(<CdnOptimizedAvatar src={source} sizes="40px" ref={ref}>ПУ</CdnOptimizedAvatar>);

  const image = screen.getByRole("presentation");
  expect(image.getAttribute("srcset")).toContain("/_next/image?");
  expect(image).toHaveAttribute("sizes", "40px");
  expect(ref.current).toContainElement(image);
  expect(imageConstructor).not.toHaveBeenCalled();
});

it("uses the optimized storage fallback and then shows initials", () => {
  vi.stubEnv("NEXT_PUBLIC_S3_ENDPOINT", "https://storage.example.com");
  vi.stubEnv("NEXT_PUBLIC_S3_PUBLIC_BUCKET", "assets");
  vi.stubEnv("NEXT_PUBLIC_S3_FORCE_PATH_STYLE", "true");
  render(<CdnOptimizedAvatar src={source} sizes="40px">ПУ</CdnOptimizedAvatar>);

  const image = screen.getByRole("presentation");
  fireEvent.error(image);
  expect(image.getAttribute("srcset")).toContain("storage.example.com");
  expect(image.getAttribute("srcset")).toContain("/_next/image?");
  fireEvent.error(image);
  expect(screen.getByText("ПУ")).toBeInTheDocument();
});

it("shows the default avatar placeholder when no image or initials are provided", () => {
  const { container } = render(<CdnOptimizedAvatar sizes="40px" />);
  expect(container.querySelector(".MuiAvatar-fallback")).toBeInTheDocument();
});
