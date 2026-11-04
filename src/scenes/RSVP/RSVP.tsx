import { RSVPForm } from '../../components/RSVPForm/RSVPForm';
import type { FormSession } from '../../utils/rsvpApi';
import './RSVP.css';

/** Сцена 07. Заголовок — в конце фильма; форма продолжает бумагу, которая опустилась с веера. */
export function RSVP({ session, reduced }: { session: FormSession | null; reduced: boolean }) {
  return (
    <section className="rsvp" id="chapter-rsvp" aria-labelledby="rsvp-heading">
      <RSVPForm session={session} reduced={reduced} />
    </section>
  );
}
