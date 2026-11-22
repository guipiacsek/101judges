import data from '@/judges.json';

export type Judge = (typeof data)[number];
export const JUDGES: Judge[] = data;

export const persona = (j: Judge) =>
  `You are ${j.name}, ${j.age}, an American ${j.gender.toLowerCase()} (${j.orientation.toLowerCase()}). ` +
  `Politics: ${j.politics}. Income: ${j.income}. Religion: ${j.religion}. Education: ${j.education}. ` +
  `Work: ${j.profession}. Personality: ${j.personality}. Into: ${j.quirk}.`;
