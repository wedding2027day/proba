import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { gsap, notifyLayoutChanged } from '../../animations/setup';
import { SealedLetter, type FromRect } from './SealedLetter';
import { wedding } from '../../config/wedding';
import {
  errorMessage, fetchFormSession, RsvpError, submitRsvp, type FormSession,
} from '../../utils/rsvpApi';
import { LIMITS, validateRsvp, type FieldErrors } from '../../../supabase/functions/_shared/rsvp-validation';
import './RSVPForm.css';

type Status = 'idle' | 'loading' | 'closing' | 'success';
const DONE_KEY = 'the-day:rsvp-done';

type Done = { name: string; attending: boolean };

function readDone(): Done | null {
  try {
    return JSON.parse(localStorage.getItem(DONE_KEY) ?? 'null');
  } catch {
    return null;
  }
}

export function RSVPForm({ session, reduced }: { session: FormSession | null; reduced: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState<Done | null>(readDone);
  const [status, setStatus] = useState<Status>(() => (readDone() ? 'success' : 'idle'));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');

  const [name, setName] = useState('');
  const [attendance, setAttendance] = useState<boolean | null>(null);
  const maxGuests = session?.maxGuests ?? wedding.rsvp.maxGuests;
  const [guests, setGuests] = useState(1);
  const [drinks, setDrinks] = useState('');
  const [diet, setDiet] = useState('');
  const [comment, setComment] = useState('');
  const [trap, setTrap] = useState('');

  // Один и тот же id при повторе: сервер не создаст вторую запись, если первый ответ потерялся в сети.
  const submissionId = useRef(crypto.randomUUID());
  const sending = useRef(false);
  const liveSession = useRef<FormSession | null>(session);
  liveSession.current = session ?? liveSession.current;
  const namePrefilled = useRef(false);
  const [fromRect, setFromRect] = useState<FromRect | null>(null);

  useEffect(() => {
    if (session?.guestName && !namePrefilled.current) {
      namePrefilled.current = true;
      setName(session.guestName);
    }
  }, [session]);

  useLayoutEffect(() => {
    // Кромка листа в фильме убирается вместе с формой.
    document.querySelector('.dress__bridge')?.classList.toggle('is-fading', status === 'success' || status === 'closing');
  }, [status]);

  const finish = useCallback((d: Done) => {
    const card = root.current?.querySelector<HTMLElement>('.rc');
    try { localStorage.setItem(DONE_KEY, JSON.stringify(d)); } catch { /* приватный режим */ }
    setDone(d);
    if (reduced || !card) {
      setStatus('success');
      return;
    }
    setStatus('closing');
    // Поля растворяются снизу вверх, остаётся чистый лист. Его положение передаём письму.
    const fields = Array.from(card.querySelectorAll('.rc__inner > *'));
    gsap.to(fields.reverse(), {
      opacity: 0, y: -10, duration: 0.3, stagger: 0.035, ease: 'power2.in',
      onComplete: () => {
        const r = card.getBoundingClientRect();
        const outer = root.current!.getBoundingClientRect();
        root.current!.style.minHeight = `${outer.height}px`;
        setFromRect({ left: r.left - outer.left, top: r.top - outer.top, width: r.width, height: r.height });
        setStatus('success');
        window.setTimeout(notifyLayoutChanged, 1000);
      },
    });
  }, [reduced]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (sending.current) return; // защита от двойного нажатия
    setFormError('');

    const raw = {
      guest_name: name,
      attendance: attendance === null ? undefined : attendance,
      guest_count: attendance ? guests : 0,
      drinks,
      dietary_restrictions: diet,
      comment,
    };
    const checked = validateRsvp(raw, maxGuests);
    if (!checked.ok) {
      setErrors(checked.errors);
      const first = Object.keys(checked.errors)[0];
      root.current?.querySelector<HTMLElement>(`[data-field="${first}"] input, [data-field="${first}"] button`)?.focus();
      return;
    }
    setErrors({});
    sending.current = true;
    setStatus('loading');

    try {
      let s = liveSession.current ?? (await fetchFormSession());
      liveSession.current = s;
      let result;
      try {
        result = await submitRsvp(submissionId.current, s.formToken, checked.data, trap);
      } catch (err) {
        if (!(err instanceof RsvpError) || err.code !== 'token_expired') throw err;
        // Страница была открыта больше суток — берём новый токен и дожидаемся минимальной паузы.
        s = await fetchFormSession();
        liveSession.current = s;
        await new Promise((r) => window.setTimeout(r, 3100));
        result = await submitRsvp(submissionId.current, s.formToken, checked.data, trap);
      }
      // Подтверждение показываем только после успешного ответа сервера.
      if (!result?.ok) throw new RsvpError('server_error');
      finish({ name: checked.data.guest_name.split(' ')[0], attending: checked.data.attendance });
    } catch (err) {
      const code = err instanceof RsvpError ? err.code : 'server_error';
      if (err instanceof RsvpError && err.fields) setErrors(err.fields);
      setFormError(errorMessage(code));
      setStatus('idle');
    } finally {
      sending.current = false;
    }
  };

  const again = () => {
    try { localStorage.removeItem(DONE_KEY); } catch { /* ничего страшного */ }
    submissionId.current = crypto.randomUUID();
    setDone(null);
    setFromRect(null);
    if (root.current) root.current.style.minHeight = '';
    setName('');
    setAttendance(null);
    setGuests(1);
    setDrinks('');
    setDiet('');
    setComment('');
    setStatus('idle');
    requestAnimationFrame(notifyLayoutChanged);
  };

  const clearError = (field: keyof FieldErrors) =>
    setErrors((e) => {
      if (!e[field]) return e;
      const next = { ...e };
      delete next[field];
      return next;
    });

  const busy = status === 'loading' || status === 'closing';

  if (status === 'success' && done) {
    return (
      <div ref={root} className="rsvp__finale">
        <SealedLetter
          guest={done.name}
          attending={done.attending}
          message={done.attending ? wedding.rsvp.thanksComing(done.name) : wedding.rsvp.thanksDeclined(done.name)}
          from={fromRect}
          onAgain={again}
        />
      </div>
    );
  }

  return (
    <div ref={root}>
      <div className="rc">
        <form className="rc__inner" onSubmit={onSubmit} noValidate aria-labelledby="rsvp-heading" aria-busy={busy}>
          <div className={`rf ${errors.guest_name ? 'has-error' : ''}`} data-field="guest_name">
            <label htmlFor="rf-name">Имя и фамилия</label>
            <input id="rf-name" name="name" autoComplete="name" maxLength={LIMITS.name} value={name}
              onChange={(e) => { setName(e.target.value); clearError('guest_name'); }} disabled={busy} aria-invalid={!!errors.guest_name}
              aria-describedby={errors.guest_name ? 'rf-name-err' : undefined} />
            <i className="rf__line" />
            {errors.guest_name && <p className="rf__error" id="rf-name-err">{errors.guest_name}</p>}
          </div>

          <fieldset className={`rf rf--choice ${errors.attendance ? 'has-error' : ''}`} data-field="attendance" disabled={busy}>
            <legend>Присутствие</legend>
            <div className="choice" role="radiogroup">
              <button type="button" role="radio" aria-checked={attendance === true}
                className={attendance === true ? 'is-on' : ''} onClick={() => { setAttendance(true); clearError('attendance'); }}>С радостью приду</button>
              <button type="button" role="radio" aria-checked={attendance === false}
                className={attendance === false ? 'is-on' : ''} onClick={() => { setAttendance(false); clearError('attendance'); }}>К сожалению, не смогу</button>
            </div>
            {errors.attendance && <p className="rf__error">{errors.attendance}</p>}
          </fieldset>

          <div className={`rc__more ${attendance === true ? 'is-open' : ''}`} inert={attendance !== true}>
            <div className="rc__more-inner">
              {maxGuests > 1 && (
                <div className={`rf ${errors.guest_count ? 'has-error' : ''}`} data-field="guest_count">
                  <span className="rf__label" id="rf-guests">Количество гостей, включая вас</span>
                  <div className="stepper" role="group" aria-labelledby="rf-guests">
                    <button type="button" aria-label="Меньше" disabled={guests <= 1 || busy} onClick={() => setGuests((g) => Math.max(1, g - 1))}>−</button>
                    <output aria-live="polite">{guests}</output>
                    <button type="button" aria-label="Больше" disabled={guests >= maxGuests || busy} onClick={() => setGuests((g) => Math.min(maxGuests, g + 1))}>+</button>
                  </div>
                  {errors.guest_count && <p className="rf__error">{errors.guest_count}</p>}
                </div>
              )}
              <div className={`rf ${errors.drinks ? 'has-error' : ''}`}>
                <label htmlFor="rf-drinks">Предпочтения по напиткам <small>необязательно</small></label>
                <input id="rf-drinks" maxLength={LIMITS.drinks} value={drinks} onChange={(e) => setDrinks(e.target.value)} disabled={busy} />
                <i className="rf__line" />
              </div>
              <div className={`rf ${errors.dietary_restrictions ? 'has-error' : ''}`}>
                <label htmlFor="rf-diet">Пищевые ограничения <small>необязательно</small></label>
                <input id="rf-diet" maxLength={LIMITS.dietary} value={diet} onChange={(e) => setDiet(e.target.value)} disabled={busy} />
                <i className="rf__line" />
              </div>
            </div>
          </div>

          <div className={`rf ${errors.comment ? 'has-error' : ''}`}>
            <label htmlFor="rf-comment">Комментарий <small>необязательно</small></label>
            <textarea id="rf-comment" rows={2} maxLength={LIMITS.comment} value={comment} onChange={(e) => setComment(e.target.value)} disabled={busy} />
            <i className="rf__line" />
          </div>

          {/* Ловушка для ботов: людям не видна и недоступна с клавиатуры */}
          <div className="rf__trap" aria-hidden="true">
            <label>Сайт <input tabIndex={-1} autoComplete="off" name="website" value={trap} onChange={(e) => setTrap(e.target.value)} /></label>
          </div>

          {formError && <p className="rc__error" role="alert">{formError}</p>}

          <button type="submit" className={`btn rc__submit ${busy ? 'is-loading' : ''}`} disabled={busy}>
            <span>{formError ? 'Повторить отправку' : wedding.rsvp.submitLabel}</span>
            {busy && <i className="rc__spinner" aria-label="Отправляем" />}
          </button>
        </form>
      </div>
    </div>
  );
}
