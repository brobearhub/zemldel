import { fireEvent, render } from "@testing-library/react";
import { StoryFrame } from "./StoryFrame";

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
