export async function parseText(file) {
  const text = await file.text();
  return {
    type: 'text',
    text,
    pages: [{ pageNum: 1, text }]
  };
}
