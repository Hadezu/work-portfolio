export type Locale = 'pl' | 'en';
export function resolveLocale(pathname:string):Locale {
  return pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'pl';
}
export type Localized<T> = Readonly<Record<Locale, T>>;

/** Validate the entire tree, including branches not selected by the current route. */
export function assertLocalized(name: string, copy: unknown): asserts copy is Localized<unknown> {
  if (!copy || typeof copy !== 'object' || !('pl' in copy) || !('en' in copy)) {
    throw new Error(`${name}: both pl and en are required`);
  }
  const pair = copy as Localized<unknown>;
  function compare(pl: unknown, en: unknown, path: string) {
    if(pl == null || en == null)throw new Error(`${path}: null or undefined translations are forbidden`);
    if (typeof pl === 'string' || typeof en === 'string') {
      if (typeof pl !== 'string' || typeof en !== 'string' || !pl.trim() || !en.trim()) {
        throw new Error(`${path}: non-empty pl and en strings are required`);
      }
      return;
    }
    if (Array.isArray(pl) !== Array.isArray(en)) throw new Error(`${path}: locale shapes differ`);
    if (!pl || !en || typeof pl !== 'object' || typeof en !== 'object') {
      if (pl !== en) throw new Error(`${path}: locale shapes differ`);
      return;
    }
    const p = pl as Record<string, unknown>, e = en as Record<string, unknown>;
    if(Object.keys(p).length===0||Object.keys(e).length===0)throw new Error(`${path}: empty translation structure`);
    if (Object.keys(p).sort().join('\0') !== Object.keys(e).sort().join('\0')) {
      throw new Error(`${path}: locale keys differ`);
    }
    for (const key of Object.keys(p)) compare(p[key], e[key], `${path}.${key}`);
  }
  compare(pair.pl, pair.en, name);
}

const sources = new Map<string, Localized<unknown>>();
export function defineCopy<T>(name: string, copy: Localized<T>): Localized<T> {
  assertLocalized(name, copy);
  // Re-registering a module during Vite HMR must replace its validated snapshot.
  sources.set(name, copy);
  function freeze(value:unknown){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}}
  freeze(copy);
  return copy;
}
export function localizationSources() { return new Map(sources); }
export function selectCopy<T>(copy: Localized<T>, locale: Locale): T {
  if (locale !== 'pl' && locale !== 'en') throw new Error(`Unsupported locale: ${String(locale)}`);
  if (!copy[locale]) throw new Error(`Missing required ${locale} copy`);
  return copy[locale];
}
