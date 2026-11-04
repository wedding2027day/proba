import { wedding } from '../../config/wedding';
import { Photo } from '../../components/Photo/Photo';
import { Countdown } from '../../components/Finale/Countdown';
import { dateParts } from '../../utils/couple';
import './SaveTheDate.css';

export function SaveTheDate() {
  const { day, month, year } = dateParts();
  return (
    <section className="scene date" id="chapter-date" aria-label={`Дата свадьбы: ${day}.${month}.${year}`}>
      <div className="date__base" />
      <div className="date__photo"><Photo image={wedding.datePhoto} /></div>
      <div className="date__door date__door--t" aria-hidden="true"><Photo image={{ ...wedding.datePhoto, alt: '' }} /></div>
      <div className="date__door date__door--b" aria-hidden="true"><Photo image={{ ...wedding.datePhoto, alt: '' }} /></div>
      <div className="date__mask" aria-hidden="true">
        <div className="date__white" />
        {[day, month, year].map((part, n) => (
          <span className="date__digit" key={n}>
            {[...part].map((c, i) => <i className="date__char" key={i}>{c}</i>)}
          </span>
        ))}
      </div>
      <div className="scene__safe date__safe">
        <div className="date__caption">
          <p className="date__caption-text">{wedding.event.dateCaption}</p>
          <Countdown className="date__count" compact />
        </div>
      </div>
    </section>
  );
}
