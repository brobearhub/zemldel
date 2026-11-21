import {
  findPermittedUse,
  getPermittedUseTree,
  mergePastedPermittedUses,
  permittedUseAncestors,
  type PermittedUseNode,
} from "./permitted-uses";

function allCodes(nodes: PermittedUseNode[]): string[] {
  return nodes.flatMap((node) => [node.code, ...allCodes(node.children)]);
}

it("places each official code in the tree once, including deeply nested and .0 branches", () => {
  const tree = getPermittedUseTree("");
  expect(tree.roots).toHaveLength(14);
  expect(allCodes(tree.roots)).toHaveLength(172);
  expect(new Set(allCodes(tree.roots)).size).toBe(172);
  expect(tree.expanded).toEqual([]);
  expect(findPermittedUse("5.2.2")?.name).toBe("Отдых и оздоровление детей");
  expect(permittedUseAncestors(["4.9.1.4", "12.0.1", "Свой ВРИ"])).toEqual([
    "4.9.1",
    "4.9",
    "4.0",
    "12.0",
  ]);
});

it("shows only matching codes and the paths needed to reach them", () => {
  const tree = getPermittedUseTree("2.1");
  expect(allCodes(tree.roots)).toEqual(["2.0", "2.1", "2.1.1"]);
  expect(tree.expanded).toEqual(["2.0", "2.1"]);
  expect(allCodes(getPermittedUseTree("ЛПХ").roots)).toEqual([
    "1.0",
    "1.16",
    "2.0",
    "2.2",
  ]);
  for (const query of [
    "ижс",
    "индивидуального строительства",
    "индивидуальное жилищное строительство",
  ]) {
    expect(allCodes(getPermittedUseTree(query).roots)).toEqual(["2.0", "2.1"]);
  }
  expect(allCodes(getPermittedUseTree("Садоводство").roots)).toEqual([
    "1.0",
    "1.5",
    "13.0",
    "13.2",
  ]);
  expect(getPermittedUseTree("по старому акту").roots).toEqual([]);
});

it("keeps old text and individual additions when pasting lines from a document", () => {
  expect(
    mergePastedPermittedUses(
      ["Старый ВРИ", "2.1"],
      [
        "СТАРЫЙ   ВРИ",
        "Для индивидуального жилищного строительства",
        "13.2",
        "ведение садоводства",
        "",
        "  Формулировка из выписки  ",
      ],
    ),
  ).toEqual([
    "Старый ВРИ",
    "2.1",
    "Ведение садоводства",
    "Формулировка из выписки",
  ]);
});
