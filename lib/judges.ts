import data from '@/judges.json';

export type Judge = (typeof data)[number];
export const JUDGES: Judge[] = data;

export const COLORS = ['#0A84FF', '#FF9F0A', '#30D158', '#FF375F', '#BF5AF2', '#5AC8FA'];
export const NONE = '#C7C7CC';
export const color = (v: string) => (v === '-' ? NONE : COLORS[+v]);

// Seat order for the half circle: grouped by vote (no-answer last), then by age, so each answer forms a wedge.
export const byVote = (votes: string) =>
  JUDGES.map((j, k) => ({ j, v: votes[k] })).sort((a, b) => (a.v === '-' ? 99 : +a.v) - (b.v === '-' ? 99 : +b.v) || a.j.age - b.j.age);

export const persona = (j: Judge) =>
  `You are ${j.name}, ${j.age}, an American ${j.gender.toLowerCase()} (${j.orientation.toLowerCase()}). ` +
  `Politics: ${j.politics}. Income: ${j.income}. Religion: ${j.religion}. Education: ${j.education}. ` +
  `Work: ${j.profession}. Personality: ${j.personality}. Into: ${j.quirk}.`;
