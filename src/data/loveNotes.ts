/** Messages for Beth — add new lines to this array anytime. */
export const LOVE_NOTES_FOR_BETH: readonly string[] = [
  'I love you, Beth.',
  'You are my forever, Beth.',
  'Beth, you make everything brighter.',
  'I fall in love with you more every day, Beth.',
  'My heart is yours, Beth.',
  'Beth, you are the most beautiful part of my life.',
  'I cannot wait to marry you, Beth.',
  'You are my dream come true, Beth.',
  'Beth, every moment with you feels like Bali sunshine.',
  'I adore you, Beth.',
  'Beth, you still take my breath away.',
  'Missing you already, Beth — even when you are right here.',
  'Beth, you are the reason I believe in magic.',
  'I love the way you laugh, Beth.',
  'Beth, you are my favourite person in the entire world.',
  'Thinking about you always, Beth.',
  'Beth, you are stunning — inside and out.',
  'I love you more than words can say, Beth.',
  'Beth, you are my home.',
  'Tonight I just want you, Beth.',
  'Beth, you drive me absolutely wild.',
  'I love the way you look at me, Beth — it still ruins me.',
  'Beth, I cannot stop thinking about last night.',
  'You are the sexiest person I know, Beth — and you are all mine.',
  'Beth, adventure with you is my favourite kind of trouble.',
  'I want you tonight, Beth — slowly, completely, only you.',
  'Beth, you know exactly how to make me lose control.',
  'The way you touch me, Beth — I am still thinking about it.',
  'Beth, you are my home — and my favourite temptation.',
]

export function pickRandomLoveNote(exclude?: string): string {
  const pool = exclude && LOVE_NOTES_FOR_BETH.length > 1
    ? LOVE_NOTES_FOR_BETH.filter(note => note !== exclude)
    : LOVE_NOTES_FOR_BETH
  return pool[Math.floor(Math.random() * pool.length)]
}