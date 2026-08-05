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

const allowedUnreachablePatterns = [
  /^src\/components\/ui\//,
  /^src\/hooks\/use-mobile\.tsx$/,
];
const unreachable = productionFiles
  .filter((file) => !reachable.has(file))
  .map(normalize)
  .sort();
const unexpected = unreachable.filter(
  (file) => !allowedUnreachablePatterns.some((pattern) => pattern.test(file)),
);

if (unexpected.length > 0) {
  throw new Error(
    "Módulos de produto fora do runtime:\n- " + unexpected.join("\n- "),
  );
}

console.log(
  `Contrato de alcance aprovado: ${reachable.size}/${productionFiles.length} módulos entram no runtime; ${unreachable.length} wrappers opcionais do design system permanecem permitidos.`,
);
