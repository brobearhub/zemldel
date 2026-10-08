export type StoryKeyAction = "previous" | "next" | "dismiss-sent";

export type StoryKeyContext = {
  /** Фокус в поле ввода: пробел и горизонтальные стрелки остаются за текстом, Enter — за отправкой. */
  typing: boolean;
  /** У текущей сторис уже отправлен ответ: Enter сбрасывает галочку. */
  sent: boolean;
  /** Кнопка или ссылка в фокусе: Enter и пробел уже кликают по ней. */
  activatable: boolean;
};

type StoryKeyEvent = {
  key: string;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  isComposing: boolean;
};

/**
 * Клавиши вертикальной ленты.
 * Enter листает вперёд только когда на него не назначено другое действие.
 */
export function storyViewerKeyAction(event: StoryKeyEvent, context: StoryKeyContext): StoryKeyAction | null {
  if (event.altKey || event.metaKey || event.ctrlKey || event.isComposing) return null;

  if (event.key === "ArrowUp") return "previous";
  if (event.key === "ArrowDown") return "next";
  if (event.key === "ArrowLeft") return context.typing ? null : "previous";
  if (event.key === "ArrowRight") return context.typing ? null : "next";

  if (event.key === " " || event.key === "Spacebar") {
    if (context.typing) return null;
    if (event.shiftKey) return "previous";
    if (context.activatable) return null;
    return "next";
  }

  if (event.key === "Enter") {
    if (event.shiftKey) return "previous";
    if (context.typing) return null;
    if (context.sent) return "dismiss-sent";
    if (context.activatable) return null;
    return "next";
  }

  return null;
}
