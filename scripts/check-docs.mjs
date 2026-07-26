import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const docsRoot = path.join(root, "docs");
const errors = [];

function report(message) {
  errors.push(message);
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function parseFrontmatter(contents, file) {
  const match = contents.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) {
    report(`${relative(file)}: missing YAML frontmatter`);
    return {};
  }

  const values = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    values[key] = value;
  }
  return values;
}

function validateLocalTarget(sourceFile, rawTarget) {
  let target = rawTarget.trim();
  if (target.startsWith("<") && target.endsWith(">")) {
    target = target.slice(1, -1);
  }
  if (
    !target ||
    target.startsWith("#") ||
    target.startsWith("//") ||
    target.startsWith("/") ||
    /^[a-z][a-z\d+.-]*:/i.test(target)
  ) {
    return;
  }

  target = target.split("#", 1)[0].split("?", 1)[0];
  if (!target || /YYYY|\{\{/.test(target)) return;

  try {
    target = decodeURIComponent(target);
  } catch {
    report(`${relative(sourceFile)}: invalid encoded link "${rawTarget}"`);
    return;
  }

  const resolved = path.resolve(path.dirname(sourceFile), target);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    report(`${relative(sourceFile)}: local link leaves the repository: "${rawTarget}"`);
    return;
  }
  if (!existsSync(resolved)) {
    report(`${relative(sourceFile)}: broken local link "${rawTarget}"`);
  }
}

async function validateLinks(file) {
  const contents = await readFile(file, "utf8");

  if (file.endsWith(".md")) {
    const markdownLinks = contents.matchAll(/!?\[[^\]]*\]\((<[^>]+>|[^)\s]+)(?:\s+[^)]*)?\)/g);
    for (const match of markdownLinks) {
      validateLocalTarget(file, match[1]);
    }
  }

  if (file.endsWith(".html")) {
    const htmlLinks = contents.matchAll(/(?:href|src)=["']([^"']+)["']/gi);
    for (const match of htmlLinks) {
      validateLocalTarget(file, match[1]);
    }
  }
}

