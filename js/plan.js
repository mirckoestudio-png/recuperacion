/*
 * Lógica del plan: en qué fase estás, qué ejercicios tocan hoy,
 * qué precauciones aplican y avisos a partir de tus registros.
 */
(function (root) {
  'use strict';

  var P = root.PROTOCOL;
  var D = root.DateUtil;

  var SIDES = [
    { key: 'der', label: 'Derecha', short: 'D' },
    { key: 'izq', label: 'Izquierda', short: 'I' }
  ];

  var REPAIR_LIMIT_DAY = 112;    // ~16 semanas de precauciones por sutura de menisco
  var HAMSTRING_LIMIT_DAY = 84;  // ~12 semanas de cuidado con el injerto de isquios

  function phaseForDay(day) {
    var id = 1;
    P.PHASES.forEach(function (ph) { if (day >= ph.startDay) id = ph.id; });
    return id;
  }

  function phaseById(id) {
    for (var i = 0; i < P.PHASES.length; i++) if (P.PHASES[i].id === id) return P.PHASES[i];
    return P.PHASES[0];
  }

  function weekOf(day) { return Math.floor(day / 7) + 1; }

  /** Contexto de recuperación para una fecha (por defecto, hoy). */
  function context(state, refKey) {
    refKey = refKey || D.todayKey();
    var profile = state.profile;
    var knees = SIDES.map(function (s) {
      var k = profile.knees[s.key];
      var day = D.diffDays(k.date, refKey);
      return {
        side: s.key, label: s.label, short: s.short,
        date: k.date, meniscus: k.meniscus, graft: k.graft,
        day: day, week: weekOf(day), phaseAuto: phaseForDay(day)
      };
    });

    // El plan sigue a la rodilla operada más recientemente (la más conservadora).
    var ref = knees[0].day <= knees[1].day ? knees[0] : knees[1];
    var refDay = ref.day;
    var auto = phaseForDay(Math.max(0, refDay));
    var phase = state.phaseOverride ? state.phaseOverride : auto;

    function any(fn) { return knees.some(fn); }

    return {
      refKey: refKey,
      knees: knees,
      refKnee: ref,
      sameDate: knees[0].date === knees[1].date,
      day: refDay,
      week: weekOf(refDay),
      presurgery: refDay < 0,
      phase: phase,
      phaseAuto: auto,
      manual: !!state.phaseOverride,
      phaseObj: phaseById(phase),
      // Si no sabes el tipo, se asume lo más prudente.
      anyRepair: any(function (k) { return k.meniscus === 'sutura' || k.meniscus === 'nose'; }),
      anyHamstring: any(function (k) { return k.graft === 'isquios' || k.graft === 'nose'; }),
      anyBTB: any(function (k) { return k.graft === 'htth'; })
    };
  }

  /** Día mínimo desde la cirugía para poder hacer el ejercicio, y por qué. */
  function gateFor(ex, ctx) {
    var g = ex.gate || {};
    var min = g.minDay || 0;
    var reason = '';
    if (ctx.anyRepair && g.repairMinDay && g.repairMinDay > min) {
      min = g.repairMinDay; reason = 'por la sutura de menisco';
    }
    if (ctx.anyHamstring && g.hamstringMinDay && g.hamstringMinDay > min) {
      min = g.hamstringMinDay; reason = 'por el injerto de isquiotibiales';
    }
    return { minDay: min, reason: reason };
  }

  function notesFor(ex, ctx) {
    var out = [];
    var n = ex.notes || {};
    if (n.repair && ctx.anyRepair && ctx.day < REPAIR_LIMIT_DAY) out.push(n.repair);
    if (n.hamstring && ctx.anyHamstring && ctx.day < HAMSTRING_LIMIT_DAY) out.push(n.hamstring);
    if (n.btb && ctx.anyBTB) out.push(n.btb);
    return out;
  }

  function exerciseStatus(ex, ctx, state) {
    var gate = gateFor(ex, ctx);
    // Antes de la cirugía se muestran los ejercicios de la fase 1 para practicarlos.
    var locked = Math.max(0, ctx.day) < gate.minDay;
    return {
      ex: ex,
      inPhase: ex.phases.indexOf(ctx.phase) !== -1,
      locked: locked,
      lockText: locked
        ? 'Disponible a partir de las ' + Math.round(gate.minDay / 7) + ' semanas' + (gate.reason ? ' ' + gate.reason : '')
        : '',
      hidden: !!(state.hidden && state.hidden[ex.id]),
      notes: notesFor(ex, ctx)
    };
  }

  /** Lista de ejercicios del día. */
  function daily(state, refKey) {
    var ctx = context(state, refKey);
    var doneDay = (state.done && state.done[ctx.refKey]) || {};
    var items = [];
    P.EXERCISES.forEach(function (ex) {
      var st = exerciseStatus(ex, ctx, state);
      if (!st.inPhase || st.locked || st.hidden) return;
      st.count = doneDay[ex.id] || 0;
      st.perDay = ex.perDay || 1;
      st.optional = !!ex.optional;
      items.push(st);
    });
    var custom = (state.custom || []).map(function (c) {
      return {
        ex: c, custom: true, notes: [],
        count: doneDay[c.id] || 0,
        perDay: c.perDay || 1,
        optional: false
      };
    });
    return { ctx: ctx, items: items, custom: custom };
  }

  /** % del plan completado en una fecha (sin contar opcionales). */
  function adherence(state, dateKey) {
    if (!state.profile) return null;
    var d = daily(state, dateKey);
    if (d.ctx.presurgery) return null;
    var total = 0, done = 0;
    d.items.concat(d.custom).forEach(function (it) {
      if (it.optional) return;
      total += it.perDay;
      done += Math.min(it.count, it.perDay);
    });
    if (!total) return null;
    return { done: done, total: total, pct: done / total };
  }

  /** Días seguidos (hasta hoy) completando al menos la mitad del plan. */
  function streak(state) {
    var today = D.todayKey();
    var n = 0;
    var k = today;
    var a = adherence(state, k);
    // Si hoy aún no llegas a la mitad, la racha cuenta desde ayer.
    if (!a || a.pct < 0.5) k = D.addDays(k, -1);
    for (var i = 0; i < 400; i++) {
      a = adherence(state, k);
      if (!a || a.pct < 0.5) break;
      n++;
      k = D.addDays(k, -1);
    }
    return n;
  }

  function precautions(ctx) {
    var out = [];
    if (ctx.anyRepair && ctx.day < 42) {
      out.push({ level: 'warn', text: 'Sutura de menisco: no dobles la rodilla más de 90° (salvo que tu cirujano indique otro límite). Carga de peso y rodillera según su pauta; a menudo se camina con la rodillera bloqueada en extensión.' });
    }
    if (ctx.anyRepair && ctx.day < REPAIR_LIMIT_DAY) {
      out.push({ level: 'warn', text: 'Sutura de menisco: nada de cuclillas, sentadillas profundas con peso ni giros sobre la pierna hasta los 4 meses.' });
    }
    if (ctx.anyHamstring && ctx.day < 70) {
      out.push({ level: 'info', text: 'Injerto de isquiotibiales: sin curl de isquios con peso ni estiramientos fuertes de la parte de atrás del muslo hasta unas 10 semanas.' });
    }
    if (ctx.anyBTB) {
      out.push({ level: 'info', text: 'Injerto de tendón rotuliano: es normal que moleste arrodillarse. Evita apoyar las rodillas en superficies duras las primeras semanas.' });
    }
    if (ctx.phase <= 2) {
      out.push({ level: 'info', text: 'Nunca pongas un cojín bajo la rodilla: para elevar la pierna, apóyala desde el talón.' });
    }
    if (ctx.phase >= 3 && ctx.day < 84) {
      out.push({ level: 'info', text: 'Extensión de rodilla sentado/a con peso: solo entre 90° y 45° hasta la semana 12.' });
    }
    if (ctx.phase <= 4) {
      out.push({ level: 'info', text: 'Todavía nada de giros, pivotes, saltos bruscos ni deportes de contacto.' });
    }
    out.push({ level: 'info', text: 'Cirugía en las dos rodillas: ve con calma en escaleras y al levantarte; usa barandilla y apoyos estables.' });
    return out;
  }

  function latestLogs(state, refKey, n) {
    var keys = Object.keys(state.logs || {})
      .filter(function (k) { return k <= refKey; })
      .sort();
    return keys.slice(-n).map(function (k) { return { date: k, log: state.logs[k] }; });
  }

  function num(v) { return typeof v === 'number' && !isNaN(v); }

  /** Avisos automáticos a partir de los últimos registros. */
  function alerts(state, ctx) {
    var out = [];
    var recent = latestLogs(state, ctx.refKey, 2);
    if (!recent.length) return out;
    var last = recent[recent.length - 1];
    var age = D.diffDays(last.date, ctx.refKey);
    if (age > 2) return out;
    var prev = recent.length > 1 ? recent[0].log : null;

    SIDES.forEach(function (s) {
      var k = last.log[s.key] || {};
      var name = 'rodilla ' + s.label.toLowerCase();
      if ((num(k.pain) && k.pain >= 7) || (num(k.swelling) && k.swelling >= 3)) {
        out.push({ level: 'warn', text: 'Dolor o hinchazón altos en la ' + name + '. Hoy baja la carga: prioriza hielo, elevación, extensión pasiva y contracciones de cuádriceps. Si no mejora o empeora, contacta con tu equipo médico.' });
      } else if (prev && prev[s.key] && num(k.swelling) && num(prev[s.key].swelling) && k.swelling > prev[s.key].swelling) {
        out.push({ level: 'info', text: 'La hinchazón de la ' + name + ' ha aumentado respecto al registro anterior. Puede que te hayas pasado: reduce la intensidad hoy.' });
      }
      if (num(k.ext) && k.ext > 5 && ctx.day >= 14) {
        out.push({ level: 'warn', text: 'A la ' + name + ' le faltan ' + k.ext + '° para estar recta. Recuperar la extensión es la prioridad: haz la extensión pasiva varias veces al día y coméntalo con tu fisio.' });
      }
      if (num(k.flex) && ctx.phase >= 2 && ctx.day >= 28 && k.flex < 90) {
        out.push({ level: 'info', text: 'La flexión de la ' + name + ' (' + k.flex + '°) va por debajo de lo habitual para esta fase. Coméntalo con tu fisio.' });
      }
    });
    return out;
  }

  root.Plan = {
    SIDES: SIDES,
    phaseForDay: phaseForDay,
    phaseById: phaseById,
    weekOf: weekOf,
    context: context,
    exerciseStatus: exerciseStatus,
    daily: daily,
    adherence: adherence,
    streak: streak,
    precautions: precautions,
    alerts: alerts
  };
})(typeof window !== 'undefined' ? window : globalThis);
