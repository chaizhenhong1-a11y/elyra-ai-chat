import {ELYRA_LANGUAGE_CATALOG} from '../language-catalog.generated';
import {uiLanguageName} from './provider';

export function languagePickerGroups(query: string, locale: string) {
  const q = query.trim().toLocaleLowerCase();
  const languages = [...ELYRA_LANGUAGE_CATALOG].filter(entry => !q ||
    [uiLanguageName(entry, locale), entry.names.en ?? '', entry.code].some(value => value.toLocaleLowerCase().includes(q)),
  ).sort((a, b) => (a.names.en ?? a.code).localeCompare(b.names.en ?? b.code, 'en', {sensitivity: 'base'}));
  if (q) return [{letter: '', items: languages}];
  return languages.reduce<Array<{letter: string; items: typeof languages}>>((groups, entry) => {
    const letter = (entry.names.en ?? entry.code).trim().charAt(0).toUpperCase();
    if (groups.at(-1)?.letter === letter) groups.at(-1)!.items.push(entry);
    else groups.push({letter, items: [entry]});
    return groups;
  }, []);
}
