// Hero images any site can use behind the top of its landing page, suggested by
// campaign template. A site stores only the chosen URL; alt text lives here per
// public UI language.

export interface HeroImage {
  url: string
  templates: readonly string[]
  alt: Readonly<Record<string, string>>
}

const RAMADAN = 'https://s3.prayer.tools/ramadan/'

export const HERO_IMAGES: readonly HeroImage[] = [
  {
    url: `${RAMADAN}muslim-city-stencil-skyline-black-and-while-outline.webp`,
    templates: ['ramadan'],
    alt: {
      en: 'Skyline of domes and minarets reflected in a lake',
      es: 'Silueta de cúpulas y minaretes reflejada en un lago',
      fr: 'Silhouette de coupoles et de minarets reflétée dans un lac',
      pt: 'Silhueta de cúpulas e minaretes refletida num lago',
      ar: 'أفق من القباب والمآذن ينعكس على بحيرة'
    }
  },
  {
    url: `${RAMADAN}mecca-stencil-skyline-black-and-while-outline.webp`,
    templates: ['ramadan'],
    alt: {
      en: 'City skyline with minarets and towers before a large white sun, reflected in water',
      es: 'Silueta de una ciudad con minaretes y torres ante un gran sol blanco, reflejada en el agua',
      fr: 'Ligne d’horizon d’une ville avec minarets et tours devant un grand soleil blanc, reflétée dans l’eau',
      pt: 'Silhueta de uma cidade com minaretes e torres diante de um grande sol branco, refletida na água',
      ar: 'أفق مدينة بمآذن وأبراج أمام شمس بيضاء كبيرة ينعكس على الماء'
    }
  },
  {
    url: `${RAMADAN}muslim-city-stencil-black-and-white-outline.webp`,
    templates: ['ramadan'],
    alt: {
      en: 'A row of domed mosques and minarets reflected in calm water',
      es: 'Una hilera de mezquitas con cúpulas y minaretes reflejados en aguas tranquilas',
      fr: 'Une rangée de mosquées à coupoles et de minarets reflétés dans une eau calme',
      pt: 'Uma fileira de mesquitas com cúpulas e minaretes refletidos em águas calmas',
      ar: 'صف من المساجد ذات القباب والمآذن ينعكس على مياه هادئة'
    }
  },
  {
    url: `${RAMADAN}arab-city-stencil-skyline-black-and-while-mosque-png.webp`,
    templates: ['ramadan'],
    alt: {
      en: 'Silhouette of a city skyline with mosque domes and minarets, reflected in water',
      es: 'Silueta de una ciudad con cúpulas de mezquitas y minaretes, reflejada en el agua',
      fr: 'Silhouette d’une ville aux coupoles de mosquées et aux minarets, reflétée dans l’eau',
      pt: 'Silhueta de uma cidade com cúpulas de mesquitas e minaretes, refletida na água',
      ar: 'صورة ظلية لمدينة بقباب المساجد والمآذن تنعكس على الماء'
    }
  },
  {
    url: `${RAMADAN}muslim-city-stencil-skyline-black-and-while-outline-c.webp`,
    templates: ['ramadan'],
    alt: {
      en: 'Black-and-white skyline of mosques with domes and tall minarets',
      es: 'Silueta en blanco y negro de mezquitas con cúpulas y altos minaretes',
      fr: 'Silhouette en noir et blanc de mosquées aux coupoles et aux hauts minarets',
      pt: 'Silhueta em preto e branco de mesquitas com cúpulas e minaretes altos',
      ar: 'أفق بالأبيض والأسود لمساجد ذات قباب ومآذن عالية'
    }
  },
  {
    url: `${RAMADAN}muslim-city-stencil-skyline-black-and-white-outline-5.webp`,
    templates: ['ramadan'],
    alt: {
      en: 'Mosques with white domes and minarets under a pale sun',
      es: 'Mezquitas con cúpulas blancas y minaretes bajo un sol pálido',
      fr: 'Mosquées aux coupoles blanches et minarets sous un soleil pâle',
      pt: 'Mesquitas com cúpulas brancas e minaretes sob um sol pálido',
      ar: 'مساجد بقباب بيضاء ومآذن تحت شمس شاحبة'
    }
  },
  {
    url: `${RAMADAN}stencil-skyline-black-and-while-outline.webp`,
    templates: ['ramadan'],
    alt: {
      en: 'City skyline with mosque domes and minarets under a cloudy sky',
      es: 'Silueta de una ciudad con cúpulas de mezquitas y minaretes bajo un cielo nublado',
      fr: 'Ligne d’horizon d’une ville avec coupoles de mosquées et minarets sous un ciel nuageux',
      pt: 'Silhueta de uma cidade com cúpulas de mesquitas e minaretes sob um céu nublado',
      ar: 'أفق مدينة بقباب المساجد والمآذن تحت سماء غائمة'
    }
  },
  {
    url: `${RAMADAN}ramadan-city.webp`,
    templates: ['ramadan'],
    alt: {
      en: 'Ink drawing of a city of mosques with domes, minarets and Arabic calligraphy',
      es: 'Dibujo a tinta de una ciudad de mezquitas con cúpulas, minaretes y caligrafía árabe',
      fr: 'Dessin à l’encre d’une ville de mosquées avec coupoles, minarets et calligraphie arabe',
      pt: 'Desenho a tinta de uma cidade de mesquitas com cúpulas, minaretes e caligrafia árabe',
      ar: 'رسم بالحبر لمدينة من المساجد بقبابها ومآذنها وخط عربي'
    }
  },
  {
    url: `${RAMADAN}city-stencil-skyline-black-and-while-outline-29.webp`,
    templates: ['ramadan'],
    alt: {
      en: 'Long, low city skyline with towers and domes reflected in still water',
      es: 'Una larga silueta urbana con torres y cúpulas reflejadas en aguas tranquilas',
      fr: 'Une longue ligne d’horizon avec tours et coupoles, reflétée dans une eau calme',
      pt: 'Uma longa silhueta urbana com torres e cúpulas refletidas em águas calmas',
      ar: 'أفق مدينة ممتد بأبراج وقباب ينعكس على مياه ساكنة'
    }
  },
  {
    url: `${RAMADAN}city-stencil-skyline-black-and-while-outline.webp`,
    templates: ['ramadan'],
    alt: {
      en: 'City silhouette with domed buildings and towers under a sky with birds',
      es: 'Silueta de una ciudad con edificios de cúpula y torres bajo un cielo con aves',
      fr: 'Silhouette d’une ville aux bâtiments à coupole et aux tours, sous un ciel où volent des oiseaux',
      pt: 'Silhueta de uma cidade com edifícios de cúpula e torres sob um céu com pássaros',
      ar: 'صورة ظلية لمدينة بمبانٍ ذات قباب وأبراج تحت سماء تحلق فيها الطيور'
    }
  },
  {
    url: `${RAMADAN}d664d27a-e336-48aa-b911-13e8d0999bf4.webp`,
    templates: ['ramadan'],
    alt: {
      en: 'Camels and palm trees before a distant domed city under a large sun',
      es: 'Camellos y palmeras ante una ciudad lejana con cúpulas bajo un gran sol',
      fr: 'Chameaux et palmiers devant une ville lointaine aux coupoles, sous un grand soleil',
      pt: 'Camelos e palmeiras diante de uma cidade distante com cúpulas sob um grande sol',
      ar: 'جمال ونخيل أمام مدينة بعيدة ذات قباب تحت شمس كبيرة'
    }
  },
  {
    url: `${RAMADAN}sahara-stencil-skyline-black-and-while-outline-camels.webp`,
    templates: ['ramadan'],
    alt: {
      en: 'Camels and palm trees in the desert with a domed city on the horizon',
      es: 'Camellos y palmeras en el desierto con una ciudad de cúpulas en el horizonte',
      fr: 'Chameaux et palmiers dans le désert, avec une ville à coupoles à l’horizon',
      pt: 'Camelos e palmeiras no deserto com uma cidade de cúpulas no horizonte',
      ar: 'جمال ونخيل في الصحراء ومدينة ذات قباب في الأفق'
    }
  },
  {
    url: `${RAMADAN}sahara-desert-stencil-skyline-black-and-while-outline.webp`,
    templates: ['ramadan'],
    alt: {
      en: 'A caravan of camels crossing the desert at sunset, reflected in water',
      es: 'Una caravana de camellos cruza el desierto al atardecer, reflejada en el agua',
      fr: 'Une caravane de chameaux traverse le désert au coucher du soleil, reflétée dans l’eau',
      pt: 'Uma caravana de camelos atravessa o deserto ao pôr do sol, refletida na água',
      ar: 'قافلة جمال تعبر الصحراء عند الغروب وتنعكس على الماء'
    }
  },
  {
    url: `${RAMADAN}desert-stencil-skyline-black-and-while-outline-camels.webp`,
    templates: ['ramadan'],
    alt: {
      en: 'Camels walking past an acacia tree in the desert at sunset',
      es: 'Camellos que caminan junto a una acacia en el desierto al atardecer',
      fr: 'Des chameaux passent près d’un acacia dans le désert au coucher du soleil',
      pt: 'Camelos caminhando junto a uma acácia no deserto ao pôr do sol',
      ar: 'جمال تسير بجانب شجرة أكاسيا في الصحراء عند الغروب'
    }
  },
  {
    url: `${RAMADAN}sahara-stencil-skyline-black-and-while-outline-camel.webp`,
    templates: ['ramadan'],
    alt: {
      en: 'Two camels standing on desert dunes with mountains behind',
      es: 'Dos camellos sobre dunas del desierto con montañas detrás',
      fr: 'Deux chameaux sur des dunes du désert, avec des montagnes derrière',
      pt: 'Dois camelos sobre dunas do deserto com montanhas atrás',
      ar: 'جملان يقفان على كثبان الصحراء وخلفهما الجبال'
    }
  },
  {
    url: `${RAMADAN}nomads-desert-stencil-skyline-black-and-white-outline.webp`,
    templates: ['ramadan'],
    alt: {
      en: 'Nomad tents and a palm tree in the desert with mountains in the distance',
      es: 'Tiendas nómadas y una palmera en el desierto con montañas a lo lejos',
      fr: 'Tentes de nomades et un palmier dans le désert, avec des montagnes au loin',
      pt: 'Tendas nômades e uma palmeira no deserto com montanhas ao longe',
      ar: 'خيام البدو ونخلة في الصحراء وجبال في الأفق'
    }
  },
  {
    url: `${RAMADAN}village-in-the-desert-stencil-black-and-white-outline.webp`,
    templates: ['ramadan'],
    alt: {
      en: 'Flat-roofed houses and palm trees in a desert village below a mountain',
      es: 'Casas de techo plano y palmeras en una aldea del desierto al pie de una montaña',
      fr: 'Maisons à toit plat et palmiers dans un village du désert, au pied d’une montagne',
      pt: 'Casas de telhado plano e palmeiras numa aldeia do deserto ao pé de uma montanha',
      ar: 'بيوت ذات أسطح مستوية ونخيل في قرية صحراوية عند سفح جبل'
    }
  },
  {
    url: `${RAMADAN}village-in-the-desert-stencil-black-and-white-outline2.webp`,
    templates: ['ramadan'],
    alt: {
      en: 'White houses of a desert village with mountains and clouds behind',
      es: 'Casas blancas de una aldea del desierto con montañas y nubes detrás',
      fr: 'Maisons blanches d’un village du désert, avec des montagnes et des nuages derrière',
      pt: 'Casas brancas de uma aldeia do deserto com montanhas e nuvens atrás',
      ar: 'بيوت بيضاء في قرية صحراوية وخلفها الجبال والغيوم'
    }
  },
  {
    url: `${RAMADAN}desert-river-stencil-black-and-white-outline-e820bf.webp`,
    templates: ['ramadan'],
    alt: {
      en: 'Black-and-white drawing of a river winding through the desert between palms and mountains',
      es: 'Dibujo en blanco y negro de un río que serpentea por el desierto entre palmeras y montañas',
      fr: 'Dessin en noir et blanc d’une rivière serpentant dans le désert entre palmiers et montagnes',
      pt: 'Desenho em preto e branco de um rio que serpenteia pelo deserto entre palmeiras e montanhas',
      ar: 'رسم بالأبيض والأسود لنهر يتعرج عبر الصحراء بين النخيل والجبال'
    }
  },
  {
    url: `${RAMADAN}prayer-in-the-desert-stencil-black-and-white-outline.webp`,
    templates: ['ramadan'],
    alt: {
      en: 'A person in a hooded robe kneeling in prayer in the desert',
      es: 'Una persona con túnica y capucha arrodillada en oración en el desierto',
      fr: 'Une personne en robe à capuche, agenouillée en prière dans le désert',
      pt: 'Uma pessoa de túnica com capuz ajoelhada em oração no deserto',
      ar: 'شخص يرتدي عباءة بقلنسوة راكعًا في الصلاة في الصحراء'
    }
  },
  {
    url: `${RAMADAN}prayer-in-the-desert-stencil-black-and-white-outline2.webp`,
    templates: ['ramadan'],
    alt: {
      en: 'A person sitting in prayer before the sun among desert dunes and palms',
      es: 'Una persona sentada en oración ante el sol, entre dunas y palmeras',
      fr: 'Une personne assise en prière face au soleil, parmi les dunes et les palmiers',
      pt: 'Uma pessoa sentada em oração diante do sol, entre dunas e palmeiras',
      ar: 'شخص جالس في الصلاة أمام الشمس بين الكثبان والنخيل'
    }
  },
  {
    url: `${RAMADAN}prayer-in-the-desert-stencil-black-and-white-outline3.webp`,
    templates: ['ramadan'],
    alt: {
      en: 'A person standing with head bowed in prayer beside desert mountains',
      es: 'Una persona de pie con la cabeza inclinada en oración junto a montañas del desierto',
      fr: 'Une personne debout, tête inclinée en prière, près des montagnes du désert',
      pt: 'Uma pessoa de pé com a cabeça inclinada em oração junto às montanhas do deserto',
      ar: 'شخص واقف مطأطئ الرأس في الصلاة بجانب جبال الصحراء'
    }
  },
  {
    url: `${RAMADAN}arab-city-stencil-skyline-black-and-while-mosque-png2.webp`,
    templates: ['ramadan'],
    alt: {
      en: 'Black-and-white drawing of a crowded city of tall buildings',
      es: 'Dibujo en blanco y negro de una ciudad abarrotada de edificios altos',
      fr: 'Dessin en noir et blanc d’une ville dense aux immeubles élevés',
      pt: 'Desenho em preto e branco de uma cidade densa de prédios altos',
      ar: 'رسم بالأبيض والأسود لمدينة مكتظة بالمباني الشاهقة'
    }
  }
]

export function heroImage(url: string | null | undefined): HeroImage | undefined {
  return url ? HERO_IMAGES.find(i => i.url === url) : undefined
}

export function heroImagesFor(templateKey: string | null | undefined): HeroImage[] {
  return HERO_IMAGES.filter(i => !!templateKey && i.templates.includes(templateKey))
}

export function heroAlt(image: HeroImage, lang: string): string {
  return image.alt[lang] ?? image.alt.en ?? ''
}
