import { useState } from 'react';
import { wedding } from '../../config/wedding';
import { Photo } from '../../components/Photo/Photo';
import './OurStory.css';

type Side = typeof wedding.story.left;

/** Слой людей поверх имён. Если файл не загрузился, сцена вернётся к целому фото. */
function Cutout({ side, onFail }: { side: Side; onFail: () => void }) {
  return (
    <picture>
      {side.cutoutPortrait && <source media="(max-aspect-ratio: 4/5)" srcSet={side.cutoutPortrait} />}
      <img src={side.cutout!} alt="" decoding="async" draggable={false} onError={onFail} />
    </picture>
  );
}

/** Буквы отдельно: у каждой своя траектория. Для чтения с экрана имя остаётся цельным. */
function Letters({ text, className }: { text: string; className: string }) {
  return (
    <span className={className} aria-label={text}>
      {[...text].map((c, i) => <i className="story__char" aria-hidden="true" key={`${c}${i}`}>{c}</i>)}
    </span>
  );
}

/**
 * Порядок слоёв: подложка без людей → гигантские имена → люди.
 * При разной скорости слоёв за людьми не остаётся их «двойника».
 */
export function OurStory({ layered }: { layered: boolean }) {
  const { couple, story } = wedding;
  const [failed, setFailed] = useState(false);
  const useLayers = layered && !failed && Boolean(story.left.plate && story.left.cutout && story.right.plate && story.right.cutout);
  const base = (s: Side) =>
    useLayers ? { src: s.plate, srcPortrait: s.platePortrait, alt: s.alt } : { src: s.src, srcPortrait: s.srcPortrait, alt: s.alt };

  return (
    <section className="scene story" id="chapter-story" aria-labelledby="names">
      <div className="story__paper" />
      <div className="story__night" />
      <div className="story__depth">
        <div className="story__frame story__frame--l story__frame--shadow"><div className="story__shadow" /></div>
        <div className="story__frame story__frame--r story__frame--shadow"><div className="story__shadow" /></div>
        <div className="story__frame story__frame--l story__frame--plate">
          <Photo image={base(story.left)} /><div className="story__dim" />
        </div>
        <div className="story__frame story__frame--r story__frame--plate">
          <Photo image={base(story.right)} /><div className="story__dim" />
        </div>
        <h1 className="story__names" id="names">
          <Letters className="story__name story__name--a" text={couple.partnerOne} />
          <span className="story__joiner">{couple.joiner}</span>
          <Letters className="story__name story__name--b" text={couple.partnerTwo} />
        </h1>
        {useLayers && (
          <div className="story__people">
            <div className="story__frame story__frame--l story__frame--cut"><Cutout side={story.left} onFail={() => setFailed(true)} /></div>
            <div className="story__frame story__frame--r story__frame--cut"><Cutout side={story.right} onFail={() => setFailed(true)} /></div>
          </div>
        )}
        <div className="story__floor" />
      </div>
      <div className="scene__safe story__safe">
        <p className="story__sign" aria-hidden="true">
          {couple.partnerOne} <i>{couple.joiner}</i> {couple.partnerTwo}
        </p>
        <p className="story__subtitle"><span>{couple.subtitle}</span></p>
      </div>
    </section>
  );
}
