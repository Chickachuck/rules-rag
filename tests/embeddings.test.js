const Embeddings = require('../src/embeddings');

test('embeddings returns vectors for each input', async () => {
  const model = new Embeddings();
  // ensure fallback path by unsetting any key
  process.env.OPENAI_API_KEY = '';
  const texts = ['hello world', 'another sentence'];
  const vecs = await model.embed(texts);
  expect(Array.isArray(vecs)).toBe(true);
  expect(vecs.length).toBe(2);
  expect(vecs[0].length).toBeGreaterThan(0);
});
