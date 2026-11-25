/*
 * Protocolo de rehabilitación tras reconstrucción de LCA + cirugía de menisco.
 *
 * Basado en las pautas generales más usadas (progresión por fases, guiada por
 * criterios y no solo por tiempo). NO sustituye la pauta de tu cirujano ni de tu
 * fisioterapeuta: ellos conocen los detalles de tu operación. Todo lo que hay
 * aquí se puede ajustar desde la app (fase manual, ocultar ejercicios, añadir
 * los de tu fisio).
 */
(function () {
  'use strict';

  var PHASES = [
    {
      id: 1,
      short: 'Protección',
      title: 'Protección y control de la inflamación',
      range: 'Semanas 0–2',
      startDay: 0,
      flexTarget: 90,
      goals: [
        'Controlar el dolor y la hinchazón: hielo, elevación y compresión.',
        'Conseguir la extensión completa (rodilla totalmente recta). Es la prioridad número 1.',
        'Volver a activar el cuádriceps: contraerlo bien y elevar la pierna recta.',
        'Llegar a unos 90° de flexión.',
        'Moverte con seguridad con muletas o andador, como te indiquen.'
      ],
      criteria: [
        { id: 'p1-ext', text: 'Extensión completa o casi (déficit de 0–5°) en ambas rodillas' },
        { id: 'p1-flex', text: 'Flexión de al menos 90°' },
        { id: 'p1-slr', text: 'Elevas la pierna recta sin que la rodilla se doble' },
        { id: 'p1-wound', text: 'Herida cerrada, sin signos de infección, hinchazón controlada' }
      ]
    },
    {
      id: 2,
      short: 'Movilidad y marcha',
      title: 'Movilidad y marcha',
      range: 'Semanas 2–6',
      startDay: 14,
      flexTarget: 120,
      goals: [
        'Caminar sin cojear y dejar las muletas cuando te lo autoricen.',
        'Llegar a unos 120° de flexión.',
        'Mantener la extensión completa en las dos rodillas.',
        'Fortalecer cuádriceps, glúteos y gemelos con ejercicios de pie (cadena cerrada).',
        'Empezar a trabajar el equilibrio.'
      ],
      criteria: [
        { id: 'p2-gait', text: 'Caminas sin muletas y sin cojear' },
        { id: 'p2-flex', text: 'Flexión de al menos 120°' },
        { id: 'p2-ext', text: 'Extensión completa en ambas rodillas' },
        { id: 'p2-swell', text: 'La rodilla no se hincha más después de los ejercicios' },
        { id: 'p2-stairs', text: 'Subes escaleras alternando los pies' }
      ]
    },
    {
      id: 3,
      short: 'Fortalecimiento',
      title: 'Fortalecimiento',
      range: 'Semanas 6–12',
      startDay: 42,
      flexTarget: 130,
      goals: [
        'Ganar fuerza de forma progresiva (sentadillas, escalones, puente).',
        'Flexión casi completa.',
        'Controlar la rodilla: que no se vaya hacia dentro al bajar.',
        'Mejorar el equilibrio y la propiocepción.',
        'Bicicleta con resistencia para la resistencia cardiovascular.'
      ],
      criteria: [
        { id: 'p3-flex', text: 'Flexión casi completa (130° o más)' },
        { id: 'p3-squat', text: 'Sentadilla a 90° sin dolor y con buena técnica' },
        { id: 'p3-balance', text: 'Aguantas 30 s sobre una pierna con buen control' },
        { id: 'p3-stepdown', text: 'Bajas un escalón despacio sin que la rodilla se vaya hacia dentro' },
        { id: 'p3-swell', text: 'Sin hinchazón después de entrenar' }
      ]
    },
    {
      id: 4,
      short: 'Fuerza y carrera',
      title: 'Fuerza avanzada e inicio de carrera',
      range: 'Meses 3–6',
      startDay: 84,
      flexTarget: 135,
      goals: [
        'Fuerza a una pierna (zancadas, sentadilla búlgara, sentadilla a una pierna).',
        'Empezar a correr de forma progresiva cuando cumplas los criterios.',
        'Saltos con las dos piernas aterrizando de forma controlada.',
        'Mejorar la resistencia cardiovascular.'
      ],
      criteria: [
        { id: 'p4-run', text: 'Corres 20–30 min sin dolor ni hinchazón al día siguiente' },
        { id: 'p4-strength', text: 'Tu fisio ha medido tu fuerza de cuádriceps y es suficiente' },
        { id: 'p4-land', text: 'Aterrizas de los saltos con buena técnica' },
        { id: 'p4-ok', text: 'Tu fisio o cirujano te autoriza a empezar la fase deportiva' }
      ]
    },
    {
      id: 5,
      short: 'Retorno al deporte',
      title: 'Retorno al deporte',
      range: 'Meses 6–9 y más',
      startDay: 168,
      flexTarget: 135,
      goals: [
        'Saltos a una pierna (pliometría).',
        'Cambios de dirección, agilidad y velocidad.',
        'Entrenamiento específico de tu deporte, de menos a más contacto.',
        'Un programa de prevención de lesiones para siempre.',
        'Recuperar la confianza en tus rodillas.'
      ],
      criteria: [
        { id: 'p5-time', text: 'Han pasado al menos 9 meses desde la cirugía (volver antes aumenta mucho el riesgo de una nueva rotura)' },
        { id: 'p5-tests', text: 'Superas los tests de fuerza y salto de tu fisio' },
        { id: 'p5-mind', text: 'Te sientes seguro/a y con confianza en tus rodillas' },
        { id: 'p5-team', text: 'Entrenas completo con tu equipo sin molestias' },
        { id: 'p5-ok', text: 'Tienes el alta deportiva de tu cirujano y fisio' }
      ]
    }
  ];

  /*
   * Ejercicios.
   *  phases       fases en las que aparece
   *  perDay       veces al día (cada toque en la app cuenta una)
   *  optional     no cuenta para el % del día (días alternos, depende de autorización…)
   *  timer        { work, rest, reps } en segundos para el temporizador guiado
   *  gate         días mínimos desde la cirugía:
   *                 minDay        para todos
   *                 repairMinDay  si hay sutura de menisco
   *                 hamstringMinDay si el injerto es de isquiotibiales
   *  notes        avisos según tu cirugía: repair (sutura menisco), hamstring, btb
   */
  var EXERCISES = [
    // ───────────── Fase 1–2 ─────────────
    {
      id: 'hielo',
      name: 'Hielo, elevación y compresión',
      cat: 'cuidado',
      phases: [1, 2],
      perDay: 3,
      dose: '15–20 min, 3–4 veces al día y después de ejercitarte',
      timer: { work: 1200 },
      why: 'Reduce el dolor y la hinchazón. La hinchazón "apaga" el cuádriceps, así que controlarla te ayuda a ganar fuerza.',
      how: [
        'Túmbate con las piernas elevadas por encima del corazón: el cojín va bajo el talón y la pantorrilla, nunca bajo la rodilla.',
        'Hielo envuelto en una toalla fina o tu máquina de crioterapia.',
        '15–20 minutos. Nunca pongas el hielo directo sobre la piel ni sobre apósitos mojados.'
      ]
    },
    {
      id: 'tobillos',
      name: 'Bombeo de tobillos',
      cat: 'cuidado',
      phases: [1, 2],
      perDay: 4,
      dose: '20 repeticiones cada 1–2 horas mientras estés despierto/a',
      why: 'Mueve la sangre de las piernas y ayuda a prevenir trombos. Con las dos piernas operadas te mueves menos, así que es aún más importante.',
      how: [
        'Tumbado/a o sentado/a con las piernas estiradas.',
        'Lleva las puntas de los pies hacia ti y luego hacia abajo, como si pisaras un pedal.',
        'Ritmo constante, con las dos piernas a la vez.'
      ]
    },
    {
      id: 'cuadriceps-iso',
      name: 'Contracción de cuádriceps',
      cat: 'fuerza',
      phases: [1, 2],
      perDay: 3,
      dose: '10 repeticiones de 10 s, 3 veces al día (cada pierna)',
      timer: { work: 10, rest: 5, reps: 10 },
      why: 'Tras la cirugía el cuádriceps se "desconecta". Reactivarlo es la base para caminar bien y proteger el injerto.',
      how: [
        'Sentado/a o tumbado/a con la pierna estirada.',
        'Aprieta el muslo empujando la parte de atrás de la rodilla hacia la cama: verás que la rótula sube.',
        'Mantén 10 segundos, relaja 5. Pon tu mano bajo la rodilla para notar que empujas.'
      ]
    },
    {
      id: 'extension-pasiva',
      name: 'Extensión pasiva con talón elevado',
      cat: 'movilidad',
      phases: [1, 2],
      perDay: 3,
      dose: '10 min, 3–4 veces al día (puedes hacer las dos piernas a la vez)',
      timer: { work: 600 },
      why: 'Recuperar pronto la extensión completa es lo más importante: si se pierde cuesta mucho recuperarla y te hará cojear.',
      how: [
        'Apoya el talón sobre una toalla enrollada o un cojín, de modo que la rodilla quede "en el aire".',
        'Relaja el muslo y deja que la gravedad estire la rodilla. Es normal notar tirantez.',
        'Mientras tanto puedes hacer contracciones de cuádriceps.',
        'Si tu fisio lo indica, añade un peso ligero sobre el muslo (nunca sobre la rótula).'
      ]
    },
    {
      id: 'rotula',
      name: 'Movilización de rótula',
      cat: 'movilidad',
      phases: [1, 2],
      perDay: 2,
      dose: '2 min por rodilla, 2 veces al día',
      why: 'Evita que la rótula se quede "pegada", lo que limitaría tanto la flexión como la extensión.',
      how: [
        'Pierna estirada y el muslo relajado.',
        'Sujeta la rótula con los dedos y deslízala suavemente arriba, abajo y a los lados.',
        'Sin dolor fuerte y sin presionar sobre las heridas.'
      ]
    },
    {
      id: 'deslizamiento-talon',
      name: 'Deslizamiento de talón (flexión)',
      cat: 'movilidad',
      phases: [1, 2],
      perDay: 3,
      dose: '10–15 repeticiones, 3 veces al día (cada pierna)',
      timer: { work: 5, rest: 3, reps: 15 },
      why: 'Recupera la flexión de forma progresiva y controlada.',
      how: [
        'Tumbado/a boca arriba.',
        'Desliza el talón hacia el glúteo doblando la rodilla. Puedes ayudarte con una toalla o cinta alrededor del pie.',
        'Mantén 5 s en el punto de tensión y vuelve a estirar.'
      ],
      notes: {
        repair: 'Sutura de menisco: no pases de 90° las primeras 4–6 semanas (o el límite que te indique tu cirujano).'
      }
    },
    {
      id: 'elevacion-recta',
      name: 'Elevación de pierna recta',
      cat: 'fuerza',
      phases: [1, 2],
      perDay: 2,
      dose: '3 series de 10, 1–2 veces al día (cada pierna)',
      why: 'Fortalece el cuádriceps sin cargar la rodilla.',
      how: [
        'Tumbado/a boca arriba; la otra pierna estirada o doblada, como te resulte cómodo.',
        'Primero aprieta el cuádriceps para dejar la rodilla totalmente recta.',
        'Eleva la pierna unos 30–45 cm, mantén 2–3 s y baja despacio.'
      ],
      caution: 'Si la rodilla se dobla al subir, vuelve a las contracciones de cuádriceps o hazlo con la rodillera puesta.'
    },
    {
      id: 'abduccion-cadera',
      name: 'Abducción de cadera de lado',
      cat: 'fuerza',
      phases: [1, 2, 3],
      perDay: 1,
      dose: '3 series de 10–15 por lado',
      why: 'El glúteo medio controla que la rodilla no se vaya hacia dentro al caminar y al bajar.',
      how: [
        'Tumbado/a de lado con un cojín entre las rodillas (con las dos operadas es más cómodo).',
        'Pierna de arriba estirada; aprieta el muslo y elévala hacia el techo, ligeramente hacia atrás.',
        'Baja despacio. No gires la cadera.'
      ]
    },

    // ───────────── Fase 2 ─────────────
    {
      id: 'transferencias',
      name: 'Transferencias de peso',
      cat: 'equilibrio',
      phases: [2],
      perDay: 2,
      dose: '2–3 min, 2 veces al día',
      timer: { work: 180 },
      why: 'Recupera la confianza para cargar peso y reparte la carga igual en las dos piernas.',
      how: [
        'De pie, agarrado/a a una encimera, pies a la anchura de la cadera.',
        'Pasa el peso despacio de una pierna a otra, y luego de delante hacia atrás.',
        'Rodillas rectas pero sin bloquearlas.'
      ],
      caution: 'Carga solo el peso que te haya permitido tu cirujano.'
    },
    {
      id: 'marcha',
      name: 'Práctica de marcha',
      cat: 'equilibrio',
      phases: [2],
      perDay: 2,
      dose: '5–10 min, 2 veces al día',
      timer: { work: 600 },
      why: 'Evita que te quede una cojera por costumbre.',
      how: [
        'Camina despacio, mejor frente a un espejo.',
        'Apoya primero el talón, luego la planta y despega con los dedos.',
        'Estira por completo la rodilla al apoyar el talón. Pasos de la misma longitud.',
        'Reduce las muletas solo cuando te autoricen: 2 → 1 → ninguna.'
      ],
      notes: {
        repair: 'Sutura de menisco: suele indicarse carga parcial y rodillera bloqueada en extensión 4–6 semanas. Sigue la pauta de tu cirujano.'
      }
    },
    {
      id: 'mini-sentadilla',
      name: 'Mini sentadilla (0–45°)',
      cat: 'fuerza',
      phases: [2],
      perDay: 1,
      dose: '3 series de 10–15',
      why: 'Fuerza de pie (cadena cerrada): es segura para el injerto y trabaja las dos piernas a la vez.',
      how: [
        'De pie, agarrado/a a una encimera, pies a la anchura de los hombros.',
        'Baja como si fueras a sentarte un poco (máximo 45°).',
        'Rodillas alineadas con el segundo dedo del pie, peso repartido en las dos piernas.',
        'Sube apretando los glúteos.'
      ]
    },
    {
      id: 'puente',
      name: 'Puente de glúteos',
      cat: 'fuerza',
      phases: [2, 3],
      perDay: 1,
      dose: '3 series de 10–12, manteniendo 3 s arriba',
      timer: { work: 3, rest: 2, reps: 12 },
      why: 'Fortalece glúteos y la parte posterior del muslo, que protegen la rodilla.',
      how: [
        'Boca arriba, rodillas dobladas y pies apoyados.',
        'Aprieta los glúteos y eleva la cadera hasta alinear hombros, cadera y rodillas.',
        'Mantén 3 s y baja despacio.'
      ],
      notes: {
        repair: 'Sutura de menisco: aleja los pies del glúteo para no pasar de 90° de flexión.',
        hamstring: 'Injerto de isquiotibiales: si notas tirón en la parte de atrás del muslo, aleja más los pies.'
      }
    },
    {
      id: 'talones',
      name: 'Elevación de talones',
      cat: 'fuerza',
      phases: [2, 3],
      perDay: 1,
      dose: '3 series de 15',
      why: 'Los gemelos también estabilizan la rodilla y ayudan a caminar mejor.',
      how: [
        'De pie con apoyo.',
        'Sube sobre las puntas de los dos pies, mantén 1–2 s y baja despacio.',
        'Progresión: con una sola pierna.'
      ]
    },
    {
      id: 'bicicleta',
      name: 'Bicicleta estática',
      cat: 'cardio',
      phases: [2, 3, 4],
      perDay: 1,
      dose: 'Fase 2: 10–15 min sin resistencia · Fase 3–4: 20–30 min con resistencia progresiva',
      timer: { work: 900 },
      gate: { repairMinDay: 42 },
      why: 'Mejora la movilidad y la circulación y empieza a recuperar tu forma física sin impacto.',
      how: [
        'Sillín alto, para que la rodilla no se doble demasiado.',
        'Empieza con medias vueltas adelante y atrás hasta que puedas dar la vuelta completa.',
        'Pedalea suave, sin dolor.'
      ],
      caution: 'Necesitas unos 110° de flexión para dar la vuelta completa: no la fuerces.'
    },
    {
      id: 'equilibrio',
      name: 'Equilibrio a una pierna',
      cat: 'equilibrio',
      phases: [2, 3, 4],
      perDay: 1,
      dose: '3 × 30 s por pierna',
      timer: { work: 30, rest: 15, reps: 6 },
      why: 'Reentrena la propiocepción: la capacidad de la rodilla de "saber" dónde está.',
      how: [
        'Junto a una encimera, apóyate en una pierna con la rodilla ligeramente flexionada.',
        'Progresión: sin manos → ojos cerrados → sobre un cojín → lanzando una pelota.',
        'Alterna las piernas en cada repetición.'
      ],
      caution: 'Con las dos rodillas operadas, ten siempre un apoyo al alcance.'
    },

    // ───────────── Fase 3 ─────────────
    {
      id: 'sentadilla',
      name: 'Sentadilla a silla',
      cat: 'fuerza',
      phases: [3, 4],
      perDay: 1,
      dose: '3 series de 10–12',
      why: 'El ejercicio base de fuerza para cuádriceps y glúteos.',
      how: [
        'De pie delante de una silla, pies a la anchura de los hombros.',
        'Baja controlado/a hasta rozar el asiento y sube sin dejarte caer.',
        'Rodillas en línea con los pies, peso en los talones, pecho arriba.',
        'Progresión: con mancuernas o una mochila con peso.'
      ],
      notes: {
        repair: 'Sutura de menisco: no bajes de 90° hasta los 4 meses.'
      }
    },
    {
      id: 'subida-escalon',
      name: 'Subida a escalón',
      cat: 'fuerza',
      phases: [3, 4],
      perDay: 1,
      dose: '3 series de 10 por pierna',
      why: 'Fuerza de una pierna en un gesto de la vida diaria.',
      how: [
        'Escalón de 10–20 cm con barandilla al lado.',
        'Sube con una pierna apoyando todo el pie y estira por completo rodilla y cadera arriba.',
        'Baja controlado/a. La rodilla siempre alineada con el pie.'
      ]
    },
    {
      id: 'bajada-escalon',
      name: 'Bajada de escalón controlada',
      cat: 'fuerza',
      phases: [3, 4],
      perDay: 1,
      dose: '3 series de 8 por pierna',
      why: 'Control al frenar (excéntrico): clave para bajar escaleras y aterrizar de saltos.',
      how: [
        'De pie sobre un escalón bajo, con apoyo cerca.',
        'Baja muy despacio el talón de la otra pierna hasta tocar el suelo y vuelve a subir.',
        'La rodilla de apoyo no debe irse hacia dentro. Usa un espejo.'
      ]
    },
    {
      id: 'banda-lateral',
      name: 'Pasos laterales con banda',
      cat: 'fuerza',
      phases: [3, 4],
      perDay: 1,
      dose: '3 series de 10 pasos hacia cada lado',
      why: 'Fortalece el glúteo medio, que evita que la rodilla se vaya hacia dentro.',
      how: [
        'Banda elástica alrededor de las rodillas o los tobillos.',
        'Rodillas un poco flexionadas, da pasos laterales manteniendo la banda tensa.',
        'Tronco estable, sin balancearte.'
      ]
    },
    {
      id: 'peso-muerto',
      name: 'Peso muerto rumano',
      cat: 'fuerza',
      phases: [3, 4, 5],
      perDay: 1,
      dose: '3 series de 10',
      gate: { hamstringMinDay: 56 },
      why: 'Fortalece isquiotibiales y glúteos, los "protectores" del LCA.',
      how: [
        'De pie, rodillas ligeramente flexionadas.',
        'Inclina el tronco hacia delante llevando la cadera atrás, con la espalda recta, hasta notar tensión detrás del muslo.',
        'Vuelve apretando los glúteos. Empieza sin peso.'
      ]
    },
    {
      id: 'curl-isquios',
      name: 'Curl de isquiotibiales',
      cat: 'fuerza',
      phases: [3, 4, 5],
      perDay: 1,
      dose: '3 series de 12',
      gate: { hamstringMinDay: 70 },
      why: 'Los isquiotibiales ayudan a frenar el desplazamiento de la tibia que protege el LCA.',
      how: [
        'De pie apoyado/a, dobla la rodilla llevando el talón hacia el glúteo.',
        'Empieza sin peso; luego con tobillera o máquina.',
        'Sube y baja despacio.'
      ],
      notes: {
        repair: 'Sutura de menisco: con peso, no pases de 90° de flexión hasta los 4 meses.'
      }
    },
    {
      id: 'extension-rodilla',
      name: 'Extensión de rodilla sentado/a',
      cat: 'fuerza',
      phases: [3, 4, 5],
      perDay: 1,
      dose: '3 series de 12',
      why: 'Aísla el cuádriceps, que suele ser el músculo que más tarda en recuperarse.',
      how: [
        'Sentado/a, extiende la rodilla con una tobillera o en máquina.',
        'Hasta la semana 12: solo entre 90° y 45° (sin estirar del todo con peso), para proteger el injerto.',
        'Después, rango completo y aumenta el peso de forma progresiva.'
      ]
    },
    {
      id: 'prensa',
      name: 'Prensa de piernas',
      cat: 'fuerza',
      phases: [3, 4, 5],
      perDay: 1,
      optional: true,
      dose: '3 series de 10 (si vas al gimnasio)',
      why: 'Permite cargar más peso de forma controlada.',
      how: [
        'Pies a la anchura de la cadera en la plataforma.',
        'Baja hasta 90° de flexión y empuja sin bloquear las rodillas arriba.',
        'Progresión: a una pierna.'
      ],
      notes: {
        repair: 'Sutura de menisco: no pases de 90° hasta los 4 meses.'
      }
    },
    {
      id: 'plancha-lateral',
      name: 'Plancha lateral',
      cat: 'fuerza',
      phases: [3, 4, 5],
      perDay: 1,
      dose: '3 × 20–30 s por lado',
      timer: { work: 30, rest: 15, reps: 6 },
      why: 'Un tronco fuerte controla mejor la posición de las rodillas.',
      how: [
        'Apoyado/a sobre el antebrazo, codo bajo el hombro.',
        'Fase 3: con las rodillas flexionadas. Luego con las piernas estiradas.',
        'Cuerpo en línea recta. Alterna los lados.'
      ]
    },

    // ───────────── Fase 4 ─────────────
    {
      id: 'sentadilla-bulgara',
      name: 'Sentadilla búlgara',
      cat: 'fuerza',
      phases: [4, 5],
      perDay: 1,
      dose: '3 series de 8 por pierna',
      gate: { repairMinDay: 112 },
      why: 'Fuerza a una pierna: corrige las diferencias entre las dos rodillas.',
      how: [
        'Pie de atrás sobre una silla (o en el suelo para empezar).',
        'Baja la rodilla de atrás hacia el suelo, tronco recto.',
        'La rodilla de delante no debe irse hacia dentro.'
      ]
    },
    {
      id: 'zancadas',
      name: 'Zancadas',
      cat: 'fuerza',
      phases: [4, 5],
      perDay: 1,
      dose: '3 series de 8 por pierna',
      gate: { repairMinDay: 112 },
      why: 'Fuerza y control en un gesto dinámico.',
      how: [
        'Da un paso largo al frente y baja hasta que las dos rodillas estén a unos 90°.',
        'Empuja con la pierna de delante para volver.',
        'Progresión: zancadas hacia atrás → laterales → caminando.'
      ],
      notes: {
        btb: 'Injerto de tendón rotuliano: si la rodilla de atrás molesta al acercarse al suelo, no la apoyes o pon un cojín.'
      }
    },
    {
      id: 'sentadilla-una-pierna',
      name: 'Sentadilla a una pierna a cajón',
      cat: 'fuerza',
      phases: [4, 5],
      perDay: 1,
      dose: '3 series de 8 por pierna',
      gate: { repairMinDay: 112 },
      why: 'Uno de los mejores indicadores de que la rodilla está lista para correr y saltar.',
      how: [
        'Siéntate y levántate de una silla alta o un cajón usando una sola pierna.',
        'Movimiento lento, rodilla alineada con el pie.',
        'Progresión: asiento más bajo.'
      ]
    },
    {
      id: 'carrera',
      name: 'Carrera progresiva (caminar–trotar)',
      cat: 'cardio',
      phases: [4, 5],
      perDay: 1,
      optional: true,
      dose: '1 min trotando / 1 min caminando × 10, en días alternos',
      timer: { work: 60, rest: 60, reps: 10, workLabel: 'Trota', restLabel: 'Camina' },
      gate: { minDay: 84 },
      why: 'Volver a correr de forma segura y progresiva.',
      how: [
        'Solo con autorización de tu fisio: extensión completa, flexión de 120° o más, sin hinchazón y sentadilla a una pierna controlada.',
        'Superficie plana (cinta o pista). Zancada corta y suave.',
        'Si al día siguiente no hay más dolor ni hinchazón, aumenta el tiempo trotando.'
      ]
    },
    {
      id: 'saltos-bilaterales',
      name: 'Saltos con dos piernas y aterrizajes',
      cat: 'pliometria',
      phases: [4, 5],
      perDay: 1,
      optional: true,
      dose: '3 series de 8, días alternos',
      gate: { minDay: 112 },
      why: 'Aprender a aterrizar bien es la mejor protección frente a una nueva lesión.',
      how: [
        'Sentadilla con un salto pequeño hacia arriba.',
        'Aterriza suave (punta → talón) con las rodillas flexionadas y alineadas con los pies, nunca hacia dentro.',
        'Empieza con saltos pequeños. Para si hay dolor.'
      ]
    },

    // ───────────── Fase 5 ─────────────
    {
      id: 'saltos-una-pierna',
      name: 'Saltos a una pierna',
      cat: 'pliometria',
      phases: [5],
      perDay: 1,
      optional: true,
      dose: '3 series de 6 por pierna: adelante, lateral y en zigzag',
      why: 'Prepara la rodilla para las exigencias del deporte.',
      how: [
        'Salta hacia delante sobre una pierna y aguanta el aterrizaje 2 s.',
        'Progresión: saltos laterales, en zigzag y encadenados.',
        'Calidad antes que distancia.'
      ]
    },
    {
      id: 'agilidad',
      name: 'Agilidad y cambios de dirección',
      cat: 'pliometria',
      phases: [5],
      perDay: 1,
      optional: true,
      dose: '10–15 min',
      timer: { work: 900 },
      why: 'Los giros y frenadas son el gesto típico de la rotura del LCA: hay que reentrenarlos.',
      how: [
        'Desplazamientos laterales, escalera de agilidad, carrera hacia atrás.',
        'Cambios de dirección primero a 45° y luego a 90°, de lento a rápido.',
        'Rodilla siempre alineada con el pie.'
      ]
    },
    {
      id: 'nordicos',
      name: 'Nórdicos de isquiotibiales',
      cat: 'fuerza',
      phases: [5],
      perDay: 1,
      optional: true,
      dose: '3 series de 5, 2 veces por semana',
      why: 'Uno de los ejercicios con más evidencia para prevenir lesiones.',
      how: [
        'De rodillas sobre un cojín, con los tobillos sujetos.',
        'Déjate caer hacia delante muy despacio frenando con los isquiotibiales.',
        'Ayúdate con las manos al llegar abajo y vuelve a subir.'
      ]
    },
    {
      id: 'prevencion',
      name: 'Calentamiento preventivo (tipo FIFA 11+)',
      cat: 'cuidado',
      phases: [5],
      perDay: 1,
      optional: true,
      dose: '15–20 min antes de cada entrenamiento, para siempre',
      timer: { work: 1200 },
      why: 'Los programas de calentamiento neuromuscular reducen el riesgo de lesión del LCA.',
      how: [
        'Carrera suave, movilidad y activación.',
        'Fuerza (sentadillas, nórdicos, plancha), equilibrio y saltos con buena técnica.',
        'Termina con carreras con cambios de dirección.'
      ]
    }
  ];

  var CATEGORIES = {
    cuidado: 'Cuidado',
    movilidad: 'Movilidad',
    fuerza: 'Fuerza',
    equilibrio: 'Equilibrio y marcha',
    cardio: 'Cardio',
    pliometria: 'Saltos y agilidad'
  };

  var RED_FLAGS = {
    emergency: [
      'Falta de aire repentina o dolor en el pecho (posible embolia). Llama a emergencias.'
    ],
    call: [
      'Dolor, calor, hinchazón o enrojecimiento en la pantorrilla (posible trombosis). Con cirugía bilateral el riesgo es mayor.',
      'Fiebre de más de 38 °C o escalofríos.',
      'Herida roja, caliente, que supura o huele mal, o que se abre.',
      'Hinchazón que aumenta mucho de repente o la rodilla está muy caliente.',
      'Dolor que no se controla con la medicación pautada.',
      'Adormecimiento u hormigueo en el pie que no desaparece.',
      'La rodilla "se va", fallo con chasquido y dolor, o no puedes apoyar el pie.',
      'Pierdes movilidad día a día (cada vez estiras o doblas menos).'
    ]
  };

  var TIPS = [
    {
      title: 'Regla del dolor y la hinchazón',
      text: 'Durante el ejercicio, un dolor de hasta 3–4 sobre 10 es aceptable si se calma en un rato. Si al día siguiente la rodilla está más hinchada o duele más, baja la carga ese día y vuelve a subir poco a poco.'
    },
    {
      title: 'Nunca un cojín bajo la rodilla',
      text: 'Es lo más cómodo, pero hace que la rodilla se quede doblada y se pierda extensión. Para elevar, pon el cojín bajo el talón y la pantorrilla.'
    },
    {
      title: 'Operación en las dos rodillas',
      text: 'Al no tener una pierna sana de apoyo, todo va un poco más lento al principio. Usa barandillas, asiento alto en el baño y apoyos estables. Las comparaciones "pierna operada vs. sana" no sirven: tu fisio usará valores de referencia (por ejemplo, fuerza relativa a tu peso).'
    },
    {
      title: 'Medicación y ejercicio',
      text: 'Si te han pautado analgésicos, tomarlos 30–60 min antes de la sesión principal hace los ejercicios más llevaderos. Si te han pautado anticoagulante, no te saltes dosis.'
    },
    {
      title: 'Come y duerme bien',
      text: 'Proteína en cada comida (carne, pescado, huevos, legumbres, lácteos) ayuda a recuperar músculo. Dormir bien reduce el dolor y acelera la recuperación.'
    },
    {
      title: 'Cómo medir los ángulos',
      text: 'Tu fisio puede medirlos con un goniómetro. En casa puedes usar una app de goniómetro con el móvil apoyado en la espinilla. Extensión: 0° = rodilla totalmente recta; si te faltan 5°, anota 5. Si se pasa de recta (hiperextensión), anota un número negativo.'
    }
  ];

  var MENISCUS = {
    sutura: 'Sutura (reparación) de menisco',
    meniscectomia: 'Meniscectomía (se quitó una parte)',
    ninguna: 'Sin cirugía de menisco',
    nose: 'No lo sé'
  };

  var GRAFTS = {
    isquios: 'Isquiotibiales (semitendinoso / recto interno)',
    htth: 'Tendón rotuliano (hueso-tendón-hueso)',
    cuadricipital: 'Tendón cuadricipital',
    aloinjerto: 'Aloinjerto (de donante)',
    nose: 'No lo sé'
  };

  window.PROTOCOL = {
    PHASES: PHASES,
    EXERCISES: EXERCISES,
    CATEGORIES: CATEGORIES,
    RED_FLAGS: RED_FLAGS,
    TIPS: TIPS,
    MENISCUS: MENISCUS,
    GRAFTS: GRAFTS
  };
})();
