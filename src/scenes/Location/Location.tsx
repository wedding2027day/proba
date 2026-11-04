import { wedding } from '../../config/wedding';
import { Photo } from '../../components/Photo/Photo';
import { buildRouteUrl, formatCoordinates } from '../../utils/route';
import './Location.css';

export function Location() {
  const { location: loc } = wedding;
  const url = buildRouteUrl(loc);
  const lines = loc.name.split(' ');
  return (
    <section className="scene loc" id="chapter-location" aria-labelledby="loc-name">
      <div className="loc__media"><Photo image={loc.image} /><div className="loc__shade" /></div>
      <div className="scene__safe loc__copy">
        <h2 className="loc__name" id="loc-name">
          {lines.map((l, i) => <span className="loc__name-line" key={`${l}${i}`}><span>{l}</span></span>)}
        </h2>
        <div className="loc__info">
          <p className="loc__meta eyebrow">{loc.startsAt}</p>
          <p className="loc__address">{loc.address || loc.addressPending}</p>
          {loc.details && <p className="loc__details">{loc.details}</p>}
          {url && (
            <a className="btn loc__route" href={url} target="_blank" rel="noopener noreferrer">{loc.routeLabel}</a>
          )}
        </div>
        <div className="loc__cross" aria-hidden={!loc.coordinates}>
          <svg viewBox="0 0 60 60" aria-hidden="true">
            <path d="M30 0v24M30 36v24M0 30h24M36 30h24" stroke="#C6A77B" strokeWidth=".8" fill="none" />
            <circle cx="30" cy="30" r="1.6" fill="#C6A77B" />
          </svg>
          <span className="loc__coords">
            {loc.coordinates ? formatCoordinates(loc.coordinates) : 'Координаты уточняются'}
          </span>
        </div>
      </div>
    </section>
  );
}
