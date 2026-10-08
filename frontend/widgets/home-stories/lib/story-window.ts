/** Соседи по вертикальной ленте: предыдущий кадр и следующий. */
export function storyIdsToPreload(ids: readonly string[], loadedId: string): string[] {
  const index = ids.indexOf(loadedId);
  if (index < 0) return [];
  const neighbors: string[] = [];
  if (index > 0) {
    const above = ids[index - 1];
    if (above) neighbors.push(above);
  }
  if (index < ids.length - 1) {
    const below = ids[index + 1];
    if (below) neighbors.push(below);
  }
  return neighbors;
}

/** Расширяет окно загрузки на один шаг вверх и вниз. Та же ссылка, если набор не изменился. */
export function withNeighborFetches(
  current: ReadonlySet<string>,
  ids: readonly string[],
  loadedId: string,
): ReadonlySet<string> {
  const neighbors = storyIdsToPreload(ids, loadedId);
  if (neighbors.every((id) => current.has(id))) return current;
  const next = new Set(current);
  for (const id of neighbors) next.add(id);
  return next;
}

/**
 * История, чья рамка содержит вертикальный центр видимой области скроллера.
 * Соседние кадры, которые только выглядывают сверху или снизу, не считаются.
 * null — высоты ещё нет или центр попал в зазор.
 */
export function centeredStoryId(scroller: HTMLElement): string | null {
  if (scroller.clientHeight === 0) return null;
  const center = scroller.getBoundingClientRect().top + scroller.clientHeight / 2;
  const slides = scroller.querySelectorAll<HTMLElement>("[data-story-id]");
  for (const slide of slides) {
    const box = slide.getBoundingClientRect();
    if (box.top <= center && box.bottom > center) return slide.dataset.storyId ?? null;
  }
  return null;
}

/** Позиция прокрутки, при которой кадр стоит в центре окна. На весь экран совпадает с верхом кадра. */
export function scrollTopToCenterSlide(slideTop: number, slideHeight: number, viewportHeight: number): number {
  return slideTop - (viewportHeight - slideHeight) / 2;
}

/** Доля пути 0..1 с мягким торможением в конце, чтобы шаг не обрывался. */
export function storyStepProgress(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - (1 - clamped) ** 3;
}

/**
 * Куда прокрутить, чтобы соседний кадр встал в центр.
 * null — индекса нет, направление упирается в край или высоты ещё нет.
 */
export function scrollTopForNeighborSlide(
  slides: readonly { top: number; height: number }[],
  currentIndex: number,
  direction: 1 | -1,
  viewportHeight: number,
): number | null {
  if (viewportHeight <= 0 || currentIndex < 0) return null;
  const next = slides[currentIndex + direction];
  if (!next || next.height <= 0) return null;
  return scrollTopToCenterSlide(next.top, next.height, viewportHeight);
}

/**
 * Ставит вертикальный скроллер так, чтобы кадр оказался в центре.
 * Snap на время присваивания выключается: иначе браузер при открытии модалки
 * возвращает ленту на первый слайд.
 * false — кадр ещё не в дереве или контейнер без высоты, вызов можно повторить.
 */
export function alignScrollerToStory(scroller: HTMLElement, storyId: string): boolean {
  const target = scroller.querySelector<HTMLElement>(`[data-story-id="${CSS.escape(storyId)}"]`);
  if (!target || scroller.clientHeight === 0) return false;
  const box = target.getBoundingClientRect();
  if (box.height === 0) return false;
  const slideTop = box.top - scroller.getBoundingClientRect().top + scroller.scrollTop;
  const top = scrollTopToCenterSlide(slideTop, box.height, scroller.clientHeight);
  if (Math.abs(scroller.scrollTop - top) < 1) return true;
  const snap = scroller.style.scrollSnapType;
  scroller.style.scrollSnapType = "none";
  scroller.scrollTop = top;
  scroller.style.scrollSnapType = snap;
  return Math.abs(scroller.scrollTop - top) < 1;
}
