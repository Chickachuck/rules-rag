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

test('extractPages returns separate chapters when multiple chapters start on the same page', async () => {
  const pdfPath = path.join(__dirname, 'fixtures', 'test.pdf');
  const buffer = fs.readFileSync(pdfPath);
  const chapters = await extractPages(buffer);

  expect(Array.isArray(chapters)).toBe(true);
  expect(chapters).toHaveLength(3);
  expect(chapters.map((chapter) => chapter.name)).toEqual(['Chapter One', 'Chapter Two', 'Chapter Three']);
  expect(chapters[0].pages).toHaveLength(1);
  expect(chapters[1].pages).toHaveLength(2);
  expect(chapters[2].pages).toHaveLength(1);
  expect(chapters[0].pages[0].text).toEqual('Chapter One This is the content for Chapter One.');
  expect(chapters[1].pages[0].text).toEqual('Chapter Two This is the content for Chapter Two.');
  expect(chapters[1].pages[1].text).toEqual('Page 2: Continuation of chapters.');
  expect(chapters[2].pages[0].text).toEqual('Chapter Three This is the content for Chapter Three on the third page.');
});
