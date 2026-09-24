# text-to-trx

A TypeScript library that turns a spoken-style English sentence (already transcribed to text) into a list of structured money transactions, matched against your app's existing categories, accounts and transaction names.

Fully offline, deterministic, rule-based with no network calls, no API keys, no ML models. Built for React Native (Hermes-compatible), pure TypeScript with zero runtime dependencies, so it also runs in Node.

> **Status:** early development, not yet published. API and README will be filled in as the library takes shape.

## Goals

- Parse plain text (e.g. output of an on-device speech recognizer) into transactions with type, amount, name, category, account, date, and a per-field confidence score.
- English only for now, with a swappable language-pack architecture for future languages. The `en` pack is exported, along with the `LanguagePack` interface for adding new languages.
- Extensible transaction types (`expense`, `income`, `transfer` ship by default). `createTypeRegistry` resolves default and app-registered types to their keyword lists.
- Stateless: the library stores nothing, the app passes in everything it needs on each call.

## License

MIT
