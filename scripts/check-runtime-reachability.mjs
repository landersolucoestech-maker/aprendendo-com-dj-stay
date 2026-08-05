import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourceRoot = path.join(root, "src");
const normalize = (value) => path.relative(root, value).split(path.sep).join("/");

const walk = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(absolute);
    return statSync(absolute).isFile() ? [absolute] : [];
  });

const allSourceFiles = walk(sourceRoot)
  .filter((file) => /\.(?:ts|tsx)$/.test(file))
  .map((file) => path.resolve(file));
const productionFiles = allSourceFiles.filter(
  (file) =>
    !/\.(?:test|spec)\.(?:ts|tsx)$/.test(file) && !file.endsWith(".d.ts"),
);
const productionSet = new Set(productionFiles);

const resolveModule = (fromFile, specifier) => {
  let base;
  if (specifier.startsWith("@/")) {
    base = path.join(sourceRoot, specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    base = path.resolve(path.dirname(fromFile), specifier);
  } else {
    return null;
  }

  const extension = path.extname(base);
  const candidates = [];
  if ([".ts", ".tsx"].includes(extension)) {
    candidates.push(base);
  } else if ([".js", ".jsx"].includes(extension)) {
    candidates.push(base.slice(0, -extension.length) + ".ts");
    candidates.push(base.slice(0, -extension.length) + ".tsx");
  } else {
    candidates.push(base + ".ts", base + ".tsx");
    candidates.push(path.join(base, "index.ts"), path.join(base, "index.tsx"));
  }

  return candidates.map((candidate) => path.resolve(candidate)).find(existsSync) ?? null;
};

const dependencyGraph = new Map();
for (const file of productionFiles) {
  const source = readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const dependencies = new Set();
  const register = (specifier) => {
    if (typeof specifier !== "string") return;
    const resolved = resolveModule(file, specifier);
    if (resolved && productionSet.has(resolved)) dependencies.add(resolved);
  };
  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      register(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      const [argument] = node.arguments;
      if (argument && ts.isStringLiteralLike(argument)) register(argument.text);
    }
    if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteralLike(node.argument.literal)
    ) {
      register(node.argument.literal.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  dependencyGraph.set(file, [...dependencies]);
}

const entrypoint = path.resolve(sourceRoot, "main.tsx");
if (!existsSync(entrypoint)) {
  throw new Error("Contrato de alcance inválido: src/main.tsx não existe.");
}

const reachable = new Set();
const stack = [entrypoint];
while (stack.length > 0) {
  const file = stack.pop();
  if (!file || reachable.has(file)) continue;
  reachable.add(file);
  for (const dependency of dependencyGraph.get(file) ?? []) stack.push(dependency);
}

const allowedUnreachable = new Set([
  "src/components/ui/accordion.tsx",
  "src/components/ui/alert-dialog.tsx",
  "src/components/ui/alert.tsx",
  "src/components/ui/aspect-ratio.tsx",
  "src/components/ui/breadcrumb.tsx",
  "src/components/ui/calendar.tsx",
  "src/components/ui/carousel.tsx",
  "src/components/ui/chart.tsx",
  "src/components/ui/collapsible.tsx",
  "src/components/ui/command.tsx",
  "src/components/ui/context-menu.tsx",
  "src/components/ui/drawer.tsx",
  "src/components/ui/dropdown-menu.tsx",
  "src/components/ui/form.tsx",
  "src/components/ui/hover-card.tsx",
  "src/components/ui/input-otp.tsx",
  "src/components/ui/menubar.tsx",
  "src/components/ui/navigation-menu.tsx",
  "src/components/ui/pagination.tsx",
  "src/components/ui/popover.tsx",
  "src/components/ui/radio-group.tsx",
  "src/components/ui/resizable.tsx",
  "src/components/ui/scroll-area.tsx",
  "src/components/ui/separator.tsx",
  "src/components/ui/sheet.tsx",
  "src/components/ui/sidebar.tsx",
  "src/components/ui/skeleton.tsx",
  "src/components/ui/slider.tsx",
  "src/components/ui/table.tsx",
  "src/components/ui/toggle-group.tsx",
  "src/components/ui/toggle-variants.ts",
  "src/components/ui/toggle.tsx",
  "src/components/ui/use-toast.ts",
  "src/hooks/use-mobile.tsx",
]);
const unreachable = productionFiles
  .filter((file) => !reachable.has(file))
  .map(normalize)
  .sort();
const unreachableSet = new Set(unreachable);
const unexpected = unreachable.filter((file) => !allowedUnreachable.has(file));
const staleAllowlist = [...allowedUnreachable]
  .filter((file) => !unreachableSet.has(file))
  .sort();

const failures = [];
if (unexpected.length > 0) {
  failures.push("Módulos de produto fora do runtime:\n- " + unexpected.join("\n- "));
}
if (staleAllowlist.length > 0) {
  failures.push(
    "Allowlist de alcance desatualizada; remova entradas que deixaram de ser órfãs:\n- " +
      staleAllowlist.join("\n- "),
  );
}
if (failures.length > 0) {
  throw new Error(failures.join("\n\n"));
}

console.log(
  `Contrato de alcance aprovado: ${reachable.size}/${productionFiles.length} módulos entram no runtime; ${unreachable.length} wrappers opcionais possuem allowlist explícita.`,
);
