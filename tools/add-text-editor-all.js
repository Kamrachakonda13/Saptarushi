// Add text-editor.js script tag to all pages that use media-player.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const files = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      if (!['node_modules', '.venv', '.git', 'books', 'temples'].includes(f)) walk(p);
    } else if (f.endsWith('.html')) {
      files.push(p);
    }
  }
}
walk(root);

let count = 0;
for (const f of files) {
  let c = fs.readFileSync(f, 'utf-8');
  if (c.includes('media-player.js') && !c.includes('text-editor.js')) {
    // Determine the relative path prefix
    const rel = path.relative(root, path.dirname(f));
    const prefix = rel ? '../'.repeat(rel.split(path.sep).length) : '';
    c = c.replace(
      '<script src="' + prefix + 'media-player.js"></script>',
      '<script src="' + prefix + 'media-player.js"></script>\n  <script src="' + prefix + 'text-editor.js"></script>'
    );
    fs.writeFileSync(f, c);
    count++;
    console.log('Updated: ' + path.relative(root, f));
  }
}
console.log('Total updated: ' + count);