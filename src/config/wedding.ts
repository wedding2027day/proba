/**
 * ЕДИНЫЙ ФАЙЛ КОНТЕНТА.
 * Меняйте значения здесь — код анимаций трогать не нужно.
 *
 * ⚠ Сейчас здесь ДЕМОНСТРАЦИОННЫЕ данные: имена, дата и расписание временные,
 * площадка не задана, на фотографиях — стоковые модели (источники: public/assets/CREDITS.md).
 * Когда всё заменено на настоящее, поставьте isDemo: false.
 */

export type ImageSource = {
  /** Путь внутри public/, например /assets/images/story/left.webp. null — композиция сохранится без фото. */
  src: string | null;
  /** Необязательная вертикальная версия для телефона. */
  srcPortrait?: string;
  /** Необязательная ч/б версия того же кадра: сцена плавно переходит из неё в цвет. */
  mono?: string;
  monoPortrait?: string;
  alt: string;
};

export type TimelineKind = 'gather' | 'ceremony' | 'dinner' | 'dance' | 'party';

export type TimelineItem = {
  time: string;
  title: string;
  /** Какая микроанимация используется для этого этапа. */
  kind: TimelineKind;
  note?: string;
  image?: ImageSource;
};

export type PaletteColor = { name: string; hex: string; ink: string };

