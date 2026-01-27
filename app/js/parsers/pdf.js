/**
 * Parse PDF files using PDF.js.
 * Returns { type, pages[], text, pageCount }
 */
export async function parsePDF(file) {
  const arrayBuffer = await file.arrayBuffer();

  // PDF.js must be loaded globally
  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) throw new Error('PDF.js library not loaded');

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];
  const allText = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });

    const items = textContent.items.map(item => ({
      str: item.str,
      x: item.transform[4],
      y: viewport.height - item.transform[5],
      width: item.width,
      height: item.height,
      fontName: item.fontName
    }));

    const pageText = textContent.items.map(item => item.str).join(' ');
    allText.push(pageText);

    pages.push({
      pageNum: i,
      text: pageText,
      items,
      width: viewport.width,
      height: viewport.height
    });
  }

  return {
    type: 'pdf',
    pages,
    text: allText.join('\n\n'),
    pageCount: pdf.numPages
  };
}
