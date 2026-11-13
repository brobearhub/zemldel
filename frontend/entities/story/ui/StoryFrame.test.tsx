import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StoryFrame } from "./StoryFrame";

afterEach(() => {
  vi.unstubAllEnvs();
});

it("notifies story playback when an optimized image loads", async () => {
  vi.stubEnv("NODE_ENV", "production");
  const ready = vi.fn();
  render(<StoryFrame imageUrl="https://cdn.zemledel.ru/public/stories/1/photo.jpg" onImageLoad={ready} />);
  const image = screen.getByRole("presentation");
  expect(image.getAttribute("srcset")).toContain("/_next/image?");

  fireEvent.load(image);
  await waitFor(() => expect(ready).toHaveBeenCalledOnce());
});

it("reports an image failure only after the storage fallback also fails", () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_S3_ENDPOINT", "https://storage.example.com");
  vi.stubEnv("NEXT_PUBLIC_S3_PUBLIC_BUCKET", "assets");
  vi.stubEnv("NEXT_PUBLIC_S3_FORCE_PATH_STYLE", "true");
  const failed = vi.fn();
  render(<StoryFrame imageUrl="https://cdn.zemledel.ru/public/stories/1/photo.jpg" onImageError={failed} />);
  const image = screen.getByRole("presentation");
  fireEvent.error(image);
  expect(failed).not.toHaveBeenCalled();
  expect(image.getAttribute("srcset")).toContain("storage.example.com");
  fireEvent.error(image);
  expect(failed).toHaveBeenCalledOnce();
});

it("makes a video story ready after metadata and pauses it when hidden", () => {
  const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  const ready = vi.fn();
  const { container, unmount } = render(<StoryFrame imageUrl="https://example.com/poster.jpg" videoUrl="https://example.com/video.mp4" onImageLoad={ready} />);
  const video = container.querySelector("video")!;
  expect(video).toHaveAttribute("controls");
  expect(video).toHaveAttribute("playsinline");
  expect(video).toHaveAttribute("poster", "https://example.com/poster.jpg");
  expect(container.querySelector("img")).toBeNull();
  fireEvent.loadedMetadata(video);
  expect(ready).toHaveBeenCalledOnce();
  unmount();
  expect(pause).toHaveBeenCalled();
  pause.mockRestore();
});
