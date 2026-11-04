/** Сургучная печать из пяти осколков. Целая печать — это просто осколки на своих местах. */
const SHARDS = [
  '0,0 120,0 120,22 62,58 34,0',
  '120,22 120,92 86,120 74,74 62,58',
  '86,120 30,120 48,82 62,58 74,74',
  '30,120 0,120 0,50 26,62 48,82',
  '0,0 34,0 62,58 48,82 26,62 0,50',
];

export function Seal({ letter }: { letter: string }) {
  return (
    <svg className="seal" viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <radialGradient id="wax" cx="38%" cy="30%" r="78%">
          <stop offset="0" stopColor="#E2C89E" />
          <stop offset="0.42" stopColor="#C6A77B" />
          <stop offset="0.85" stopColor="#8A6E4A" />
          <stop offset="1" stopColor="#6B5336" />
        </radialGradient>
        <g id="seal-art">
          <path
            d="M60 5c9 0 13 5 21 7s15 4 20 11 3 13 7 21 6 13 4 22-9 12-12 20-3 15-11 19-13 1-22 4-14 7-23 4-11-9-19-13-15-6-18-15 1-14-1-23-6-15-2-23 11-11 15-18 7-13 16-15 15-1 25-1Z"
            fill="url(#wax)"
          />
          <circle cx="60" cy="60" r="35" fill="none" stroke="#6B5336" strokeOpacity=".65" strokeWidth="1.4" />
          <circle cx="60" cy="60" r="33.4" fill="none" stroke="#F0DDBC" strokeOpacity=".5" strokeWidth=".8" />
          <text x="60" y="73" textAnchor="middle" fontFamily="Cormorant, serif" fontSize="38" fontWeight="500" fill="#5E4830" fillOpacity=".92">{letter}</text>
          <text x="60" y="72.2" textAnchor="middle" fontFamily="Cormorant, serif" fontSize="38" fontWeight="500" fill="#EFDDBE" fillOpacity=".28">{letter}</text>
        </g>
        {SHARDS.map((p, i) => (
          <clipPath id={`shard-${i}`} key={p}><polygon points={p} /></clipPath>
        ))}
      </defs>
      {SHARDS.map((p, i) => (
        <g className="seal__shard" key={p}>
          <g clipPath={`url(#shard-${i})`}><use href="#seal-art" /></g>
        </g>
      ))}
      <ellipse className="seal__gloss" cx="42" cy="36" rx="26" ry="11" transform="rotate(-28 42 36)" fill="#FFF3DC" />
      {[[58, 56], [70, 62], [50, 68], [64, 48], [76, 54], [46, 54]].map(([x, y], i) => (
        <circle className="seal__crumb" cx={x} cy={y} r={0.9 + (i % 3) * 0.5} fill="#B0926A" key={i} />
      ))}
      <path className="seal__crack" d="M62 58 L34 0 M62 58 L120 22 M62 58 L74 74 L86 120 M62 58 L48 82 L30 120 M48 82 L26 62 L0 50"
        fill="none" stroke="#2A1F12" strokeWidth="1" pathLength={1} />
    </svg>
  );
}
