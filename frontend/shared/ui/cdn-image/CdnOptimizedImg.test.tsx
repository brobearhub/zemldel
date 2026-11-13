import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { CdnOptimizedImg } from "./CdnOptimizedImg";

afterEach(() => vi.unstubAllEnvs());

it("keeps the chat image ref and switches to optimized storage on failure", () => {
  vi.stubEnv("NEXT_PUBLIC_S3_ENDPOINT", "https://storage.example.com");
  vi.stubEnv("NEXT_PUBLIC_S3_PUBLIC_BUCKET", "assets");
  vi.stubEnv("NEXT_PUBLIC_S3_FORCE_PATH_STYLE", "true");
  const ref = createRef<HTMLImageElement>();
  const failed = vi.fn();
  render(
    <CdnOptimizedImg
      ref={ref}
      src="https://cdn.zemledel.ru/public/users/1/avatar.jpg"
      alt="Аватар"
      onError={failed}
    />,
  );

  const image = screen.getByRole("img", { name: "Аватар" });
  expect(ref.current).toBe(image);
  expect(image.getAttribute("srcset")).toContain("/_next/image?");
  fireEvent.error(image);
  expect(image.getAttribute("srcset")).toContain("storage.example.com");
  expect(failed).not.toHaveBeenCalled();
  fireEvent.error(image);
  expect(failed).toHaveBeenCalledOnce();
});
