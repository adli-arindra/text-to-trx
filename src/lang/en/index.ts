import type { LanguagePack } from '../types';
import { numbers } from './numbers';
import {
  accountPhrases,
  connectors,
  currencyMarkers,
  fillers,
  priceWords,
  stopwords,
  typeKeywords,
} from './keywords';
import { dates } from './dates';

export const en: LanguagePack = {
  code: 'en',
  fillers,
  stopwords,
  connectors,
  numbers,
  currencyMarkers,
  priceWords,
  typeKeywords,
  accountPhrases,
  dates,
};
