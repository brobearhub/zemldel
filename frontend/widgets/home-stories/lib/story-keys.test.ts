import { storyViewerKeyAction, type StoryKeyContext } from "./story-keys";

const idle: StoryKeyContext = { typing: false, sent: false, activatable: false };

function press(key: string, modifiers: Partial<{ shiftKey: boolean; altKey: boolean; metaKey: boolean; ctrlKey: boolean; isComposing: boolean }> = {}) {
  return {
    key,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    ctrlKey: false,
    isComposing: false,
    ...modifiers,
  };
}

describe("storyViewerKeyAction", () => {
  it("листает назад стрелкой вверх, влево, shift+пробел и shift+enter", () => {
    expect(storyViewerKeyAction(press("ArrowUp"), idle)).toBe("previous");
    expect(storyViewerKeyAction(press("ArrowLeft"), idle)).toBe("previous");
    expect(storyViewerKeyAction(press(" ", { shiftKey: true }), idle)).toBe("previous");
    expect(storyViewerKeyAction(press("Enter", { shiftKey: true }), idle)).toBe("previous");
  });

  it("листает вперёд стрелкой вниз, вправо, пробелом и enter", () => {
    expect(storyViewerKeyAction(press("ArrowDown"), idle)).toBe("next");
    expect(storyViewerKeyAction(press("ArrowRight"), idle)).toBe("next");
    expect(storyViewerKeyAction(press(" "), idle)).toBe("next");
    expect(storyViewerKeyAction(press("Enter"), idle)).toBe("next");
  });

  it("enter в поле ввода остаётся за отправкой ответа", () => {
    const typing = { ...idle, typing: true };
    expect(storyViewerKeyAction(press("Enter"), typing)).toBeNull();
    expect(storyViewerKeyAction(press("Enter", { shiftKey: true }), typing)).toBe("previous");
    expect(storyViewerKeyAction(press(" "), typing)).toBeNull();
    expect(storyViewerKeyAction(press("ArrowLeft"), typing)).toBeNull();
    expect(storyViewerKeyAction(press("ArrowRight"), typing)).toBeNull();
    expect(storyViewerKeyAction(press("ArrowUp"), typing)).toBe("previous");
    expect(storyViewerKeyAction(press("ArrowDown"), typing)).toBe("next");
  });

  it("enter после отправки сбрасывает галочку, а не листает дальше", () => {
    const sent = { ...idle, sent: true };
    expect(storyViewerKeyAction(press("Enter"), sent)).toBe("dismiss-sent");
    expect(storyViewerKeyAction(press("Enter", { shiftKey: true }), sent)).toBe("previous");
    expect(storyViewerKeyAction(press(" "), sent)).toBe("next");
  });

  it("enter и пробел на кнопке не перехватывают её клик", () => {
    const button = { ...idle, activatable: true };
    expect(storyViewerKeyAction(press("Enter"), button)).toBeNull();
    expect(storyViewerKeyAction(press(" "), button)).toBeNull();
    expect(storyViewerKeyAction(press("ArrowDown"), button)).toBe("next");
    expect(storyViewerKeyAction(press("Enter", { shiftKey: true }), button)).toBe("previous");
  });

  it("не перехватывает сочетания с модификаторами и набор через IME", () => {
    expect(storyViewerKeyAction(press("ArrowDown", { metaKey: true }), idle)).toBeNull();
    expect(storyViewerKeyAction(press("ArrowDown", { ctrlKey: true }), idle)).toBeNull();
    expect(storyViewerKeyAction(press("ArrowDown", { altKey: true }), idle)).toBeNull();
    expect(storyViewerKeyAction(press("Enter", { isComposing: true }), idle)).toBeNull();
  });
});
