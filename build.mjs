// Bundles dev.html + js/*.js into a single self-contained index.html that runs from file://
// (browsers refuse to load relative ES modules from file://). Usage: node build.mjs
import fs from 'fs';
import path from 'path';

const root = path.dirname(new URL(import.meta.url).pathname);
const jsDir = path.join(root, 'js');
const mods = new Map(); // name -> {src, deps}

function load(name) {
  if (mods.has(name)) return;
  let src = fs.readFileSync(path.join(jsDir, name + '.js'), 'utf8');
  const deps = [];
  const exportsList = [];
  src = src.replace(/^import \* as THREE from 'three';\s*$/m, '');
  src = src.replace(/^import \{([^}]+)\} from '\.\/([\w-]+)\.js';\s*$/gm, (_, names, dep) => {
    deps.push(dep);
    const binds = names.split(',').map(n => n.trim()).filter(Boolean).map(n => n.replace(/\s+as\s+/, ': '));
    return `const { ${binds.join(', ')} } = __req('${dep}');`;
  });
  if (/^\s*import\s/m.test(src)) throw new Error(`Unsupported import in ${name}.js`);
  src = src.replace(/^export (async function|function|class|const|let) (\w+)/gm, (_, kind, id) => { exportsList.push(id); return `${kind} ${id}`; });
  if (/^export\s/m.test(src)) throw new Error(`Unsupported export in ${name}.js`);
  mods.set(name, { src, deps, exportsList });
  deps.forEach(load);
}
load('main');

let bundle = `import * as THREE from 'three';
const __defs = {}, __cache = {};
const __req = n => __cache[n] || (__cache[n] = (__cache[n] = {}, __defs[n](__cache[n]), __cache[n]));
`;
for (const [name, m] of mods) {
  bundle += `\n// ---- ${name}.js\n__defs['${name}'] = (__exports) => {\n${m.src}\nObject.assign(__exports, { ${m.exportsList.join(', ')} });\n};\n`;
}
bundle += `\n__req('main');\n`;
if (bundle.includes('</script')) throw new Error('bundle contains </script');

const html = fs.readFileSync(path.join(root, 'dev.html'), 'utf8');
const tag = '<script type="module" src="js/main.js"></script>';
if (!html.includes(tag)) throw new Error('module tag not found in dev.html');
const out = html.replace(tag, () => `<script type="module">\n${bundle}</script>`)
  .replace('<!doctype html>', '<!doctype html>\n<!-- Built by build.mjs from dev.html + js/*.js — edit those, then run `node build.mjs`. -->');
fs.writeFileSync(path.join(root, 'index.html'), out);
console.log(`index.html written: ${(out.length / 1024).toFixed(0)} KB, ${mods.size} modules`);
