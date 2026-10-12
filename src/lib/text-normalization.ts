const confusables: Record<string, string> = {
  'а': 'a', 'α': 'a', 'в': 'b', 'β': 'b', 'с': 'c', 'ϲ': 'c', 'ԁ': 'd',
  'е': 'e', 'ε': 'e', 'һ': 'h', 'н': 'h', 'і': 'i', 'ι': 'i', 'ј': 'j',
  'к': 'k', 'κ': 'k', 'ӏ': 'l', 'ⅼ': 'l', 'м': 'm', 'μ': 'm', 'ո': 'n',
  'п': 'n', 'ν': 'v', 'о': 'o', 'ο': 'o', 'р': 'p', 'ρ': 'p', 'զ': 'q',
  'г': 'r', 'ѕ': 's', 'τ': 't', 'т': 't', 'υ': 'u', 'ц': 'u', 'х': 'x',
  'χ': 'x', 'у': 'y', 'γ': 'y', 'ᴢ': 'z',
};

export function normalizeBrandText(value: string): string {
  return value.normalize('NFKD').toLocaleLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

/** Fold a small, documented set of common Cyrillic/Greek visual confusables. */
export function normalizeLookalikeText(value: string): string {
  const folded = Array.from(value.normalize('NFKC').toLocaleLowerCase())
    .map(character => confusables[character] ?? character).join('');
  return normalizeBrandText(folded);
}
