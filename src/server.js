const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { extractPages, chunkPage } = require('./pdfUtils');
const Embeddings = require('./embeddings');
const VectorStore = require('./store');

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const app = express();
app.use(express.json());
const upload = multer();

const store = new VectorStore(path.join(DATA_DIR, 'js_ann.index.json'));
const embeddings = new Embeddings();

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/ingest_pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file required' });
    const filename = req.file.originalname;
    const pages = await extractPages(req.file.buffer);
    const chunks = [];
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const pageChunks = chunkPage(page, 500);
      pageChunks.forEach((text) => chunks.push({ text, page: i + 1 }));
    }
    await store.addChunks(chunks, filename, embeddings);
    res.json({ ingested: chunks.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

app.get('/query', async (req, res) => {
  try {
    const q = req.query.q;
    const k = parseInt(req.query.k || '5', 10);
    if (!q) return res.status(400).json({ error: 'q required' });
    const results = await store.query(q, k, embeddings);
    res.json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
}

module.exports = app;
