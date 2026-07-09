let pdfjsLib;

async function getPdfjsLib() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  }
  return pdfjsLib;
}

function normalizeText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function createFallbackChapter(pageEntries) {
  const text = pageEntries.map(({ text }) => text).filter(Boolean).join('\n\n').trim();
  return {
    name: 'Document',
    path: 'Document',
    pages: pageEntries.map(({ page, text }) => ({ page, text })),
    text,
  };
}

function flattenOutline(outline, parentPath = []) {
  if (!Array.isArray(outline)) return [];
  const chapters = [];
  outline.forEach((node) => {
    if (!node || typeof node.title !== 'string') return;
    const title = node.title.trim();
    const pathSegments = [...parentPath, title];
    chapters.push({ title, path: pathSegments.join(' / '), node });
    if (Array.isArray(node.items) && node.items.length > 0) {
      chapters.push(...flattenOutline(node.items, pathSegments));
    }
  });
  return chapters;
}

async function resolveOutlinePage(pdfDoc, node) {
  try {
    if (!node || !node.dest) return null;
    if (Array.isArray(node.dest)) {
      const [destRef] = node.dest;
      if (destRef && typeof destRef === 'object') {
        return (await pdfDoc.getPageIndex(destRef)) + 1;
      }
      if (Number.isInteger(destRef)) {
        return destRef + 1;
      }
      return null;
    }
    if (typeof node.dest === 'string') {
      const explicitDest = await pdfDoc.getDestination(node.dest);
      if (Array.isArray(explicitDest)) {
        const [destRef] = explicitDest;
        if (destRef && typeof destRef === 'object') {
          return (await pdfDoc.getPageIndex(destRef)) + 1;
        }
        if (Number.isInteger(destRef)) {
          return destRef + 1;
        }
      }
    }
  } catch (error) {
    return null;
  }
  return null;
}

async function extractPages(buffer) {
  const pdfjs = await getPdfjsLib();
  const uint8Array = new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({ data: uint8Array });
  const pdfDoc = await loadingTask.promise;
  const outline = await pdfDoc.getOutline();
  const chapterDefinitions = [];
  if (Array.isArray(outline) && outline.length > 0) {
    const flattened = flattenOutline(outline);
    for (const entry of flattened) {
      const page = await resolveOutlinePage(pdfDoc, entry.node);
      chapterDefinitions.push({ title: entry.title, path: entry.path, page: page || 1 });
    }
  }

  const pageEntries = [];
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    const items = (textContent.items || []).filter((item) => item && typeof item.str === 'string' && item.str.trim());
    const text = normalizeText(items.map((item) => item.str).join(' '));
    const headers = items
      .filter((item) => item.height > 10)
      .map((item) => item.str.trim())
      .filter(Boolean);
    pageEntries.push({ page: i, text, headers });
  }

  if (pageEntries.length === 0) {
    return [];
  }

  if (chapterDefinitions.length === 0) {
    return [createFallbackChapter(pageEntries)];
  }

  const sortedDefinitions = chapterDefinitions
    .filter((chapter) => Number.isInteger(chapter.page) && chapter.page > 0)
    .sort((a, b) => a.page - b.page);

  if (sortedDefinitions.length === 0) {
    return [createFallbackChapter(pageEntries)];
  }

  const chapters = [];
  let currentChapter = null;
  let currentPages = [];
  let currentText = [];

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const pageEntry = pageEntries[i - 1];
    const chapterForPage = sortedDefinitions.find((chapter) => chapter.page === i);
    const headerTitle = pageEntry.headers.find((header) => chapterForPage?.title === header);
    const shouldStartNewChapter = Boolean(chapterForPage) && Boolean(headerTitle);

    if (shouldStartNewChapter && currentChapter) {
      chapters.push({
        name: currentChapter.title,
        path: currentChapter.path,
        pages: currentPages,
        text: currentText.join('\n\n').trim(),
      });
      currentPages = [];
      currentText = [];
    }

    if (shouldStartNewChapter || (!currentChapter && chapterForPage)) {
      currentChapter = chapterForPage;
    }

    if (currentChapter) {
      currentPages.push({ page: pageEntry.page, text: pageEntry.text });
      currentText.push(pageEntry.text);
    }
  }

  if (currentChapter) {
    chapters.push({
      name: currentChapter.title,
      path: currentChapter.path,
      pages: currentPages,
      text: currentText.join('\n\n').trim(),
    });
  }

  return chapters.length > 0 ? chapters : [createFallbackChapter(pageEntries)];
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
