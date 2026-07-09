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

test('extractPages returns chapters with page-aware content for a multi-page PDF', async () => {
  const pdfPath = path.join(__dirname, 'fixtures', 'test.pdf');
  const buffer = fs.readFileSync(pdfPath);
  const chapters = await extractPages(buffer);
  expect(Array.isArray(chapters)).toBe(true);
  expect(chapters.length).toBe(1);
  const [chapter] = chapters;
  expect(chapter).toEqual(expect.objectContaining({
    name: expect.any(String),
    path: expect.any(String),
    text: expect.any(String),
    pages: expect.any(Array),
  }));
  expect(chapter.pages).toHaveLength(3);
  expect(chapter.pages[0]).toEqual(expect.objectContaining({ page: 1, text: expect.stringContaining('Page 1: This is the first page of the test PDF.') }));
  expect(chapter.pages[1]).toEqual(expect.objectContaining({ page: 2, text: expect.stringContaining('Page 2: This is the second page.') }));
  expect(chapter.pages[2]).toEqual(expect.objectContaining({ page: 3, text: expect.stringContaining('Page 3: Third page with special chars: cafe, naive, resume.') }));
  expect(chapter.text).toContain('Page 1: This is the first page of the test PDF.');
  expect(chapter.text).toContain('Page 2: This is the second page.');
  expect(chapter.text).toContain('Page 3: Third page with special chars: cafe, naive, resume.');
});
