import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AvatarPickerField } from "./AvatarPickerField";
import { convertImageToWebp } from "@/shared/lib/image/convert-to-webp";

vi.mock("@/shared/lib/image/convert-to-webp", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/shared/lib/image/convert-to-webp")>(),
  convertImageToWebp: vi.fn(),
}));

it("shows conversion progress and only provides the converted avatar", async () => {
  let complete!: (file: File) => void;
  vi.mocked(convertImageToWebp).mockReturnValue(new Promise((resolve) => { complete = resolve; }));
  const onChange = vi.fn();
  const onProcessingChange = vi.fn();
  const { container } = render(
    <AvatarPickerField
      label="Аватар исполнителя"
      file={null}
      maxMegabytes={10}
      disabled={false}
      onChange={onChange}
      onProcessingChange={onProcessingChange}
    />,
  );

  await userEvent.upload(container.querySelector('input[type="file"]')!,
    new File(["image"], "avatar.png", { type: "image/png" }));
  expect(screen.getByRole("progressbar")).toBeInTheDocument();
  expect(onChange).not.toHaveBeenCalled();
  expect(onProcessingChange).toHaveBeenCalledWith(true);
  const converted = new File(["webp"], "avatar.webp", { type: "image/webp" });
  await act(async () => complete(converted));
  expect(onChange).toHaveBeenCalledWith(converted);
  expect(onProcessingChange).toHaveBeenLastCalledWith(false);
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
});
