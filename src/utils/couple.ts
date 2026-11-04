import { wedding } from '../config/wedding';

export const initials = () => {
  const { partnerOne, partnerTwo } = wedding.couple;
  return [partnerOne[0]?.toUpperCase() ?? '', partnerTwo[0]?.toUpperCase() ?? ''] as const;
};

/** Дата как числа для типографики: день, месяц, год. */
export const dateParts = () => {
  const [year, month, day] = wedding.event.date.split('-');
  return { day, month, year };
};

export const eventStart = () => new Date(`${wedding.event.date}T${wedding.event.startTime}:00${wedding.event.utcOffset}`);
export const eventEnd = () => new Date(`${wedding.event.date}T${wedding.event.endTime}:00${wedding.event.utcOffset}`);

export const isPortrait = () => window.innerWidth / window.innerHeight < 0.8;
