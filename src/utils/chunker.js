export function chunkText(text, { maxWords = 250 } = {}) {
  if (!text) return [];
  const paragraphs = text
    .split(/\n+/)
    .map(p => p.trim())
    .filter(Boolean);

  const chunks = [];
  let current = "";

  const countWords = str => (str ? str.split(/\s+/).length : 0);

  for (const p of paragraphs) {
    const combined = current ? current + "\n\n" + p : p;
    if (countWords(combined) <= maxWords) {
      current = combined;
    } else {
      if (current) chunks.push(current);
      if (countWords(p) > maxWords) {
        const words = p.split(/\s+/);
        for (let i = 0; i < words.length; i += maxWords) {
          chunks.push(words.slice(i, i + maxWords).join(" "));
        }
        current = "";
      } else {
        current = p;
      }
    }
  }

  if (current) chunks.push(current);
  return chunks;
}