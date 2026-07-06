const { chunkPage } = require('../src/pdfUtils');

test('chunkPage basic splits into chunks with <= max words', () => {
  const words = [];
  for (let i = 0; i < 1200; i++) words.push(`word${i}`);
  const text = words.join(' ');
  const chunks = chunkPage(text, 200);
  expect(chunks.length).toBeGreaterThan(0);
  expect(chunks.every((c) => typeof c === 'string')).toBe(true);
  expect(chunks.every((c) => c.split(/\s+/).length <= 200)).toBe(true);
});
