// ANGLE rejects double underscores in GLSL identifiers. React useId() can
// produce leading underscores; strip those when shaders joins node/prop IDs.
// Ported from couchpass's shader compatibility patch.
import { readFileSync, writeFileSync } from "node:fs";

for (const file of ["react/bundle.js", "js/bundle.js", "core/index.js"]) {
  const path = new URL(`../node_modules/shaders/dist/${file}`, import.meta.url);
  const source = readFileSync(path, "utf8");
  const patched = source.replace(
    /\.setName\(`\$\{(\w+)\}_\$\{(\w+)\}`\)/g,
    (_, prop, id) => `.setName(\`\${${prop}}_\${${id}.replace(/^_+/,"")}\`)`,
  );
  if (patched !== source) writeFileSync(path, patched);
}
