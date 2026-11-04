import { wedding } from '../config/wedding';
import { eventEnd, eventStart } from './couple';

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

function fold(line: string) {
  // RFC 5545: строки длиннее 75 байт переносятся.
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (bytes + n > 73) { out.push(cur); cur = ' '; bytes = 1; }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join('\r\n');
}

const location = () => [wedding.location.name, wedding.location.address].filter(Boolean).join(', ');

export function buildIcs(now = new Date()) {
  const { title } = wedding.event;
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//THE DAY//RU', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:the-day-${wedding.event.date}@invitation`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(eventStart())}`,
    `DTEND:${stamp(eventEnd())}`,
    `SUMMARY:${esc(title)}`,
    ...(wedding.location.address ? [`LOCATION:${esc(location())}`] : []),
    'END:VEVENT', 'END:VCALENDAR',
  ].map(fold).join('\r\n') + '\r\n';
}

export function downloadIcs() {
  const url = URL.createObjectURL(new Blob([buildIcs()], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'the-day.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function googleCalendarUrl() {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: wedding.event.title,
    dates: `${stamp(eventStart())}/${stamp(eventEnd())}`,
  });
  if (wedding.location.address) p.set('location', location());
  return `https://calendar.google.com/calendar/render?${p}`;
}
