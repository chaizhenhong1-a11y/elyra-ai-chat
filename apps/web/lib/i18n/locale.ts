import {ELYRA_LANGUAGE_CATALOG} from '../language-catalog.generated';

const codes = new Map(ELYRA_LANGUAGE_CATALOG.map(entry => [entry.code.toLowerCase(), entry.code]));
const aliases: Record<string, string> = {iw: 'he', in: 'id', ji: 'yi', nb: 'no', nn: 'no', fil: 'tl'};

/** Resolve against the catalog, independently of translation-pack availability. */
export function normalizeLocale(value: string): string {
  const tag = value.trim().replace(/_/g, '-').toLowerCase();
  if (codes.has(tag)) return codes.get(tag)!;
  const [rawBase, ...subtags] = tag.split('-');
  const base = aliases[rawBase] ?? rawBase;
  if (base === 'zh') {
    const traditional = subtags.includes('hant') || subtags.includes('tw') || subtags.includes('hk') || subtags.includes('mo');
    const candidates = traditional ? ['zh-tw', 'zh-hant', 'zh-hk', 'zh', 'zh-cn'] : ['zh-cn', 'zh-hans', 'zh'];
    return candidates.map(code => codes.get(code)).find(Boolean) ?? 'en';
  }
  const parts = [base, ...subtags];
  while (parts.length) {
    const found = codes.get(parts.join('-'));
    if (found) return found;
    parts.pop();
  }
  return ELYRA_LANGUAGE_CATALOG.find(entry => entry.code.toLowerCase().split('-')[0] === base)?.code ?? 'en';
}

export function normalizeSelection(value: string): string {
  return value === 'system' ? 'system' : normalizeLocale(value);
}

export function localeDirection(locale: string): 'ltr' | 'rtl' {
  return ['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ug', 'yi'].includes(locale.split('-')[0]) ? 'rtl' : 'ltr';
}
