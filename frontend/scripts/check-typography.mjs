import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
// These routes deliberately keep their pre-migration typography and glass form.
const preservedAuthFiles = new Set([
  "app/(site)/signin/page.tsx",
  "app/(site)/signup/page.tsx",
  "core/theme/legacyAuthTheme.ts",
  "shared/ui/LegacyAuthPaper.tsx",
]);
let checked = 0;
function check(value, file, line) {
  const match = String(value).match(/^([\d.]+)(px|rem|em)?$/);
  if (!match) return;
  const px = Number(match[1]) * (["rem", "em"].includes(match[2]) ? 16 : 1);
  checked++;
  if (px > 0 && px < 16)
    failures.push(`${path.relative(root, file)}:${line}: ${value}`);
}
function inspect(file) {
  if (preservedAuthFiles.has(path.relative(root, file))) return;
  const source = fs.readFileSync(file, "utf8");
  if (file.endsWith(".css")) {
    for (const match of source.matchAll(
      /font-size:\s*([\d.]+(?:px|rem|em))\b/g,
    )) {
      check(match[1], file, source.slice(0, match.index).split("\n").length);
    }
    return;
  }
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const icons = new Set(["SvgIcon"]);
  for (const node of tree.statements) {
    if (
      !ts.isImportDeclaration(node) ||
      !node.moduleSpecifier.text.startsWith("@mui/icons-material")
    )
      continue;
    const clause = node.importClause;
    if (clause?.name) icons.add(clause.name.text);
    if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      for (const item of clause.namedBindings.elements)
        icons.add(item.name.text);
    }
  }
  function isIcon(node) {
    for (let ancestor = node.parent; ancestor; ancestor = ancestor.parent) {
      if (
        ts.isPropertyAssignment(ancestor) &&
        /SvgIcon|\bsvg\b|iconSx/i.test(ancestor.name.getText(tree))
      )
        return true;
      if (
        ts.isVariableDeclaration(ancestor) &&
        /iconSx/i.test(ancestor.name.getText(tree))
      )
        return true;
      if (
        ts.isJsxOpeningElement(ancestor) ||
        ts.isJsxSelfClosingElement(ancestor)
      ) {
        const tag = ancestor.tagName.getText(tree);
        return (
          icons.has(tag) ||
          /(?:Icon|\.Icon)$/.test(tag) ||
          ["svg", "path"].includes(tag)
        );
      }
    }
    return false;
  }
  function inspectSize(node) {
    if (ts.isNumericLiteral(node) || ts.isStringLiteral(node)) {
      check(
        node.text,
        file,
        tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1,
      );
    } else if (ts.isObjectLiteralExpression(node)) {
      for (const property of node.properties)
        if (ts.isPropertyAssignment(property))
          inspectSize(property.initializer);
    } else if (ts.isConditionalExpression(node)) {
      inspectSize(node.whenTrue);
      inspectSize(node.whenFalse);
    } else if (ts.isJsxExpression(node) && node.expression)
      inspectSize(node.expression);
  }
  function visit(node) {
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText(tree).replace(/["']/g, "") === "fontSize" &&
      !isIcon(node)
    )
      inspectSize(node.initializer);
    if (
      ts.isJsxAttribute(node) &&
      node.name.getText(tree) === "fontSize" &&
      node.initializer &&
      !isIcon(node)
    )
      inspectSize(node.initializer);
    ts.forEachChild(node, visit);
  }
  visit(tree);
}
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (["node_modules", ".next", "generated", "scripts"].includes(entry.name))
      continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(tsx?|css)$/.test(file) && !/\.(test|spec)\./.test(file))
      inspect(file);
  }
}
walk(root);
if (failures.length) {
  console.error(`Text below 16 CSS px:\n${failures.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(
    `Typography: ${checked} literal text sizes checked; none below 16 CSS px. Icons and the preserved signin/signup files are excluded. Runtime checks are still required for inherited and computed styles.`,
  );
}
