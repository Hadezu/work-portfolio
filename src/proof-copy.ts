import { defineCopy, selectCopy } from './localization-contract';
import { useLocale } from './locale';
import data from './proof-copy-data.json';

export const proofCopy = defineCopy('proof-ui', data);
export function useProofText() {
  const copy = selectCopy(proofCopy, useLocale());
  return (key: keyof typeof data.pl): string => {
    const value = copy[key];
    if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing proof translation: ${key}`);
    return value;
  };
}
