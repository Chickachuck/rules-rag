const pdf = require('pdf-parse');

async function extractPages(buffer) {
  const data = await pdf(buffer);
  const text = data.text || '';
  const pages = text.split('\f').map((p) => p.trim()).filter(Boolean);
  if (pages.length === 0 && text) return [text];
  return pages;
}

function chunkPage(text, maxLen = 500) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxLen) {
      if (cur) chunks.push(cur.trim());
      cur = w;
    } else {
      cur = cur ? cur + ' ' + w : w;
    }
  }
  if (cur) chunks.push(cur.trim());
  return chunks;
}

module.exports = { extractPages, chunkPage };
