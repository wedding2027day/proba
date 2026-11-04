export type RouteTarget = {
  address: string;
  coordinates: { lat: number; lng: number } | null;
  mapProvider: 'yandex' | 'google';
};

/** Ссылка на настоящую карту. Без адреса и координат — null: случайную точку не подставляем. */
export function buildRouteUrl({ address, coordinates, mapProvider }: RouteTarget): string | null {
  const text = address.trim();
  if (!text && !coordinates) return null;
  if (mapProvider === 'google') {
    const dest = coordinates ? `${coordinates.lat},${coordinates.lng}` : text;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
  }
  if (coordinates) return `https://yandex.ru/maps/?rtext=~${coordinates.lat},${coordinates.lng}&rtt=auto`;
  return `https://yandex.ru/maps/?text=${encodeURIComponent(text)}`;
}

/** 55.7558, 37.6173 → 55°45′21″ N · 37°37′02″ E */
export function formatCoordinates(c: { lat: number; lng: number }) {
  const part = (v: number, pos: string, neg: string) => {
    const a = Math.abs(v);
    const deg = Math.floor(a);
    const minF = (a - deg) * 60;
    const min = Math.floor(minF);
    const sec = Math.round((minF - min) * 60);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${deg}°${pad(min)}′${pad(sec)}″ ${v >= 0 ? pos : neg}`;
  };
  return `${part(c.lat, 'N', 'S')} · ${part(c.lng, 'E', 'W')}`;
}
