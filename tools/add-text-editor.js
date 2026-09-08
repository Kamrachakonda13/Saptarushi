// Add text-editor.js script tag to all book pages and audio.html
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

// Update all book pages
const booksDir = path.join(root, 'books');
let count = 0;
for (const f of fs.readdirSync(booksDir)) {
  if (!f.endsWith('.html')) continue;
  const p = path.join(booksDir, f);
  let c = fs.readFileSync(p, 'utf-8');
  // Add text-editor.js before book-view.js
  if (c.includes('book-view.js') && !c.includes('text-editor.js')) {
    c = c.replace(
      '<script src="../media-player.js"></script>\n  <script src="../book-view.js"></script>',
      '<script src="../media-player.js"></script>\n  <script src="../text-editor.js"></script>\n  <script src="../book-view.js"></script>'
    );
    fs.writeFileSync(p, c);
    count++;
    console.log('Updated: books/' + f);
  }
}

// Update audio.html
const audioPath = path.join(root, 'audio.html');
let ac = fs.readFileSync(audioPath, 'utf-8');
if (ac.includes('media-player.js') && !ac.includes('text-editor.js')) {
  ac = ac.replace(
    '<script src="media-player.js"></script>',
    '<script src="media-player.js"></script>\n  <script src="text-editor.js"></script>'
  );
  fs.writeFileSync(audioPath, ac);
  console.log('Updated: audio.html');
}

console.log('Total book pages updated: ' + count);