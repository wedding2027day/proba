import { plural, useCountdown } from '../../hooks/useCountdown';

export function Countdown({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  const c = useCountdown();
  if (c.done) return <p className={className}>Этот день настал</p>;
  if (compact) {
    return (
      <p className={className}>
        До этого дня — {c.days} {plural(c.days, ['день', 'дня', 'дней'])}
      </p>
    );
  }
  const cells: [number, string][] = [
    [c.days, plural(c.days, ['день', 'дня', 'дней'])],
    [c.hours, plural(c.hours, ['час', 'часа', 'часов'])],
    [c.minutes, plural(c.minutes, ['минута', 'минуты', 'минут'])],
    [c.seconds, plural(c.seconds, ['секунда', 'секунды', 'секунд'])],
  ];
  return (
    <div className={`count ${className}`} role="timer" aria-label={`До свадьбы ${c.days} ${plural(c.days, ['день', 'дня', 'дней'])}`}>
      {cells.map(([v, l]) => (
        <div className="count__cell" key={l.slice(0, 3)}>
          <span className="count__value">{String(v).padStart(2, '0')}</span>
          <span className="count__label">{l}</span>
        </div>
      ))}
    </div>
  );
}
