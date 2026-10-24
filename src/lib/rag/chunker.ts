/**
 * A lightweight text splitter that recursively splits by common separators.
 * Tries to keep chunk lengths below `chunkSize` while preserving sentences/paragraphs.
 */
export function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  // Normalize whitespace
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  
  if (normalizedText.length <= chunkSize) {
    return [normalizedText];
  }

  const chunks: string[] = [];
  let currentStart = 0;

  while (currentStart < normalizedText.length) {
    // Find the end index for the current chunk
    const currentEnd = currentStart + chunkSize;
    
    // If we've reached the end of the text, just add the rest
    if (currentEnd >= normalizedText.length) {
      chunks.push(normalizedText.slice(currentStart));
      break;
    }

    // Try to find a natural break point (period, question mark, exclamation, or space)
    // looking backwards from the currentEnd to ensure we don't break mid-word.
    let breakPoint = currentEnd;
    const searchArea = normalizedText.slice(currentStart, currentEnd);
    
    const lastPeriod = searchArea.lastIndexOf('. ');
    const lastSpace = searchArea.lastIndexOf(' ');

    if (lastPeriod > chunkSize / 2) {
      breakPoint = currentStart + lastPeriod + 1; // include the period
    } else if (lastSpace > 0) {
      breakPoint = currentStart + lastSpace;
    }

    chunks.push(normalizedText.slice(currentStart, breakPoint).trim());

    // Move start forward, accounting for overlap
    currentStart = breakPoint - overlap;
    
    // Safety check to prevent infinite loop if overlap is too large
    if (currentStart <= 0 || breakPoint <= currentStart) {
      currentStart = breakPoint; 
    }
  }

  return chunks;
}
