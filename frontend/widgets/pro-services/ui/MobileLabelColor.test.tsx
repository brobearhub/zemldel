import { useState } from "react";
import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createAppTheme } from "@/core/theme/createAppTheme";
import { LABEL_COLORS } from "./label-colors";
import { MobileLabelColor } from "./MobileLabelColor";

function Harness() {
  const [badge, setBadge] = useState("");
  const [color, setColor] = useState<(typeof LABEL_COLORS)[number] | "">("primary");
  return (
    <ThemeProvider theme={createAppTheme("light")}>
      <MobileLabelColor
        badge={badge}
        onBadgeChange={setBadge}
        color={color}
        onColorChange={setColor}
        disabled={false}
      />
    </ThemeProvider>
  );
}

describe("MobileLabelColor", () => {
  it("показывает все цвета под полем без меню и без выделения", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByRole("combobox", { name: "Метка" })).toBeVisible();
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.queryByRole("button", { name: "Цвет метки" })).toBeNull();

    const colors = screen.getAllByRole("button");
    expect(colors).toHaveLength(LABEL_COLORS.length);
    const row = screen.getByRole("group", { name: "Цвет метки" });
    expect(getComputedStyle(row).justifyContent).toBe("flex-start");

    for (const button of colors) {
      expect(button).toHaveStyle({ borderColor: "transparent" });
    }

    await user.click(screen.getByRole("button", { name: "warning" }));
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("button", { name: "warning" })).toHaveStyle({ borderColor: "transparent" });
  });
});
