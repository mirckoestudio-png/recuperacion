/*
 * Lógica del plan con dos cirugías independientes (una por rodilla).
 *
 *  - Cada rodilla tiene su fecha, su fase y sus precauciones.
 *  - Ejercicios con una sola pierna (legs: 'one'): siguen la fase de cada rodilla.
 *  - Ejercicios con las dos piernas (legs: 'both'): solo aparecen cuando las DOS
 *    rodillas lo permiten, así que van al ritmo de la operada más tarde.
 *  - Cuidados generales (legs: 'any'): aparecen si alguna rodilla los necesita.
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
    var id = 0;
    P.PHASES.forEach(function (ph) { if (day >= ph.startDay) id = ph.id; });
    return id;
  }

  function phaseById(id) {
    for (var i = 0; i < P.PHASES.length; i++) if (P.PHASES[i].id === id) return P.PHASES[i];
    return P.PHASES[0];
  }

  function weekOf(day) { return Math.floor(day / 7) + 1; }

  function kneeContext(state, side, refKey) {
    var k = state.profile.knees[side.key];
    var day = D.diffDays(k.date, refKey);
    var auto = phaseForDay(day);
    var ov = state.phaseOverride && state.phaseOverride[side.key];
    var manual = !!ov && day >= 0;
    var phase = manual ? ov : auto;
    return {
      side: side.key,
      label: side.label,
      short: side.short,
      name: 'rodilla ' + side.label.toLowerCase(),
      date: k.date,
      meniscus: k.meniscus,
      graft: k.graft,
      day: day,
      week: weekOf(day),
      presurgery: day < 0,
      phaseAuto: auto,
      phase: phase,
      manual: manual,
      phaseObj: phaseById(phase),
      // Si no sabes el tipo, se asume lo más prudente.
      repair: k.meniscus === 'sutura' || k.meniscus === 'nose',
      hamstring: k.graft === 'isquios' || k.graft === 'nose',
      btb: k.graft === 'htth',
      order: 0
    };
  }

  /** Contexto de recuperación de las dos rodillas para una fecha (por defecto, hoy). */
  function context(state, refKey) {
    refKey = refKey || D.todayKey();
    var knees = SIDES.map(function (s) { return kneeContext(state, s, refKey); });
    var sameDate = knees[0].date === knees[1].date;
    var ordered = knees.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    if (!sameDate) { ordered[0].order = 1; ordered[1].order = 2; }
    return {
      refKey: refKey,
      knees: knees,
      bySide: { der: knees[0], izq: knees[1] },
      ordered: ordered,        // primero la operada antes
      first: ordered[0],
      recent: ordered[1],      // la operada más tarde: marca el ritmo de lo que usa las dos piernas
      sameDate: sameDate,
      samePhase: knees[0].phase === knees[1].phase,
      anyPostop: knees.some(function (k) { return !k.presurgery; })
    };
  }

  /** Día mínimo desde la cirugía de esa rodilla para poder hacer el ejercicio, y por qué. */
  function gateFor(ex, k) {
    var g = ex.gate || {};
    var min = g.minDay || 0;
    var reason = '';
    if (k.repair && g.repairMinDay && g.repairMinDay > min) {
      min = g.repairMinDay; reason = 'sutura de menisco';
    }
    if (k.hamstring && g.hamstringMinDay && g.hamstringMinDay > min) {
      min = g.hamstringMinDay; reason = 'injerto de isquiotibiales';
    }
    return { minDay: min, reason: reason };
  }

  function firstPostopPhase(ex) {
    var ps = ex.phases.filter(function (p) { return p > 0; });
    return ps.length ? Math.min.apply(null, ps) : 99;
  }

  /** ¿Esta rodilla tolera el ejercicio hoy? (ya llegó a la fase en que se introduce y pasó los plazos) */
  function kneeAllows(ex, k) {
    if (k.presurgery) return ex.phases.indexOf(0) !== -1;
    return k.phase >= firstPostopPhase(ex) && k.day >= gateFor(ex, k).minDay;
  }

  /** Fecha aproximada (por tiempo) en que la rodilla k permitirá el ejercicio. */
  function unlockKey(ex, k) {
    var from = firstPostopPhase(ex);
    if (from === 99) return null;
    var day = Math.max(phaseById(from).startDay, gateFor(ex, k).minDay);
    return D.addDays(k.date, day);
  }

  function notesFor(ex, k) {
    var out = [];
    var n = ex.notes || {};
    if (k.presurgery) return out;
    if (n.repair && k.repair && k.day < REPAIR_LIMIT_DAY) out.push(n.repair);
    if (n.hamstring && k.hamstring && k.day < HAMSTRING_LIMIT_DAY) out.push(n.hamstring);
    if (n.btb && k.btb) out.push(n.btb);
    return out;
  }

  function bothNotes(ex, ctx) {
    var out = [];
    ctx.ordered.forEach(function (k) {
      notesFor(ex, k).forEach(function (t) { out.push({ side: k.side, text: t }); });
    });
    // Si la misma nota aplica a las dos rodillas, se muestra una vez sin etiqueta.
    var merged = [];
    out.forEach(function (n) {
      var twin = merged.find(function (m) { return m.text === n.text; });
      if (twin) twin.side = null; else merged.push({ side: n.side, text: n.text });
    });
    return merged;
  }

  /** Plan del día. */
  function daily(state, refKey) {
    var ctx = context(state, refKey);
    var doneDay = (state.done && state.done[ctx.refKey]) || {};
    var hidden = state.hidden || {};
    var both = [];
    var perKnee = { der: [], izq: [] };
    var waiting = { der: [], izq: [] };

    function item(ex, key, k, notes) {
      return {
        ex: ex, key: key, side: k ? k.side : null,
        count: doneDay[key] || 0,
        perDay: ex.perDay || 1,
        optional: !!ex.optional,
        custom: false,
        notes: notes
      };
    }

    P.EXERCISES.forEach(function (ex) {
      if (hidden[ex.id]) return;
      if (ex.legs === 'one') {
        ctx.knees.forEach(function (k) {
          if (ex.phases.indexOf(k.phase) === -1) return;
          if (!k.presurgery && k.day < gateFor(ex, k).minDay) return;
          perKnee[k.side].push(item(ex, ex.id + '@' + k.side, k,
            notesFor(ex, k).map(function (t) { return { side: null, text: t }; })));
        });
      } else if (ex.legs === 'any') {
        var need = ctx.knees.some(function (k) { return ex.phases.indexOf(k.phase) !== -1; });
        if (need) both.push(item(ex, ex.id, null, bothNotes(ex, ctx)));
      } else {
        var current = ctx.knees.some(function (k) { return ex.phases.indexOf(k.phase) !== -1; });
        if (!current) return;
        var allowed = ctx.knees.every(function (k) { return kneeAllows(ex, k); });
        if (allowed) {
          both.push(item(ex, ex.id, null, bothNotes(ex, ctx)));
        } else {
          // Le toca a una rodilla por su fase, pero la otra todavía no lo tolera.
          ctx.knees.forEach(function (k) {
            if (ex.phases.indexOf(k.phase) === -1 || !kneeAllows(ex, k)) return;
            var blocker = ctx.knees.find(function (o) { return o !== k && !kneeAllows(ex, o); });
            if (blocker) waiting[k.side].push({ ex: ex, blocker: blocker, unlockKey: unlockKey(ex, blocker) });
          });
        }
      }
    });

    (state.custom || []).forEach(function (c) {
      var it = {
        ex: c, key: c.id, side: c.knee === 'der' || c.knee === 'izq' ? c.knee : null,
        count: doneDay[c.id] || 0, perDay: c.perDay || 1, optional: false, custom: true, notes: []
      };
      if (it.side) perKnee[it.side].push(it); else both.push(it);
    });

    return {
      ctx: ctx,
      both: both,
      knees: ctx.ordered.map(function (k) {
        return { knee: k, items: perKnee[k.side], waiting: waiting[k.side] };
      })
    };
  }

  function allItems(d) {
    var out = d.both.slice();
    d.knees.forEach(function (s) { out = out.concat(s.items); });
    return out;
  }

  /** Primer día con datos en la app: antes de eso no se calcula la constancia. */
  function trackingStart(state) {
    var keys = Object.keys(state.done || {}).concat(Object.keys(state.logs || {}));
    if (state.profile && state.profile.createdAt) keys.push(state.profile.createdAt);
    if (!keys.length) return D.todayKey();
    return keys.sort()[0];
  }

  /** % del plan completado en una fecha (sin contar opcionales). */
  function adherence(state, dateKey, startKey) {
    if (!state.profile) return null;
    if (dateKey < (startKey || trackingStart(state))) return null;
    var d = daily(state, dateKey);
    var total = 0, done = 0;
    allItems(d).forEach(function (it) {
      if (it.optional) return;
      total += it.perDay;
      done += Math.min(it.count, it.perDay);
    });
    if (!total) return null;
    return { done: done, total: total, pct: done / total };
  }

  /** Días seguidos (hasta hoy) completando al menos la mitad del plan. */
  function streak(state) {
    var start = trackingStart(state);
    var k = D.todayKey();
    var n = 0;
    var a = adherence(state, k, start);
    // Si hoy aún no llegas a la mitad, la racha cuenta desde ayer.
    if (!a || a.pct < 0.5) k = D.addDays(k, -1);
    for (var i = 0; i < 400; i++) {
      a = adherence(state, k, start);
      if (!a || a.pct < 0.5) break;
      n++;
      k = D.addDays(k, -1);
    }
    return n;
  }

  /** Precauciones vigentes: por rodilla (side) y generales (side: null). */
  function precautions(ctx) {
    var out = [];
    ctx.ordered.forEach(function (k) {
      var add = function (level, text) { out.push({ level: level, side: k.side, text: text }); };
      if (k.presurgery) {
        add('info', 'Todavía sin operar: evita giros, saltos y deportes. Trabaja la extensión completa y la fuerza para llegar en buena forma a la cirugía.');
        return;
      }
      if (k.repair && k.day < 42) {
        add('warn', 'Sutura de menisco: no la dobles más de 90° (salvo que tu cirujano indique otro límite). Carga de peso y rodillera según su pauta.');
      }
      if (k.repair && k.day < REPAIR_LIMIT_DAY) {
        add('warn', 'Sutura de menisco: nada de cuclillas, sentadillas profundas con peso ni giros hasta los 4 meses (' + D.format(D.addDays(k.date, REPAIR_LIMIT_DAY), { day: 'numeric', month: 'long' }) + ').');
      }
      if (k.hamstring && k.day < 70) {
        add('info', 'Injerto de isquiotibiales: sin curl de isquios con peso ni estiramientos fuertes de la parte de atrás del muslo hasta unas 10 semanas.');
      }
      if (k.btb) {
        add('info', 'Injerto de tendón rotuliano: es normal que moleste arrodillarse. Evita apoyar la rodilla en superficies duras las primeras semanas.');
      }
      if (k.phase >= 3 && k.day < 84) {
        add('info', 'Extensión de rodilla sentado/a con peso: solo entre 90° y 45° hasta la semana 12.');
      }
    });

    var gen = function (level, text) { out.push({ level: level, side: null, text: text }); };
    if (ctx.knees.some(function (k) { return !k.presurgery && k.phase <= 2; })) {
      gen('info', 'Nunca pongas un cojín bajo la rodilla: para elevar la pierna, apóyala desde el talón.');
    }
    if (!ctx.sameDate && !ctx.samePhase) {
      gen('info', 'Caminar, bici, sentadillas, correr y saltar usan las dos piernas: van al ritmo de la ' + ctx.recent.name + ', la operada más tarde.');
    }
    if (!ctx.sameDate && ctx.anyPostop) {
      gen('info', 'No sobrecargues la ' + ctx.first.name + ' para compensar la otra: reparte el peso y vigila que no se hinche.');
    }
    if (ctx.knees.some(function (k) { return k.phase <= 4; })) {
      gen('info', 'Nada de giros, pivotes, saltos bruscos ni deportes de contacto hasta que las dos rodillas estén listas.');
    }
    return out;
  }

  function num(v) { return typeof v === 'number' && !isNaN(v); }

  /** Avisos automáticos a partir de los últimos registros. */
  function alerts(state, ctx) {
    var out = [];
    var keys = Object.keys(state.logs || {}).filter(function (k) { return k <= ctx.refKey; }).sort();
    if (!keys.length) return out;
    var lastKey = keys[keys.length - 1];
    if (D.diffDays(lastKey, ctx.refKey) > 2) return out;
    var last = state.logs[lastKey];
    var prev = keys.length > 1 ? state.logs[keys[keys.length - 2]] : null;

    ctx.ordered.forEach(function (kc) {
      var k = last[kc.side] || {};
      var name = kc.name;
      if ((num(k.pain) && k.pain >= 7) || (num(k.swelling) && k.swelling >= 3)) {
        out.push({ level: 'warn', side: kc.side, text: 'Dolor o hinchazón altos en la ' + name + '. Hoy baja la carga de esa pierna: prioriza hielo, elevación, extensión pasiva y contracciones de cuádriceps. Si no mejora o empeora, contacta con tu equipo médico.' });
      } else if (prev && prev[kc.side] && num(k.swelling) && num(prev[kc.side].swelling) && k.swelling > prev[kc.side].swelling) {
        out.push({ level: 'info', side: kc.side, text: 'La hinchazón de la ' + name + ' ha aumentado respecto al registro anterior. Puede que te hayas pasado: reduce la intensidad hoy.' });
      }
      if (!kc.presurgery && num(k.ext) && k.ext > 5 && kc.day >= 14) {
        out.push({ level: 'warn', side: kc.side, text: 'A la ' + name + ' le faltan ' + k.ext + '° para estar recta. Recuperar la extensión es la prioridad: haz la extensión pasiva varias veces al día y coméntalo con tu fisio.' });
      }
      if (!kc.presurgery && num(k.flex) && kc.phase >= 2 && kc.day >= 28 && k.flex < 90) {
        out.push({ level: 'info', side: kc.side, text: 'La flexión de la ' + name + ' (' + k.flex + '°) va por debajo de lo habitual para su fase. Coméntalo con tu fisio.' });
      }
    });
    return out;
  }

  /**
   * Compara las dos rodillas en el mismo día de su recuperación:
   * el último registro de la operada más tarde contra la otra en ese mismo día (±4).
   */
  function comparison(state, ctx, field) {
    if (ctx.sameDate) return null;
    var first = ctx.first, recent = ctx.recent;
    var logs = state.logs || {};
    var keys = Object.keys(logs).sort();
    var lastRecent = null;
    keys.forEach(function (k) {
      var v = logs[k][recent.side];
      if (v && num(v[field]) && D.diffDays(recent.date, k) >= 0) lastRecent = { key: k, value: v[field], day: D.diffDays(recent.date, k) };
    });
    if (!lastRecent) return null;
    var best = null;
    keys.forEach(function (k) {
      var v = logs[k][first.side];
      if (!v || !num(v[field])) return;
      var day = D.diffDays(first.date, k);
      var dist = Math.abs(day - lastRecent.day);
      if (dist <= 4 && (!best || dist < best.dist)) best = { value: v[field], day: day, dist: dist };
    });
    if (!best) return null;
    return { day: lastRecent.day, recent: recent, first: first, recentValue: lastRecent.value, firstValue: best.value, firstDay: best.day };
  }

  root.Plan = {
    SIDES: SIDES,
    phaseForDay: phaseForDay,
    phaseById: phaseById,
    weekOf: weekOf,
    context: context,
    gateFor: gateFor,
    kneeAllows: kneeAllows,
    firstPostopPhase: firstPostopPhase,
    unlockKey: unlockKey,
    daily: daily,
    allItems: allItems,
    adherence: adherence,
    trackingStart: trackingStart,
    streak: streak,
    precautions: precautions,
    alerts: alerts,
    comparison: comparison
  };
})(typeof window !== 'undefined' ? window : globalThis);
