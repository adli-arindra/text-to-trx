export interface NumberWords {
  units: Record<string, number>;
  tens: Record<string, number>;
  scales: Record<string, number>;
  decimalWords: string[];
  joinWords: string[];
  parse?: (tokens: string[]) => number | null;
}

export interface DateWords {
  today: string[];
  yesterday: string[];
  dayBeforeYesterday: string[];
  daysAgo: RegExp;
  weekdays: string[];
  months: Record<string, number>;
  lastWord: string[];
  ordinalSuffix: RegExp;
}

export interface AccountPhraseWords {
  from: string[];
  to: string[];
  using: string[];
}

export interface LanguagePack {
  code: string;
  fillers: string[];
  stopwords: string[];
  connectors: string[];
  numbers: NumberWords;
  currencyMarkers: string[];
  priceWords: string[];
  typeKeywords: Record<string, string[]>;
  accountPhrases: AccountPhraseWords;
  dates: DateWords;
}
