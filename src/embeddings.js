const OpenAI = require('openai');

class Embeddings {
  constructor() {
    this.hasOpenAI = !!process.env.OPENAI_API_KEY;
    if (this.hasOpenAI) {
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      this.model = 'text-embedding-3-small';
    } else {
      this.dim = 512;
    }
  }

  async embed(texts) {
    if (!Array.isArray(texts)) texts = [texts];
    if (this.hasOpenAI) {
      const resp = await this.client.embeddings.create({ model: this.model, input: texts });
      return resp.data.map((d) => d.embedding);
    } else {
      return texts.map((t) => this._fallback(t));
    }
  }

  _fallback(text) {
    const v = new Array(this.dim).fill(0);
    for (let i = 0; i < text.length; i++) {
      const ch = text.charCodeAt(i);
      const idx = ch % this.dim;
      v[idx] += 1;
    }
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    return v.map((x) => x / norm);
  }
}

module.exports = Embeddings;