function validatePortablePaths(file, contents) {
  const machinePaths = [
    { pattern: /\/(?:home|Users|tmp)\//g, label: "machine-local absolute path" },
    { pattern: /~\//g, label: "home-relative path" },
    { pattern: /file:\/\//gi, label: "file URL" },
    { pattern: /\b[A-Za-z]:\\/g, label: "Windows absolute path" },
    {
      pattern: /PERSONAL\/games\/hegemony/gi,
      label: "workspace-relative Hegemony path",
    },
  ];

  for (const { pattern, label } of machinePaths) {
    if (pattern.test(contents)) {
      report(
        `${relative(file)}: contains a ${label}; describe Hegemony paths relative to the repository root`,
      );
    }
  }
}

for (const required of ["README.md", "roadmap.md", "questions.md"]) {
  if (!existsSync(path.join(docsRoot, required))) {
    report(`docs/${required}: required control-plane file is missing`);
  }
}

for (const required of ["plans", "reference", "reports", "archive"]) {
  if (!existsSync(path.join(docsRoot, required))) {
    report(`docs/${required}/: required documentation directory is missing`);
  }
}

const allowedRootFiles = new Set(["README.md", "roadmap.md", "questions.md"]);
for (const entry of await readdir(docsRoot, { withFileTypes: true })) {
  if (entry.isFile() && !allowedRootFiles.has(entry.name)) {
    report(`docs/${entry.name}: files at the control-plane root must be classified`);
  }
}

for (const retired of ["feat", "sim", "design"]) {
  if (existsSync(path.join(docsRoot, retired))) {
    report(`docs/${retired}/: retired mixed-purpose directory must not return`);
  }
}

const docsReadmePath = path.join(docsRoot, "README.md");
const docsReadme = await readFile(docsReadmePath, "utf8");
if (docsReadme.split(/\r?\n/).length > 100) {
  report("docs/README.md: control plane must remain at or below 100 lines");
}

const planDirectory = path.join(docsRoot, "plans");
const planFiles = (await readdir(planDirectory))
  .filter((name) => name.endsWith(".md") && !name.startsWith("_"))
  .sort();
const validStatuses = new Set(["proposed", "ready", "active", "blocked"]);
const activeSurfaces = [
  docsReadmePath,
  path.join(docsRoot, "roadmap.md"),
  ...planFiles.map((name) => path.join(planDirectory, name)),
];

for (const name of planFiles) {
  const file = path.join(planDirectory, name);
  const contents = await readFile(file, "utf8");
  const metadata = parseFrontmatter(contents, file);

  if (!validStatuses.has(metadata.status)) {
    report(`${relative(file)}: status must be proposed, ready, active, or blocked`);
  }
  if (!metadata.phase) {
    report(`${relative(file)}: phase metadata is required`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(metadata.updated ?? "")) {
    report(`${relative(file)}: updated must use YYYY-MM-DD`);
  }
  if (!docsReadme.includes(`(plans/${name})`)) {
    report(`${relative(file)}: missing from docs/README.md active-plan index`);
  }
  for (const required of [
    "## Three-axis parity",
    "Engine / backend",
    "Frontend",
    "Simulation & AI",
  ]) {
    if (!contents.includes(required)) {
      report(`${relative(file)}: missing parity classification "${required}"`);
    }
  }
}

for (const file of activeSurfaces) {
  const contents = await readFile(file, "utf8");
  if (/\*\*Your answer:\*\*/i.test(contents) || /—\s*`OPEN`/i.test(contents)) {
    report(`${relative(file)}: unresolved owner questions belong only in docs/questions.md`);
  }
}

const questionsPath = path.join(docsRoot, "questions.md");
const questions = await readFile(questionsPath, "utf8");
const headings = [...questions.matchAll(/^## (Q\d+[a-z]?) — .+$/gim)];
const questionIds = new Set();

for (let index = 0; index < headings.length; index += 1) {
  const id = headings[index][1];
  if (questionIds.has(id.toLowerCase())) {
    report(`docs/questions.md: duplicate question ID ${id}`);
  }
  questionIds.add(id.toLowerCase());

  const sectionStart = headings[index].index + headings[index][0].length;
  const sectionEnd = headings[index + 1]?.index ?? questions.length;
  const section = questions.slice(sectionStart, sectionEnd);

  for (const field of ["Context", "Options", "Recommendation", "Answer"]) {
    if (!section.includes(`**${field}:**`)) {
      report(`docs/questions.md: ${id} is missing ${field}`);
    }
  }

  const answerMarker = "**Answer:**";
  const answerAt = section.indexOf(answerMarker);
  if (answerAt !== -1 && section.slice(answerAt + answerMarker.length).trim()) {
    report(`docs/questions.md: ${id} has an answer; fold it into the plan and remove the question`);
  }
}

for (const name of planFiles) {
  const file = path.join(planDirectory, name);
  const contents = await readFile(file, "utf8");
  for (const match of contents.matchAll(/\[Q(\d+[a-z]?)\]\(\.\.\/questions\.md#/gi)) {
    if (!questionIds.has(`q${match[1]}`.toLowerCase())) {
      report(`${relative(file)}: references missing owner question Q${match[1]}`);
    }
  }
}

const linkedFiles = (await walk(docsRoot)).filter(
  (file) => file.endsWith(".md") || file.endsWith(".html"),
);
linkedFiles.push(path.join(root, "README.md"));

for (const file of linkedFiles) {
  const contents = await readFile(file, "utf8");
  validatePortablePaths(file, contents);
  await validateLinks(file);
}

if (errors.length > 0) {
  console.error("Documentation checks failed:\n");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

const reportCount = (await walk(path.join(docsRoot, "reports"))).length;
const archiveCount = (await walk(path.join(docsRoot, "archive"))).length;
console.log(
  `Documentation checks passed: ${planFiles.length} active plans, ${headings.length} owner questions, ${reportCount} report files, ${archiveCount} archived files.`,
);
