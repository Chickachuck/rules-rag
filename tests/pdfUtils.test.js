const path = require('path');
const fs = require('fs');
const { extractPages, chunkPage } = require('../src/pdfUtils');

test('chunkPage basic splits into chunks with <= max words', () => {
  const words = [];
  for (let i = 0; i < 1200; i++) words.push(`word${i}`);
  const text = words.join(' ');
  const chunks = chunkPage(text, 200);
  expect(chunks.length).toBeGreaterThan(0);
  expect(chunks.every((c) => typeof c === 'string')).toBe(true);
  expect(chunks.every((c) => c.split(/\s+/).length <= 200)).toBe(true);
});

test('extractPages returns page text for a multi-page PDF', async () => {
  const pdfPath = path.join(__dirname, 'fixtures', 'test.pdf');
  const buffer = fs.readFileSync(pdfPath);
  const pages = await extractPages(buffer);
  expect(Array.isArray(pages)).toBe(true);
  expect(pages.length).toBe(3);
  expect(pages[0]).toContain('Page 1: This is the first page of the test PDF.');
  expect(pages[1]).toContain('Page 2: This is the second page.');
  expect(pages[2]).toContain('Page 3: Third page with special chars: cafe, naive, resume.');
});
