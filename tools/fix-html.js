// Fix stray </div> after </html> in all HTML files
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const files = [];

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      if (!['node_modules', '.venv', '.git'].includes(f)) walk(p);
    } else if (f.endsWith('.html')) {
      files.push(p);
    }
  }
}
walk(root);

let fixed = 0;
for (const f of files) {
  let c = fs.readFileSync(f, 'utf-8');
  // Remove stray </div> after </html>
  const re = /<\/html>\s*<\/div>\s*$/;
  if (re.test(c)) {
    c = c.replace(re, '</html>\n');
    fs.writeFileSync(f, c);
    fixed++;
    console.log('Fixed: ' + path.relative(root, f));
  }
}
console.log('Total fixed: ' + fixed);