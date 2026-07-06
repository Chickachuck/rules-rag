const fs = require('fs');
const path = require('path');

function cosine(a, b) {
  let s = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    s += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return s / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

class VectorStore {
  constructor(indexPath) {
    this.indexPath = indexPath;
    this.items = [];
    this._load();
  }

  _load() {
    if (fs.existsSync(this.indexPath)) {
      try {
        const idx = JSON.parse(fs.readFileSync(this.indexPath, 'utf8'));
        this.items = idx.items || [];
      } catch (e) {
        this.items = [];
      }
    }
  }

  _save() {
    fs.writeFileSync(this.indexPath, JSON.stringify({ items: this.items }, null, 2), 'utf8');
  }

  async addChunks(chunks, sourceId, embeddings) {
    const texts = chunks.map((c) => c.text);
    const vecs = await embeddings.embed(texts);
    for (let i = 0; i < chunks.length; i++) {
      this.items.push({
        vector: vecs[i],
        text: chunks[i].text,
        source_id: sourceId,
        page: chunks[i].page,
      });
    }
    this._save();
  }

  async query(q, k, embeddings) {
    const qv = (await embeddings.embed(q))[0];
    const scored = this.items.map((it) => ({ score: cosine(qv, it.vector), meta: { text: it.text, source_id: it.source_id, page: it.page } }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k);
  }
}

module.exports = VectorStore;
