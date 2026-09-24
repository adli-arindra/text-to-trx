export const fillers = ['um', 'uh', 'er', 'like', 'you know', 'so'];

export const stopwords = ['on', 'for', 'the', 'a', 'an', 'my', 'some', 'to', 'of'];

export const connectors = ['and then', 'and', 'then', 'also', 'plus', 'after that'];

export const currencyMarkers = ['dollar', 'dollars', 'buck', 'bucks', 'usd', '$'];

export const priceWords = ['for', 'cost', 'costs', 'at', 'worth'];

export const typeKeywords: Record<string, string[]> = {
  expense: ['spent', 'spend', 'paid', 'pay', 'bought', 'buy', 'purchased'],
  income: ['got paid', 'received', 'earned', 'earn', 'made', 'got'],
  transfer: ['transferred', 'transfer', 'moved', 'move', 'sent', 'send'],
};

export const accountPhrases = {
  from: ['from', 'out of'],
  to: ['to', 'into'],
  using: ['with', 'using', 'via', 'on'],
};
