export type Locale = 'en' | 'pt';

export type Result = {
  id: string;
  locale: Locale;
  question: string;
  shown: string; // what the judges actually saw (summary when the question was long)
  options: string[];
  votes: string; // one char per judge in judges.json order: option index, or '-' for no answer
  at: number;
};

export type Trend = { id?: string; question: string; options: string[]; votes?: string };

export const SUMMARIZE_AT = 250; // longer questions are summarized before the judges see them
