// Example cases shown in the "Need ideas?" sheet: a judgeable question + the context that helps JEV-1.

export type Example = { q: string; context: string }
export type ExampleGroup = { id: string; emoji: string; title: string; examples: Example[] }

export const EXAMPLE_GROUPS: ExampleGroup[] = [
  {
    id: 'crush',
    emoji: '💘',
    title: 'Crush & dating',
    examples: [
      { q: 'Is she into me?', context: 'We matched 2 weeks ago, went on one date. She replies fast but never starts the chat.' },
      { q: 'Is he losing interest?', context: 'We’ve been talking for a month. His replies got shorter this week.' },
      { q: 'Should I text him first?', context: 'He left me on read after our second date 3 days ago.' },
      { q: 'How into me is she?', context: 'We met at a party, she added me on Instagram the next day.' },
    ],
  },
  {
    id: 'relationship',
    emoji: '💔',
    title: 'Relationship',
    examples: [
      { q: 'Is he cheating?', context: 'Together 1 year. He started hiding his phone and was online at 2am.' },
      { q: 'Is this a red flag?', context: 'She gets upset when I go out with my friends without her.' },
      { q: 'Is he good for me?', context: 'Dating 6 months. He’s sweet in person but cancels plans a lot.' },
      { q: 'Are we going to make it?', context: 'Long distance for 4 months, we fight about texting more often.' },
    ],
  },
  {
    id: 'fight',
    emoji: '🗣️',
    title: 'Arguments',
    examples: [
      { q: 'Am I wrong here?', context: 'We had planned dinner at 7pm, I got upset when he came at 9.' },
      { q: 'Who’s right, me or her?', context: 'Fight about splitting rent. I earn less but she wants 50/50.' },
      { q: 'Am I overreacting?', context: 'He forgot my birthday and said it’s “just a day”.' },
      { q: 'How toxic is this?', context: 'This was the third fight this week about the same thing.' },
    ],
  },
  {
    id: 'friends',
    emoji: '👯',
    title: 'Friends',
    examples: [
      { q: 'Is she a real friend?', context: 'Best friend for 5 years. She only texts when she needs something.' },
      { q: 'Was I rude?', context: 'I declined his party invite in the group chat and he went quiet.' },
      { q: 'Who’s right, me or them?', context: 'Group trip money: they want to split everything equally, I didn’t drink.' },
    ],
  },
  {
    id: 'family',
    emoji: '🏠',
    title: 'Family & work',
    examples: [
      { q: 'Am I being unfair to my mom?', context: 'She calls every day, I told her once a week is enough.' },
      { q: 'Is my boss being passive-aggressive?', context: 'New job, 2 months in. He replies “noted.” to all my messages.' },
      { q: 'Who’s right, me or my sister?', context: 'She borrowed my car and returned it with an empty tank.' },
    ],
  },
]

export const CONTEXT_CHIPS = [
  'We’ve dated for 3 months',
  'We just started talking',
  'He’s my ex',
  'Best friends for years',
  'This was after a fight',
  'Messages on the right are mine',
]

export const TIPS: { good: string; bad: string }[] = [
  { good: 'Is he losing interest?', bad: 'Why is he like this?' },
  { good: 'Am I wrong here?', bad: 'What should I say?' },
  { good: 'How toxic is this?', bad: 'Tell me about this chat' },
]
