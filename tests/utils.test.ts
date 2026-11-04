import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRouteUrl, formatCoordinates } from '../src/utils/route.ts';
import { validateRsvp } from '../supabase/functions/_shared/rsvp-validation.ts';

test('без адреса и координат маршрута нет', () => {
  assert.equal(buildRouteUrl({ address: '  ', coordinates: null, mapProvider: 'yandex' }), null);
});

test('маршрут ведёт на настоящую карту', () => {
  assert.equal(buildRouteUrl({ address: '', coordinates: { lat: 55.75, lng: 37.61 }, mapProvider: 'yandex' }),
    'https://yandex.ru/maps/?rtext=~55.75,37.61&rtt=auto');
  assert.equal(buildRouteUrl({ address: 'Москва, Тверская 1', coordinates: null, mapProvider: 'google' }),
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent('Москва, Тверская 1')}`);
});

test('координаты форматируются в градусы', () => {
  assert.equal(formatCoordinates({ lat: 55.7558, lng: 37.6173 }), '55°45′21″ N · 37°37′02″ E');
});

test('валидация: имя, присутствие, очистка полей', () => {
  const bad = validateRsvp({ guest_name: ' ', guest_count: 1 }, 2);
  assert.equal(bad.ok, false);
  const fine = validateRsvp({ guest_name: '  Анна\u0000   Петрова ', attendance: true, guest_count: 2, drinks: ' ' }, 2);
  assert.ok(fine.ok);
  if (fine.ok) {
    assert.equal(fine.data.guest_name, 'Анна Петрова');
    assert.equal(fine.data.drinks, null);
  }
});
