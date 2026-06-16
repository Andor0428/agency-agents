const FILLER_PREFIX =
  /^(?:okay|ok|so|um+|uh+|well|right|yeah|yes|no|like|just|also|and then|then|i see|i've got|i have|we have|we've got|there's|there are|i count|counted|counting|let me see|looking at|on the shelf|on shelf|for the|the)\s+/i;

const FILLER_WORDS =
  /\b(?:please|thanks|thank you|cheers|mate|bottle|bottles|btl|case|cases|unit|units|each|of|the|a|an|some|about|roughly|maybe|around|like|got|have|has|is|are|at|in|on|shelf|bar|back bar|speed rail|well|top shelf)\b/gi;

const NUMBER_WORDS = /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|a|an|\d+(?:\.\d+)?)\b/gi;

/** Strip stock-take filler so fuzzy matching focuses on the product name. */
export function normalizeSpokenProductName(spoken: string): string {
  let text = spoken.trim();
  if (!text) return text;

  for (let i = 0; i < 4; i += 1) {
    const next = text.replace(FILLER_PREFIX, '').trim();
    if (next === text) break;
    text = next;
  }

  return text
    .replace(FILLER_WORDS, ' ')
    .replace(NUMBER_WORDS, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
