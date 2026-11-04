import { useState } from 'react';
import type { ImageSource } from '../../config/wedding';

const PORTRAIT = '(max-aspect-ratio: 4/5)';

/**
 * Фото с вертикальной версией для телефона. Если файла нет — остаётся фактурный блок, композиция не ломается.
 * Если задана ч/б версия, цветной кадр лежит сверху в .photo__colour: сцена меняет только его прозрачность.
 */
export function Photo({ image, className = '' }: { image: ImageSource | undefined | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  const missing = !image?.src || failed;
  if (missing || !image) return <div className={`photo photo--missing ${className}`} />;
  const colour = (
    <picture>
      {image.srcPortrait && <source media={PORTRAIT} srcSet={image.srcPortrait} />}
      <img src={image.src!} alt={image.alt} decoding="async" draggable={false} onError={() => setFailed(true)} />
    </picture>
  );
  if (!image.mono) return <div className={`photo ${className}`}>{colour}</div>;
  return (
    <div className={`photo ${className}`}>
      <picture>
        {image.monoPortrait && <source media={PORTRAIT} srcSet={image.monoPortrait} />}
        <img src={image.mono} alt="" decoding="async" draggable={false} />
      </picture>
      <div className="photo__colour">{colour}</div>
    </div>
  );
}
