export type TransactionType = 'expense' | 'income' | 'transfer' | (string & {});

export interface Field<T> {
  value: T | null;
  confidence: number;
}

export interface CategoryRef {
  id: string;
  name: string;
}

export interface AccountRef {
  id: string;
  name: string;
}

export interface ParsedTransaction {
  type: Field<TransactionType>;
  amount: Field<number>;
  name: Field<string>;
  category: Field<CategoryRef>;
  account: Field<AccountRef>;
  toAccount?: Field<AccountRef>;
  date: Field<string>;
  source: { text: string; start: number; end: number };
  warnings: ParseWarning[];
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  unparsed: string[];
}

export type ParseWarning =
  | { code: 'MISSING_AMOUNT' }
  | { code: 'AMBIGUOUS_AMOUNT'; candidates: number[] }
  | { code: 'MULTIPLE_AMOUNTS'; candidates: number[] }
  | { code: 'UNKNOWN_CATEGORY'; heardAs: string }
  | { code: 'UNKNOWN_ACCOUNT'; heardAs: string }
  | { code: 'TYPE_CONFLICT'; fromCategory: string; fromKeywords: string }
  | { code: 'LOW_CONFIDENCE'; field: string };

export interface CategoryDefinition {
  id: string;
  name: string;
  type: TransactionType;
  aliases?: string[];
}

export interface AccountDefinition {
  id: string;
  name: string;
  aliases?: string[];
}

export interface KnownName {
  name: string;
  categoryId: string;
  count: number;
  lastUsedAt?: string;
}

export interface ParseContext {
  categories: CategoryDefinition[];
  accounts: AccountDefinition[];
  knownNames: KnownName[];
  defaultAccountId?: string;
}

export interface ParseOptions {
  referenceDate: Date;
}
