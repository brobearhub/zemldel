import { SERVICE_CATEGORIES_SEED } from "../../../../backend/scripts/seed-data/service-categories";
import { getCategoryGuide } from "./category-guides";

it("covers every published category type with a distinct editorial guide", () => {
  const categories = SERVICE_CATEGORIES_SEED.flatMap((item) => [item, ...(item.children ?? [])]);
  const intros = new Set<string>();
  for (const category of categories) {
    const guide = getCategoryGuide(category.slug);
    expect(guide, category.slug).toBeDefined();
    expect(guide!.sections.length).toBeGreaterThan(0);
    expect(guide!.preparation.length).toBeGreaterThan(0);
    intros.add(guide!.intro);
  }
  expect(intros.size).toBe(categories.length);
  expect(getCategoryGuide("unknown-category")).toBeUndefined();
  expect(getCategoryGuide("constructor")).toBeUndefined();
});
