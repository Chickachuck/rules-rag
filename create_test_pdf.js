const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function createTestPdf() {
  const doc = new PDFDocument({ autoFirstPage: false });
  const outputPath = path.join(__dirname, 'tests', 'fixtures', 'test.pdf');
  
  // Ensure the output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  doc.pipe(fs.createWriteStream(outputPath));

  // Page 1 - contains Chapter One and Chapter Two
  doc.addPage();
  
  // Add Chapter One to outline
  const chapterOneOutline = doc.outline.addItem('Chapter One');
  doc.fontSize(18).text('Chapter One');
  doc.moveDown();
  doc.fontSize(12).text('This is the content for Chapter One.');
  
  doc.moveDown(2);
  
  // Add Chapter Two to outline
  const chapterTwoOutline = doc.outline.addItem('Chapter Two');
  doc.fontSize(18).text('Chapter Two');
  doc.moveDown();
  doc.fontSize(12).text('This is the content for Chapter Two.');

  // Page 2 - continuation
  doc.addPage();
  doc.fontSize(14).text('Page 2: Continuation of chapters.');

  // Page 3 - contains Chapter Three
  doc.addPage();
  
  // Add Chapter Three to outline
  const chapterThreeOutline = doc.outline.addItem('Chapter Three');
  doc.fontSize(18).text('Chapter Three');
  doc.moveDown();
  doc.fontSize(12).text('This is the content for Chapter Three on the third page.');

  doc.end();

  doc.on('end', () => {
    console.log('Test PDF created at:', outputPath);
  });
}

createTestPdf();