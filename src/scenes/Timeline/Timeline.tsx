import { wedding, type TimelineItem } from '../../config/wedding';
import { Photo } from '../../components/Photo/Photo';
import './Timeline.css';

function Art({ item }: { item: TimelineItem }) {
  switch (item.kind) {
    case 'gather': {
      const words = item.title.split(' ');
      return (
        <h3 className="tl-event__title tl-compose">
          {words.map((w) => <span className="tl-word" key={w}><span>{w}</span></span>)}
        </h3>
      );
    }
    case 'ceremony':
      return (
        <div className="tl-meet">
          <div className="tl-meet__lines" aria-hidden="true">
            <i className="tl-meet__a" /><i className="tl-meet__b" /><b className="tl-meet__dot" />
          </div>
          <h3 className="tl-event__title">{item.title}</h3>
        </div>
      );
    case 'dinner':
      return (
        <div className="tl-dinner">
          <div className="tl-photo"><Photo image={item.image} /></div>
          <h3 className="tl-event__title">{item.title}</h3>
        </div>
      );
    case 'dance':
      return (
        <div className="tl-dance">
          <div className="tl-photo tl-photo--dance"><Photo image={item.image} /></div>
          <svg className="tl-orbit" viewBox="0 0 200 200" aria-hidden="true">
            <ellipse cx="100" cy="100" rx="94" ry="38" />
            <ellipse cx="100" cy="100" rx="94" ry="38" />
            <ellipse cx="100" cy="100" rx="70" ry="26" />
          </svg>
          <h3 className="tl-event__title">{item.title}</h3>
        </div>
      );
    default:
      return (
        <div className="tl-party">
          <h3 className="sr-only">{item.title}</h3>
          {item.image && <div className="tl-party__photo"><Photo image={item.image} /></div>}
          <div className="tl-rows" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div className={`tl-row ${i === 1 ? 'tl-row--gold' : ''}`} key={i}>
                {`${item.title} `.repeat(4)}
              </div>
            ))}
          </div>
        </div>
      );
  }
}

export function Timeline() {
  const { heading, items } = wedding.timeline;
  return (
    <section className="scene tl" id="chapter-timeline" aria-labelledby="tl-heading">
      <h2 className="eyebrow tl__heading" id="tl-heading">{heading}</h2>
      <ol className="tl__track">
        {items.map((item) => (
          <li className={`tl-event tl-event--${item.kind}`} data-kind={item.kind} key={`${item.time}${item.title}`}>
            <i className="tl-event__mark" aria-hidden="true" />
            <div className="tl-event__time"><span>{item.time}</span></div>
            <div className="tl-event__art"><Art item={item} /></div>
          </li>
        ))}
      </ol>
    </section>
  );
}
