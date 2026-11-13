import { fireEvent, render, screen } from "@testing-library/react";
import { ProfileAvatar } from "./ProfileAvatar";

const cdnSrc = "https://cdn.zemledel.ru/public/users/1/avatar.jpg";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("renders one optimized avatar without MUI's separate image preload", () => {
  const imageConstructor = vi.spyOn(window, "Image");
  const { rerender } = render(
    <ProfileAvatar src={cdnSrc} sizes="32px">ПУ</ProfileAvatar>,
  );

  const image = screen.getByRole("presentation");
  expect(image).toHaveAttribute("sizes", "32px");
  expect(image.getAttribute("srcset")).toContain("/_next/image?");
  expect(imageConstructor).not.toHaveBeenCalled();

  rerender(<ProfileAvatar src={cdnSrc} sizes="32px">ПУ</ProfileAvatar>);
  expect(screen.getAllByRole("presentation")).toHaveLength(1);
  expect(imageConstructor).not.toHaveBeenCalled();
});

it("falls back to storage and then initials if both image sources fail", () => {
  vi.stubEnv("NEXT_PUBLIC_S3_ENDPOINT", "https://storage.example.com");
  vi.stubEnv("NEXT_PUBLIC_S3_PUBLIC_BUCKET", "assets");
  vi.stubEnv("NEXT_PUBLIC_S3_FORCE_PATH_STYLE", "true");

  render(<ProfileAvatar src={cdnSrc} sizes="32px">ПУ</ProfileAvatar>);
  fireEvent.error(screen.getByRole("presentation"));

  expect(screen.getByRole("presentation").getAttribute("srcset"))
    .toContain("storage.example.com");
  expect(screen.getByRole("presentation").getAttribute("srcset"))
    .toContain("/_next/image?");
  fireEvent.error(screen.getByRole("presentation"));
  expect(screen.queryByRole("presentation")).not.toBeInTheDocument();
  expect(screen.getByText("ПУ")).toBeInTheDocument();
});

it("tries a new image after the previous source failed", () => {
  const { rerender } = render(<ProfileAvatar src={cdnSrc} sizes="32px">ПУ</ProfileAvatar>);
  fireEvent.error(screen.getByRole("presentation"));
  expect(screen.getByText("ПУ")).toBeInTheDocument();

  rerender(<ProfileAvatar src={`${cdnSrc}?v=2`} sizes="32px">ПУ</ProfileAvatar>);
  expect(screen.getByRole("presentation").getAttribute("src")).toContain("_next/image?");
});

it("does not reuse the old storage fallback when the avatar changes", () => {
  vi.stubEnv("NEXT_PUBLIC_S3_ENDPOINT", "https://storage.example.com");
  vi.stubEnv("NEXT_PUBLIC_S3_PUBLIC_BUCKET", "assets");
  vi.stubEnv("NEXT_PUBLIC_S3_FORCE_PATH_STYLE", "true");

  const { rerender } = render(<ProfileAvatar src={cdnSrc} sizes="32px">ПУ</ProfileAvatar>);
  fireEvent.error(screen.getByRole("presentation"));
  expect(screen.getByRole("presentation").getAttribute("srcset")).toContain("storage.example.com");

  rerender(<ProfileAvatar src={`${cdnSrc}?v=2`} sizes="32px">ПУ</ProfileAvatar>);
  const image = screen.getByRole("presentation");
  expect(image.getAttribute("src")).toContain("_next/image?");
  expect(image.getAttribute("srcset")).toContain("%3Fv%3D2");
});
