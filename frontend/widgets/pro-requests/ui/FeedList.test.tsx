import { ListItem, ListItemText } from "@mui/material";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeedList } from "./FeedList";

describe("FeedList", () => {
  it("не рисует placeholder-строки, когда список пуст", () => {
    const { container } = render(
      <FeedList
        items={[] as string[]}
        minRows={4}
        getKey={(item) => item}
        renderRow={() => (
          <ListItem disablePadding>
            <ListItemText primary="row" />
          </ListItem>
        )}
      />
    );

    expect(container.querySelectorAll("li").length).toBe(0);
  });

  it("сохраняет placeholder-строки, когда данные уже есть", () => {
    const { container } = render(
      <FeedList
        items={["first"]}
        minRows={3}
        getKey={(item) => item}
        renderRow={(item, { isLast }) => (
          <ListItem disablePadding sx={{ borderBottom: isLast ? "none" : "1px solid" }}>
            <ListItemText primary={item} />
          </ListItem>
        )}
      />
    );

    expect(container.querySelectorAll("li").length).toBe(3);
  });
});
