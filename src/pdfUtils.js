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

function buildChaptersFromEntries(pageEntries, chapterDefinitions) {
  const sortedDefinitions = chapterDefinitions
    .filter((chapter) => Number.isInteger(chapter.page) && chapter.page > 0)
    .map((chapter, index) => ({ ...chapter, index }))
    .sort((a, b) => a.page - b.page || a.index - b.index);

  if (sortedDefinitions.length === 0) {
    return [createFallbackChapter(pageEntries)];
  }

  const lastPage = pageEntries.length > 0 ? pageEntries[pageEntries.length - 1].page : 0;
  const chapters = sortedDefinitions.map((chapter, index) => {
    const nextChapter = sortedDefinitions[index + 1];
    
    // Determine end page for this chapter
    // If next chapter starts on the same page, this chapter only gets that page
    // If next chapter starts on a later page, this chapter gets pages up to that page
    // If no next chapter, this chapter gets all remaining pages
    let endPage;
    if (nextChapter) {
      if (nextChapter.page === chapter.page) {
        // Next chapter starts on same page - this chapter only gets this page
        endPage = chapter.page + 1;
      } else {
        // Next chapter starts on a later page
        endPage = nextChapter.page;
      }
    } else {
      // Last chapter gets all remaining pages
      endPage = lastPage + 1;
    }
    
    // Get all pages for this chapter's range
    const chapterPageEntries = pageEntries
      .filter(({ page }) => page >= chapter.page && page < endPage);
    
    // If multiple chapters start on the same page, we need to split the first page's content
    const pages = [];
    for (let i = 0; i < chapterPageEntries.length; i++) {
      const entry = chapterPageEntries[i];
      const pageNum = entry.page;
      let text = entry.text;
      
      // If this is the first page of the chapter and multiple chapters start on this page,
      // split the text at the chapter heading
      if (i === 0 && pageNum === chapter.page) {
        // Check if there are other chapters starting on the same page
        const samePageChapters = sortedDefinitions.filter(c => c.page === chapter.page);
        if (samePageChapters.length > 1) {
          // Find this chapter's index among same-page chapters
          const chapterIndex = samePageChapters.findIndex(c => c.index === chapter.index);
          if (chapterIndex >= 0) {
            // Split the text at chapter headings
            const headings = samePageChapters.map(c => c.title);
            text = splitTextAtHeadings(text, headings, chapterIndex);
          }
        }
      }
      
      pages.push({ page: pageNum, text });
    }
    
    const chapterText = pages.map(({ text }) => text).filter(Boolean).join('\n\n').trim();

    return {
      name: chapter.title,
      path: chapter.path,
      pages,
      text: chapterText,
    };
  });

  return chapters.length > 0 ? chapters : [createFallbackChapter(pageEntries)];
}

function splitTextAtHeadings(text, headings, targetIndex) {
  // Find all heading positions in the text
  const positions = [];
  for (const heading of headings) {
    const index = text.indexOf(heading);
    if (index !== -1) {
      positions.push({ heading, index });
    }
  }
  
  // Sort by position in text
  positions.sort((a, b) => a.index - b.index);
  
  if (positions.length === 0) {
    return text;
  }
  
  // If target heading not found in text, return original
  const targetPos = positions.find(p => p.heading === headings[targetIndex]);
  if (!targetPos) {
    return text;
  }
  
  const startIndex = targetPos.index;
  const endIndex = targetIndex < positions.length - 1 ? positions[targetIndex + 1].index : text.length;
  
  return text.substring(startIndex, endIndex).trim();
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

  return buildChaptersFromEntries(pageEntries, chapterDefinitions);
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

module.exports = { extractPages, chunkPage, buildChaptersFromEntries };
