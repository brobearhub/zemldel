import { SERVICE_CATEGORIES_SEED } from "../../../../backend/scripts/seed-data/service-categories";
import { getCategoryGuide } from "./category-guides";
import { categorySituations, getCategoryHubNavigation, hubReading, relatedGuideSlugs, type HubCategory } from "./category-hubs";

const categories: HubCategory[] = SERVICE_CATEGORIES_SEED.flatMap((root, rootIndex) => [
  { ...root, id: root.slug, parentId: null, sortOrder: rootIndex },
  ...(root.children ?? []).map((child, index) => ({
    ...child,
    id: child.slug,
    parentId: root.slug,
    sortOrder: index,
  })),
]);

it("connects every root hub to all its services in catalogue order", () => {
  for (const root of categories.filter((item) => item.parentId == null)) {
    const navigation = getCategoryHubNavigation(root, categories);
    const children = categories.filter((item) => item.parentId === root.id);
    expect(navigation.situations.map((item) => item.category.id)).toEqual(children.map((item) => item.id));
    for (const child of children) expect(categorySituations[child.slug], child.slug).toBeTruthy();
    expect(navigation.reading.length, root.slug).toBeGreaterThan(0);
  }
});

it("keeps curated reading links on existing guides and real section anchors", () => {
  for (const references of Object.values(hubReading)) {
    for (const reference of references) {
      expect(categories.some((category) => category.slug === reference.slug)).toBe(true);
      const guide = getCategoryGuide(reference.slug);
      expect(guide).toBeDefined();
      if (reference.anchor.startsWith("guide-section-")) {
        const index = Number(reference.anchor.replace("guide-section-", "")) - 1;
        expect(guide!.sections[index]).toBeDefined();
      } else if (reference.anchor === "guide-preparation") {
        expect(guide!.preparation.length).toBeGreaterThan(0);
      } else {
        expect(guide!.question.title).toBeTruthy();
      }
    }
  }
  for (const category of categories.filter((item) => item.parentId != null)) {
    const navigation = getCategoryHubNavigation(category, categories);
    expect(navigation.parent?.id).toBe(category.parentId);
    expect(navigation.parentSituation).toContain("Не знаю, какую услугу выбрать");
    expect(navigation.reading.length).toBe(relatedGuideSlugs[category.slug].length);
    expect(navigation.reading.every((item) => item.category.id !== category.id)).toBe(true);
    expect(navigation.reading.every((item) => item.title === categorySituations[item.category.slug])).toBe(true);
    expect(new Set(navigation.reading.map((item) => item.category.id)).size).toBe(navigation.reading.length);
  }
});

it("omits unavailable destinations and supports newly added catalogue services", () => {
  const root = categories[0];
  const newChild = { id: "new-id", slug: "new-service", name: "Новая услуга", parentId: root.id, sortOrder: 100 };
  const navigation = getCategoryHubNavigation(root, [root, newChild]);
  expect(navigation.situations).toEqual([{ category: newChild, situation: "Новая услуга" }]);
  expect(navigation.reading).toEqual([]);
  const unknownRoot = { ...root, slug: "constructor" };
  expect(getCategoryHubNavigation(unknownRoot, [unknownRoot]).reading).toEqual([]);
});
