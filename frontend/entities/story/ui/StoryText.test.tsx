import { render, screen } from "@testing-library/react";
import { StoryText } from "./StoryText";

describe("story formatting", () => {
  it("Standard preserves plain text and Lite renders emphasis without links", () => {
    const { container, rerender } = render(
      <StoryText text="**Важно** [сайт](https://example.com)" />,
    );
    expect(container.querySelector("strong")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
    rerender(
      <StoryText
        text="**Важно** *сегодня* [сайт](https://example.com)"
        format="BASIC"
      />,
    );
    expect(container.querySelector("strong")).toHaveTextContent("Важно");
    expect(container.querySelector("em")).toHaveTextContent("сегодня");
    expect(container.querySelector("a")).toBeNull();
  });
  it("Business allows web links and rejects executable URLs, HTML and media", () => {
    const { container } = render(
      <StoryText
        format="LINKS"
        text={
          "[сайт](https://example.com) [опасно](javascript:alert%281%29) ![картинка](https://example.com/a.png) <script>alert(1)</script>"
        }
      />,
    );
    expect(screen.getByRole("link", { name: "сайт" })).toHaveAttribute(
      "href",
      "https://example.com",
    );
    expect(
      screen.queryByRole("link", { name: "опасно" }),
    ).not.toBeInTheDocument();
    expect(container.querySelector("img,script")).toBeNull();
  });
});
