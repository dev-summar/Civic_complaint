import type {TextStyle} from 'react-native';

const ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const DEVANAGARI = /[\u0900-\u097F]/;

/** Keep the row left-to-right. Only the complaint text follows its own script. */
export function scriptTextStyle(value: string): TextStyle {
  if (ARABIC.test(value)) {
    return {
      fontFamily: "'Noto Naskh Arabic', 'Noto Sans Arabic', serif",
      writingDirection: 'auto',
      lineHeight: 26,
    };
  }
  if (DEVANAGARI.test(value)) {
    return {
      fontFamily: "'Noto Sans Devanagari', Inter, sans-serif",
      writingDirection: 'auto',
      lineHeight: 24,
    };
  }
  return {writingDirection: 'auto'};
}

export function englishGlance(title: string, categoryLabel: string, summary?: string | null): string {
  const latin = summary && !ARABIC.test(summary) && !DEVANAGARI.test(summary) ? summary.trim() : '';
  if (latin) return latin;
  if (ARABIC.test(title) || DEVANAGARI.test(title)) return categoryLabel;
  return '';
}
