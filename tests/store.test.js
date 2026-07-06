const fs = require('fs');
const path = require('path');
const os = require('os');
const Embeddings = require('../src/embeddings');
const VectorStore = require('../src/store');

test('store addChunks and query returns results with metadata', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-'));
  const idxPath = path.join(tmp, 'ann.json');
  const store = new VectorStore(idxPath);
  const embeddings = new Embeddings();
  process.env.OPENAI_API_KEY = '';
  const chunks = [
    { text: 'hello world', page: 1 },
    { text: 'another doc', page: 2 },
  ];
  await store.addChunks(chunks, 'file1.pdf', embeddings);
  const res = await store.query('hello', 2, embeddings);
  expect(Array.isArray(res)).toBe(true);
  expect(res.length).toBeGreaterThan(0);
  expect(res[0].meta).toHaveProperty('source_id');
  // cleanup
  try { fs.unlinkSync(idxPath); } catch (e) {}
});
