// Fails when a `path:line` reference in the docs points at a file or line that does not exist,
// or at a blank line. A bare `:74` refers to the last full path earlier in the same table row
// or line. Run from the repository root: node scripts/verify-docs.mjs
import { existsSync, readFileSync } from 'node:fs';

const DOCS = ['DESIGN.md', 'TESTING.md', 'UBIQUITOUS_LANGUAGE.md'];
const TOKEN = /`((?:backend|frontend|docs|scripts|\.github)\/[\w./-]+\.\w+)(?::(\d+)(?:-(\d+))?)?`|`:(\d+)`/g;

const problems = [];
let checked = 0;

function check(doc, file, n) {
  checked += 1;
  const lines = readFileSync(file, 'utf8').split('\n');
  if (n < 1 || n > lines.length || lines[n - 1].trim() === '') {
    problems.push(`${doc}: ${file}:${n} is out of range or blank`);
  }
}

for (const doc of DOCS.filter(existsSync)) {
  for (const row of readFileSync(doc, 'utf8').split('\n')) {
    let file = null;
    for (const [, path, from, to, short] of row.matchAll(TOKEN)) {
      if (path) {
        file = path;
        if (!existsSync(path)) {
          problems.push(`${doc}: ${path} does not exist`);
          file = null;
        } else if (from) {
          check(doc, path, Number(from));
          if (to) check(doc, path, Number(to));
        }
      } else if (file) {
        check(doc, file, Number(short));
      } else {
        problems.push(`${doc}: \`:${short}\` has no file before it on the same line`);
      }
    }
  }
}

console.log(`${checked} line references checked`);
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