export const wedding = {
  /** Показывает в подвале пометку, что данные демонстрационные. */
  isDemo: true,

  couple: {
    partnerOne: 'Александр',
    partnerTwo: 'Анастасия',
    /** Союз между именами. */
    joiner: 'и',
    subtitle: 'Некоторые истории начинаются случайно. Наша — навсегда.',
  },

  event: {
    /** Дата и время начала: год-месяц-день. */
    date: '2027-06-20',
    startTime: '15:00',
    endTime: '23:30',
    /** Смещение часового пояса площадки. Москва: +03:00. */
    utcOffset: '+03:00',
    title: 'Свадьба Александра и Анастасии',
    dateCaption: 'День, когда начнётся наша новая глава',
  },

  invitation: {
    prompt: 'Для вас есть приглашение',
    openLabel: 'Открыть',
  },

  timeline: {
    heading: 'Расписание дня',
    items: [
      { time: '15:00', title: 'Сбор гостей', kind: 'gather' },
      { time: '16:00', title: 'Церемония', kind: 'ceremony' },
      {
        time: '17:00',
        title: 'Праздничный ужин',
        kind: 'dinner',
        image: { src: '/assets/images/timeline/dinner.webp', mono: '/assets/images/timeline/dinner-mono.webp', alt: 'Накрытый стол со свечами (демонстрационное фото)' },
      },
      {
        time: '19:00',
        title: 'Первый танец',
        kind: 'dance',
        image: { src: '/assets/images/timeline/dance.webp', alt: 'Пара танцует (демонстрационное фото)' },
      },
      {
        time: '21:00',
        title: 'Вечеринка',
        kind: 'party',
        image: { src: '/assets/images/timeline/party.webp', alt: 'Гости с бенгальскими огнями (демонстрационное фото)' },
      },
    ] as TimelineItem[],
  },

  location: {
    /** Пока адрес не задан, кнопка маршрута не показывается — случайная площадка не подставляется. */
    name: 'Название площадки',
    address: '',
    /** Например: { lat: 55.7558, lng: 37.6173 } */
    coordinates: null as { lat: number; lng: number } | null,
    startsAt: 'Начало в 15:00',
    details: 'Подробности о месте появятся здесь',
    /** Какая карта откроется по кнопке: 'yandex' или 'google'. */
    mapProvider: 'yandex' as 'yandex' | 'google',
    routeLabel: 'Построить маршрут',
    addressPending: 'Адрес появится позже',
    image: {
      src: '/assets/images/location/venue.webp',
      srcPortrait: '/assets/images/location/venue-portrait.webp',
      mono: '/assets/images/location/venue-mono.webp',
      monoPortrait: '/assets/images/location/venue-mono-portrait.webp',
      alt: 'Зал с люстрами и арками (демонстрационное фото)',
    } as ImageSource,
  },

  dressCode: {
    heading: 'Ваш образ — часть нашей истории',
    caption: 'Мы будем рады, если вы поддержите цветовую палитру нашего праздника',
    palette: [
      { name: 'Champagne', hex: '#C6A77B', ink: '#0B0B0B' },
      { name: 'Ivory', hex: '#F4F0E9', ink: '#0B0B0B' },
      { name: 'Taupe', hex: '#8E8071', ink: '#F4F0E9' },
      { name: 'Mocha', hex: '#5A4638', ink: '#F4F0E9' },
      { name: 'Graphite', hex: '#242424', ink: '#F4F0E9' },
    ] as PaletteColor[],
    lookbookLabel: 'Рекомендации по образам',
    lookbook: [
      {
        title: 'Для неё',
        text: 'Платья в длину миди или макси из струящихся тканей, в оттенках палитры.',
        image: { src: '/assets/images/dresscode/look-women.webp', alt: 'Девушка в длинном атласном платье (демонстрационное фото)' } as ImageSource,
      },
      {
        title: 'Для него',
        text: 'Костюм графитового или тёмно-коричневого цвета, светлая рубашка.',
        image: { src: '/assets/images/dresscode/look-men.webp', alt: 'Мужчина в тёмном костюме (демонстрационное фото)' } as ImageSource,
      },
    ],
  },

  story: {
    /**
     * Левая и правая половины ОДНОГО кадра: при сборке они стыкуются в целую фотографию.
     * src — половина фото. plate — та же половина без людей. cutout — только люди на прозрачном фоне.
     * Порядок слоёв: plate → имена → cutout. Все три создаёт scripts/prepare-photos.py.
     * Если plate и cutout не заданы, показывается src, а имена идут поверх фото.
     */
    left: {
      src: '/assets/images/story/left.webp',
      srcPortrait: '/assets/images/story/left-portrait.webp',
      plate: '/assets/images/story/left-plate.webp' as string | null,
      platePortrait: '/assets/images/story/left-plate-portrait.webp',
      cutout: '/assets/images/story/left-cutout.webp' as string | null,
      cutoutPortrait: '/assets/images/story/left-cutout-portrait.webp',
      alt: 'Невеста под развевающейся фатой (демонстрационное фото)',
    },
    right: {
      src: '/assets/images/story/right.webp',
      srcPortrait: '/assets/images/story/right-portrait.webp',
      plate: '/assets/images/story/right-plate.webp' as string | null,
      platePortrait: '/assets/images/story/right-plate-portrait.webp',
      cutout: '/assets/images/story/right-cutout.webp' as string | null,
      cutoutPortrait: '/assets/images/story/right-cutout-portrait.webp',
      alt: 'Жених склоняется к невесте (демонстрационное фото)',
    },
  },

  datePhoto: {
    src: '/assets/images/date/couple.webp',
    srcPortrait: '/assets/images/date/couple-portrait.webp',
    alt: 'Руки жениха и невесты (демонстрационное фото)',
  } as ImageSource,

  rsvp: {
    heading: 'Эта история будет неполной без вас',
    subheading: 'Пожалуйста, сообщите нам о своём решении',
    submitLabel: 'Отправить ответ',
    /** Фон финального заголовка: последний кадр истории. */
    closingImage: {
      src: '/assets/images/final/closing.webp',
      srcPortrait: '/assets/images/final/closing-portrait.webp',
      alt: '',
    } as ImageSource,
    /** Подсказка для интерфейса. Окончательную проверку делает сервер (RSVP_DEFAULT_MAX_GUESTS). */
    maxGuests: 2,
    thanksComing: (name: string) => `Спасибо, ${name}! До встречи в наш особенный день.`,
    thanksDeclined: (name: string) => `Спасибо за ответ, ${name}. Будем мысленно рядом.`,
  },

  music: {
    enabled: true,
    /**
     * Путь к лицензированному треку в public/assets/audio.
     * null — играет оригинальный эмбиент, который синтезируется прямо в браузере (без авторских прав).
     */
    src: null as string | null,
    volume: 0.5,
  },
};

export type WeddingConfig = typeof wedding;
