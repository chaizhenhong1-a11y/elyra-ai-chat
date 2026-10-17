import en from './messages/en.json';
import zhCN from './messages/zh-CN.json';
import ms from './messages/ms.json';
import vi from './messages/vi.json';
import ru from './messages/ru.json';
import ja from './messages/ja.json';
import ko from './messages/ko.json';
import ar from './messages/ar.json';
import he from './messages/he.json';
import fa from './messages/fa.json';
import ur from './messages/ur.json';
import fr from './messages/fr.json';
import de from './messages/de.json';
import es from './messages/es.json';
import pt from './messages/pt.json';
import it from './messages/it.json';
import id from './messages/id.json';

export type Messages = {[Key in keyof typeof en]: string};
export const messages: Record<string, Messages> = {
  en, 'zh-CN': zhCN, ms, vi, ru, ja, ko, ar, he, fa, ur, fr, de, es, pt, it, id,
};
