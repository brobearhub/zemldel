import {
  alignScrollerToStory,
  centeredStoryId,
  scrollTopForNeighborSlide,
  scrollTopToCenterSlide,
  storyIdsToPreload,
  storyStepProgress,
  withNeighborFetches,
} from "./story-window";

describe("storyIdsToPreload", () => {
  const ids = ["a", "b", "c"];

  it("берёт кадр сверху и снизу", () => {
    expect(storyIdsToPreload(ids, "b")).toEqual(["a", "c"]);
  });

  it("у первого кадра есть только следующий", () => {
    expect(storyIdsToPreload(ids, "a")).toEqual(["b"]);
  });

  it("у последнего кадра есть только предыдущий", () => {
    expect(storyIdsToPreload(ids, "c")).toEqual(["b"]);
  });

  it("неизвестного id нет в ленте", () => {
    expect(storyIdsToPreload(ids, "missing")).toEqual([]);
  });
});

describe("withNeighborFetches", () => {
  it("добавляет соседей и не трогает набор, если они уже есть", () => {
    const current = new Set(["b"]);
    const next = withNeighborFetches(current, ["a", "b", "c"], "b");
    expect([...next]).toEqual(["b", "a", "c"]);
    expect(withNeighborFetches(next, ["a", "b", "c"], "b")).toBe(next);
  });
});

describe("centeredStoryId", () => {
  function rect(top: number, height: number): DOMRect {
    return {
      top,
      left: 0,
      right: 100,
      bottom: top + height,
      width: 100,
      height,
      x: 0,
      y: top,
      toJSON() {
        return {};
      },
    };
  }

  it("возвращает историю, которая закрывает центр экрана", () => {
    const scroller = document.createElement("div");
    const first = document.createElement("div");
    first.dataset.storyId = "a";
    const second = document.createElement("div");
    second.dataset.storyId = "b";
    scroller.append(first, second);
    Object.defineProperty(scroller, "clientHeight", { configurable: true, get: () => 800 });
    vi.spyOn(scroller, "getBoundingClientRect").mockReturnValue(rect(0, 800));
    vi.spyOn(first, "getBoundingClientRect").mockReturnValue(rect(0, 800));
    vi.spyOn(second, "getBoundingClientRect").mockReturnValue(rect(800, 800));

    expect(centeredStoryId(scroller)).toBe("a");
  });

  it("после перелистывания берёт новую историю в центре, а не выглядывающую соседнюю", () => {
    const scroller = document.createElement("div");
    const first = document.createElement("div");
    first.dataset.storyId = "a";
    const second = document.createElement("div");
    second.dataset.storyId = "b";
    scroller.append(first, second);
    Object.defineProperty(scroller, "clientHeight", { configurable: true, get: () => 800 });
    vi.spyOn(scroller, "getBoundingClientRect").mockReturnValue(rect(0, 800));
    vi.spyOn(first, "getBoundingClientRect").mockReturnValue(rect(-700, 800));
    vi.spyOn(second, "getBoundingClientRect").mockReturnValue(rect(100, 800));

    expect(centeredStoryId(scroller)).toBe("b");
  });

  it("не выбирает историю, пока у ленты нет высоты", () => {
    const scroller = document.createElement("div");
    const slide = document.createElement("div");
    slide.dataset.storyId = "a";
    scroller.append(slide);

    expect(centeredStoryId(scroller)).toBeNull();
  });
});

describe("scrollTopToCenterSlide", () => {
  it("на весь экран совпадает с верхом кадра", () => {
    expect(scrollTopToCenterSlide(800, 800, 800)).toBe(800);
  });

  it("на десктопе оставляет равные края сверху и снизу", () => {
    expect(scrollTopToCenterSlide(820, 820, 892)).toBe(784);
  });
});

describe("scrollTopForNeighborSlide", () => {
  const slides = [
    { top: 36, height: 820 },
    { top: 856, height: 820 },
    { top: 1676, height: 820 },
  ];

  it("центрирует следующую сторис, а не проскакивает через одну", () => {
    expect(scrollTopForNeighborSlide(slides, 0, 1, 892)).toBe(820);
  });

  it("с первой сторис вверх и с последней вниз шага нет", () => {
    expect(scrollTopForNeighborSlide(slides, 0, -1, 892)).toBeNull();
    expect(scrollTopForNeighborSlide(slides, 2, 1, 892)).toBeNull();
  });

  it("на мобилке шаг равен высоте экрана", () => {
    const full = [
      { top: 0, height: 800 },
      { top: 800, height: 800 },
    ];
    expect(scrollTopForNeighborSlide(full, 0, 1, 800)).toBe(800);
  });

  it("с зазором между кадрами сдвигает ровно на одну сторис", () => {
    const card = 820;
    const gap = 28;
    const viewport = 1000;
    const spacer = (viewport - card) / 2;
    const slides = [0, 1, 2].map((index) => ({
      top: spacer + index * (card + gap),
      height: card,
    }));
    const next = scrollTopForNeighborSlide(slides, 0, 1, viewport);
    expect(next).toBe(card + gap);
  });
});

describe("storyStepProgress", () => {
  it("начинается в текущем кадре и заканчивается в следующем", () => {
    expect(storyStepProgress(0)).toBe(0);
    expect(storyStepProgress(1)).toBe(1);
    expect(storyStepProgress(0.5)).toBeGreaterThan(0.5);
  });
});

describe("alignScrollerToStory", () => {
  function rect(top: number, height = 100): DOMRect {
    return {
      top,
      left: 0,
      right: 100,
      bottom: top + height,
      width: 100,
      height,
      x: 0,
      y: top,
      toJSON() {
        return {};
      },
    };
  }

  it("прокручивает контейнер к выбранному кадру", () => {
    const scroller = document.createElement("div");
    const first = document.createElement("div");
    first.dataset.storyId = "a";
    const second = document.createElement("div");
    second.dataset.storyId = "b";
    scroller.append(first, second);
    let scrollTop = 0;
    Object.defineProperty(scroller, "clientHeight", { configurable: true, get: () => 800 });
    Object.defineProperty(scroller, "scrollTop", {
      configurable: true,
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value;
      },
    });
    vi.spyOn(scroller, "getBoundingClientRect").mockReturnValue(rect(0, 800));
    vi.spyOn(second, "getBoundingClientRect").mockReturnValue(rect(1600, 800));

    expect(alignScrollerToStory(scroller, "b")).toBe(true);
    expect(scrollTop).toBe(1600);
    expect(scroller.style.scrollSnapType).toBe("");
  });

  it("ставит короткий кадр в центр, а не к верху окна", () => {
    const scroller = document.createElement("div");
    const slide = document.createElement("div");
    slide.dataset.storyId = "b";
    scroller.append(slide);
    let scrollTop = 0;
    Object.defineProperty(scroller, "clientHeight", { configurable: true, get: () => 892 });
    Object.defineProperty(scroller, "scrollTop", {
      configurable: true,
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value;
      },
    });
    vi.spyOn(scroller, "getBoundingClientRect").mockReturnValue(rect(0, 892));
    vi.spyOn(slide, "getBoundingClientRect").mockReturnValue(rect(820, 820));

    expect(alignScrollerToStory(scroller, "b")).toBe(true);
    expect(scrollTop).toBe(784);
  });

  it("ждёт раскладку, если у контейнера ещё нет высоты", () => {
    const scroller = document.createElement("div");
    const slide = document.createElement("div");
    slide.dataset.storyId = "b";
    scroller.append(slide);

    expect(alignScrollerToStory(scroller, "b")).toBe(false);
    expect(scroller.scrollTop).toBe(0);
  });
});
