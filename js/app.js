/*
 * Rodillas · app de recuperación tras cirugía de LCA y menisco (bilateral).
 * Pantallas: Hoy · Registro · Progreso · Plan · Ajustes
 */
(function () {
  'use strict';

  const P = window.PROTOCOL;
  const Store = window.Store;
  const D = window.DateUtil;
  const Plan = window.Plan;
  const Charts = window.Charts;

  const appEl = document.getElementById('app');
  const tabbar = document.getElementById('tabbar');
  const modalRoot = document.getElementById('modal-root');
  const toastEl = document.getElementById('toast');

  const VERSION = '2.0.1';

  // Estado de la interfaz (no se guarda)
  const ui = { expanded: {}, logDate: null, lastRoute: null };

  const st = () => Store.get();

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  // ─────────────────────────── Iconos ───────────────────────────
  const svg = (body, cls = 'icon') =>
    `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const I = {
    hoy: svg('<rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M8 2.5v4M16 2.5v4M3 10h18M9 15.5l2 2 4-4"/>'),
    registro: svg('<path d="M15 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="9" y="2.5" width="6" height="3.5" rx="1"/><path d="M9 12h6M9 16h4"/>'),
    progreso: svg('<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>'),
    plan: svg('<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>'),
    ajustes: svg('<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>'),
    check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    chevron: svg('<path d="M9 6l6 6-6 6"/>', 'icon chev'),
    left: svg('<path d="M15 6l-6 6 6 6"/>'),
    right: svg('<path d="M9 6l6 6-6 6"/>'),
    timer: svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9.5 2.5h5"/>'),
    alert: svg('<path d="M12 3l9.5 17h-19L12 3z"/><path d="M12 10v4.5M12 17.5v.01"/>'),
    info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5v.01"/>'),
    lock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>'),
    eyeOff: svg('<path d="M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c5.5 0 9 6 9 6a15.6 15.6 0 0 1-2.8 3.4M6.4 7.4C4.2 8.9 3 12 3 12s3.5 6 9 6c1.4 0 2.6-.3 3.7-.8"/><path d="M9.9 10a3 3 0 0 0 4.2 4.2"/>'),
    trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    knee: svg('<path d="M9 2.5v6.5a3.5 3.5 0 0 0 3.5 3.5h0A3.5 3.5 0 0 1 16 16v5.5"/><path d="M13 2.5v4"/><circle cx="12.5" cy="12.5" r="2.2"/>'),
    phone: svg('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>')
  };

  // ─────────────────────────── Utilidades ───────────────────────────
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove('show'), 2400);
  }

  function findExercise(id) {
    return P.EXERCISES.find((e) => e.id === id) || (st().custom || []).find((e) => e.id === id);
  }

  function longDate(k) {
    return D.format(k, { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function num(v) { return typeof v === 'number' && !isNaN(v); }

  function parseRoute() {
    const h = (location.hash || '#hoy').slice(1).split('/');
    const valid = ['hoy', 'registro', 'progreso', 'plan', 'ajustes', 'perfil'];
    return { name: valid.includes(h[0]) ? h[0] : 'hoy', sub: h[1] || '' };
  }

  // ─────────────────────────── Render ───────────────────────────
  function render() {
    const s = st();
    const route = parseRoute();
    if (!s.profile) {
      tabbar.hidden = true;
      appEl.innerHTML = viewProfile();
      return;
    }
    tabbar.hidden = route.name === 'perfil';
    tabbar.querySelectorAll('a').forEach((a) => {
      const on = a.dataset.tab === route.name;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });

    const views = { hoy: viewHoy, registro: viewRegistro, progreso: viewProgreso, plan: viewPlan, ajustes: viewAjustes, perfil: viewProfile };
    appEl.innerHTML = views[route.name]();

    const routeKey = route.name + '/' + route.sub;
    if (ui.lastRoute !== routeKey) {
      ui.lastRoute = routeKey;
      if (route.sub) {
        const target = document.getElementById(route.sub);
        if (target) setTimeout(() => target.scrollIntoView({ block: 'start' }), 0);
      } else {
        window.scrollTo(0, 0);
      }
    }
    if (route.name === 'progreso') drawProgressCharts();
  }

  const sideName = (side) => (side === 'der' ? 'Rodilla derecha' : 'Rodilla izquierda');

  function alertCard(a) {
    const icon = a.level === 'warn' ? I.alert : I.info;
    return `<div class="callout ${a.level}">${icon}<p>${a.side ? `<b>${esc(sideName(a.side))}:</b> ` : ''}${esc(a.text)}</p></div>`;
  }

  // ─────────────────────────── HOY ───────────────────────────
  function ring(pct) {
    const r = 30, c = 2 * Math.PI * r;
    const off = c * (1 - pct);
    return `<div class="ring" role="img" aria-label="${Math.round(pct * 100)}% del plan de hoy completado">
      <svg viewBox="0 0 72 72" width="72" height="72">
        <circle class="ring-track" cx="36" cy="36" r="${r}"/>
        <circle class="ring-fill" cx="36" cy="36" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 36 36)"/>
      </svg>
      <div class="ring-text"><b>${Math.round(pct * 100)}%</b><span>hoy</span></div>
    </div>`;
  }

  const ordinal = (k) => (k.order ? `${k.order}.ª cirugía` : 'Cirugía');

  function kneeCard(k) {
    const status = k.presurgery
      ? `Faltan ${-k.day} ${-k.day === 1 ? 'día' : 'días'}`
      : `Día ${k.day}`;
    const sub = k.presurgery
      ? esc(D.format(k.date, { day: 'numeric', month: 'short' }))
      : `semana ${k.week}`;
    return `<a class="knee-card k-${k.side}" href="#plan">
      <span class="kc-top"><i class="kdot"></i><b>${k.label}</b><small>${ordinal(k)}</small></span>
      <span class="kc-day">${status} <small>· ${sub}</small></span>
      <span class="kc-phase">Fase ${k.phase} · ${esc(k.phaseObj.short)}${k.manual ? ' (fijada)' : ''}</span>
    </a>`;
  }

  function exerciseRow(it) {
    const ex = it.ex;
    const key = it.key;
    const full = it.count >= it.perDay;
    const open = !!ui.expanded[key];
    const p = Math.min(1, it.count / it.perDay);
    const counter = full
      ? I.check
      : it.perDay > 1 ? `<span>${it.count}/${it.perDay}</span>` : '';
    const who = it.side ? ` (${sideName(it.side)})` : '';
    const label = full
      ? `${ex.name}${who}: completado. Toca para desmarcar`
      : `${ex.name}${who}: ${it.count} de ${it.perDay} hechas. Toca para sumar una`;

    let detail = '';
    if (it.custom) {
      detail = (ex.notes ? `<p>${esc(ex.notes)}</p>` : '<p class="muted">Ejercicio añadido por ti. Puedes borrarlo en Ajustes.</p>');
    } else {
      detail = `
        <p class="why">${esc(ex.why)}</p>
        <ol class="steps">${ex.how.map((h) => `<li>${esc(h)}</li>`).join('')}</ol>
        ${it.notes.map((n) => alertCard({ level: 'warn', text: n.text, side: n.side })).join('')}
        ${ex.caution ? alertCard({ level: 'info', text: ex.caution }) : ''}
        <div class="row-actions">
          ${ex.timer ? `<button class="btn primary small" data-action="timer" data-key="${esc(key)}">${I.timer}Temporizador</button>` : ''}
          <button class="btn ghost small" data-action="hide-ex" data-id="${esc(ex.id)}">${I.eyeOff}No me toca</button>
        </div>`;
    }

    return `<li class="ex${full ? ' done' : ''}">
      <button class="count" style="--p:${p}" data-action="count" data-key="${esc(key)}" aria-label="${esc(label)}">${counter}</button>
      <button class="ex-main" data-action="toggle-ex" data-key="${esc(key)}" aria-expanded="${open}">
        <span class="ex-text"><span class="ex-name">${esc(ex.name)}${it.optional ? ' <span class="tag">opcional</span>' : ''}</span><span class="ex-dose">${esc(ex.dose || '')}</span></span>
        ${I.chevron}
      </button>
      <div class="ex-detail"${open ? '' : ' hidden'}>${detail}</div>
    </li>`;
  }

  const byOptional = (a, b) => (a.optional === b.optional ? 0 : a.optional ? 1 : -1);

  function kneeSection(sec, ctx) {
    const k = sec.knee;
    const items = sec.items.slice().sort(byOptional);
    const waiting = sec.waiting.length ? `
      <details class="card waiting">
        <summary>${I.lock}<span>Esperando a la ${esc(sec.waiting[0].blocker.name)} <small>(${sec.waiting.length})</small></span>${I.chevron}</summary>
        <p class="section-sub">Son de la fase ${k.phase} de esta rodilla, pero trabajan las dos piernas: llegarán cuando la ${esc(sec.waiting[0].blocker.name)} esté preparada (fecha aproximada, si todo va bien).</p>
        <ul class="plain-list">${sec.waiting.map((w) => `<li><span>${esc(w.ex.name)}</span><small>${w.unlockKey ? 'hacia el ' + esc(D.format(w.unlockKey, { day: 'numeric', month: 'short' })) : ''}</small></li>`).join('')}</ul>
      </details>` : '';
    return `<section class="knee-section k-${k.side}">
      <h2><i class="kdot"></i>Rodilla ${k.label.toLowerCase()} <small>· ${k.presurgery ? 'antes de operarte' : `fase ${k.phase}`}</small></h2>
      <p class="section-sub">${k.presurgery
        ? 'Prepárala para la cirugía: hazlos solo con esta pierna.'
        : `Hazlos solo con la pierna ${k.label.toLowerCase()}.`}</p>
      ${items.length ? `<ul class="ex-list">${items.map(exerciseRow).join('')}</ul>` : '<p class="empty">Hoy no tiene ejercicios propios.</p>'}
      ${waiting}
    </section>`;
  }

  function viewHoy() {
    const s = st();
    const d = Plan.daily(s);
    const ctx = d.ctx;
    const adh = Plan.adherence(s, ctx.refKey);
    const hello = s.profile.name ? `Hola, ${esc(s.profile.name)}` : 'Tu recuperación';
    const alerts = Plan.alerts(s, ctx);
    const prec = Plan.precautions(ctx);
    const hasLogToday = !!s.logs[ctx.refKey];
    const bothItems = d.both.slice().sort(byOptional);
    const bothSub = !ctx.sameDate && !ctx.samePhase
      ? `Trabajan las dos rodillas a la vez, así que van al ritmo de la ${esc(ctx.recent.name)} (operada más tarde).`
      : 'Trabajan las dos rodillas a la vez.';

    return `
      <header class="hero">
        <div class="hero-row">
          <div>
            <p class="eyebrow">${hello}</p>
            <h1>Hoy</h1>
            <p class="hero-sub cap">${esc(longDate(ctx.refKey))}</p>
          </div>
          ${adh ? ring(adh.pct) : ''}
        </div>
        <div class="knee-cards">${ctx.ordered.map(kneeCard).join('')}</div>
      </header>

      ${ctx.sameDate ? `<div class="callout info">${I.info}<p>Las dos rodillas tienen la misma fecha de cirugía. Si te operaron en fechas distintas, <a href="#perfil">corrige las fechas</a> y el plan se adaptará a cada una.</p></div>` : ''}
      ${alerts.map(alertCard).join('')}
      ${!hasLogToday ? `<a class="card cta" href="#registro">${I.registro}<span><b>¿Cómo están hoy tus rodillas?</b><small>Anota dolor, hinchazón y ángulos de cada una: 1 minuto</small></span>${I.chevron}</a>` : ''}

      <details class="card precautions">
        <summary>${I.alert}<span>Precauciones ahora <small>(${prec.length})</small></span>${I.chevron}</summary>
        <ul>${prec.map((p) => `<li class="${p.level}">${p.side ? `<b>${esc(sideName(p.side))}:</b> ` : ''}${esc(p.text)}</li>`).join('')}</ul>
      </details>

      <p class="section-sub how-to">Toca el círculo cada vez que completes una sesión, y el nombre para ver cómo se hace.</p>

      ${bothItems.length ? `<section>
        <h2>Con las dos piernas</h2>
        <p class="section-sub">${bothSub}</p>
        <ul class="ex-list">${bothItems.map(exerciseRow).join('')}</ul>
      </section>` : ''}

      ${d.knees.map((sec) => kneeSection(sec, ctx)).join('')}

      <a class="card redflag-link" href="#plan/alarmas">${I.phone}<span><b>Señales de alarma</b><small>Cuándo llamar a tu médico o a urgencias</small></span>${I.chevron}</a>
    `;
  }

  // ─────────────────────────── REGISTRO ───────────────────────────
  const SWELLING = ['Nada', 'Leve', 'Moderada', 'Mucha'];

  function kneeLogFields(kc, k) {
    k = k || {};
    const side = kc.side;
    const info = kc.presurgery ? 'sin operar todavía' : `${kc.order ? ordinal(kc) + ' · ' : ''}día ${kc.day} · fase ${kc.phase}`;
    const painChips = Array.from({ length: 11 }, (_, v) =>
      `<label class="chip"><input type="radio" name="${side}-pain" value="${v}"${k.pain === v ? ' checked' : ''}><span>${v}</span></label>`).join('');
    const swellChips = SWELLING.map((t, v) =>
      `<label class="chip wide"><input type="radio" name="${side}-swelling" value="${v}"${k.swelling === v ? ' checked' : ''}><span>${t}</span></label>`).join('');
    return `<fieldset class="card knee-log k-${side}">
      <legend><i class="kdot"></i>Rodilla ${kc.label.toLowerCase()} <small>${info}</small></legend>
      <div class="field">
        <span class="field-label">Dolor <small>0 = nada · 10 = máximo</small></span>
        <div class="chips pain">${painChips}</div>
      </div>
      <div class="field">
        <span class="field-label">Hinchazón</span>
        <div class="chips swell">${swellChips}</div>
      </div>
      <div class="field-row">
        <label class="field">
          <span class="field-label">Flexión</span>
          <span class="input-unit"><input type="number" inputmode="numeric" name="${side}-flex" min="0" max="170" step="1" placeholder="p. ej. 95" value="${num(k.flex) ? k.flex : ''}"><span>°</span></span>
        </label>
        <label class="field">
          <span class="field-label">Extensión</span>
          <span class="input-unit"><input type="number" inputmode="numeric" name="${side}-ext" min="-20" max="90" step="1" placeholder="0 = recta" value="${num(k.ext) ? k.ext : ''}"><span>°</span></span>
        </label>
      </div>
      <p class="field-hint">Extensión: los grados que le faltan para estar totalmente recta (0 = recta).</p>
    </fieldset>`;
  }

  function logSummary(log, ordered) {
    return ordered.map((kc) => {
      const k = log[kc.side] || {};
      const parts = [];
      if (num(k.pain)) parts.push(`dolor ${k.pain}`);
      if (num(k.flex)) parts.push(`${k.flex}° flex.`);
      if (num(k.ext)) parts.push(`ext. ${k.ext}°`);
      return parts.length ? `<span class="k-${kc.side}"><i class="kdot"></i><b>${kc.short}</b> ${parts.join(', ')}</span>` : '';
    }).filter(Boolean).join('') || (log.notes ? '<span>Solo notas</span>' : '');
  }

  function viewRegistro() {
    const s = st();
    const today = D.todayKey();
    const key = ui.logDate && ui.logDate <= today ? ui.logDate : today;
    const log = s.logs[key] || {};
    const ctx = Plan.context(s, key);
    const history = Object.keys(s.logs).sort().reverse().slice(0, 14);

    return `
      <header class="page-head">
        <h1>Registro</h1>
        <p class="section-sub">Anota cómo están tus rodillas. Hazlo a la misma hora cada día (por ejemplo, por la mañana) para poder comparar.</p>
      </header>

      <div class="date-nav">
        <button class="icon-btn" data-action="log-prev" aria-label="Día anterior">${I.left}</button>
        <div class="date-nav-label"><b>${key === today ? 'Hoy' : esc(longDate(key))}</b>${key === today ? `<small>${esc(longDate(key))}</small>` : `<button class="link" data-action="log-today">Volver a hoy</button>`}</div>
        <button class="icon-btn" data-action="log-next" aria-label="Día siguiente"${key >= today ? ' disabled' : ''}>${I.right}</button>
      </div>

      <form id="log-form" data-key="${key}" autocomplete="off">
        ${ctx.ordered.map((kc) => kneeLogFields(kc, log[kc.side])).join('')}
        <label class="card field">
          <span class="field-label">Notas <small>(medicación, sueño, qué hiciste, qué dijo tu fisio…)</small></span>
          <textarea name="notes" rows="3" placeholder="Opcional">${esc(log.notes || '')}</textarea>
        </label>
        <p class="save-status" id="save-status" aria-live="polite">${s.logs[key] ? 'Guardado automáticamente' : 'Se guarda automáticamente al rellenar'}</p>
        ${s.logs[key] ? `<button type="button" class="btn ghost danger-text" data-action="delete-log">${I.trash}Borrar el registro de este día</button>` : ''}
      </form>

      <details class="card tip">
        <summary>${I.info}<span>¿Cómo mido los ángulos?</span>${I.chevron}</summary>
        <p>${esc(P.TIPS.find((t) => t.title === 'Cómo medir los ángulos').text)}</p>
      </details>

      ${history.length ? `<section><h2>Últimos registros</h2>
        <ul class="history">${history.map((k) => `<li><button data-action="goto-log" data-key="${k}"${k === key ? ' aria-current="date"' : ''}>
          <span class="h-date">${esc(D.format(k, { weekday: 'short', day: 'numeric', month: 'short' }))}</span>
          <span class="h-sum">${logSummary(s.logs[k], ctx.ordered)}</span></button></li>`).join('')}</ul></section>` : ''}
    `;
  }

  function saveLogForm(form) {
    const key = form.dataset.key;
    const fd = new FormData(form);
    const intIn = (name, min, max) => {
      const raw = String(fd.get(name) || '').trim().replace(',', '.');
      if (raw === '') return undefined;
      const v = Math.round(parseFloat(raw));
      if (isNaN(v)) return undefined;
      return Math.max(min, Math.min(max, v));
    };
    const entry = {};
    let any = false;
    Plan.SIDES.forEach((side) => {
      const k = {
        pain: intIn(side.key + '-pain', 0, 10),
        swelling: intIn(side.key + '-swelling', 0, 3),
        flex: intIn(side.key + '-flex', 0, 170),
        ext: intIn(side.key + '-ext', -20, 90)
      };
      Object.keys(k).forEach((f) => { if (k[f] === undefined) delete k[f]; else any = true; });
      entry[side.key] = k;
    });
    const notes = String(fd.get('notes') || '').trim();
    if (notes) { entry.notes = notes; any = true; }
    entry.updatedAt = new Date().toISOString();

    const ok = Store.update((s) => {
      if (any) s.logs[key] = entry; else delete s.logs[key];
    });
    const status = document.getElementById('save-status');
    if (status) status.textContent = ok ? (any ? 'Guardado ✓' : 'Registro vacío') : 'No se pudo guardar: el navegador no permite almacenamiento';
  }

  // ─────────────────────────── PROGRESO ───────────────────────────
  const DAY_MS = 86400000;

  function progMode(ctx) {
    if (ctx.sameDate) return 'fecha';
    return ui.progMode || 'dias';
  }

  /** Serie por rodilla. Modo 'dias': x = días desde la cirugía de esa rodilla; 'fecha': x = día del calendario. */
  function seriesFor(field, mode, ctx) {
    const s = st();
    const keys = Object.keys(s.logs).sort();
    return Plan.SIDES.map((side, i) => {
      const kc = ctx.bySide[side.key];
      const points = [];
      keys.forEach((k) => {
        const v = s.logs[k][side.key];
        if (!v || !num(v[field])) return;
        if (mode === 'dias') {
          const day = D.diffDays(kc.date, k);
          if (day >= 0) points.push({ x: day, y: v[field] });
        } else {
          points.push({ x: D.toUTC(k) / DAY_MS, y: v[field] });
        }
      });
      return { key: side.key, slot: i + 1, name: side.label, points };
    });
  }

  function lastValue(series) {
    const p = series.points;
    return p.length ? p[p.length - 1].y : null;
  }

  function maxValue(series) {
    return series.points.length ? Math.max(...series.points.map((p) => p.y)) : null;
  }

  function xLabel(mode, x, long) {
    if (mode === 'dias') return (long ? 'Día ' : 'día ') + Math.round(x);
    const k = D.fromUTC(Math.round(x) * DAY_MS);
    return long ? D.format(k, { weekday: 'short', day: 'numeric', month: 'short' }) : D.format(k);
  }

  function dataTable(series, unit, mode) {
    const xs = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort((a, b) => b - a);
    if (!xs.length) return '';
    const val = (s, x) => { const p = s.points.find((q) => q.x === x); return p ? p.y + unit : '—'; };
    return `<details class="table-view"><summary>Ver datos en tabla</summary>
      <table><thead><tr><th>${mode === 'dias' ? 'Día tras la cirugía' : 'Fecha'}</th>${series.map((s) => `<th>${esc(s.name)}</th>`).join('')}</tr></thead>
      <tbody>${xs.map((x) => `<tr><td>${esc(xLabel(mode, x, true))}</td>${series.map((s) => `<td>${val(s, x)}</td>`).join('')}</tr>`).join('')}</tbody></table></details>`;
  }

  const legend = (ref) => `<div class="legend">${Plan.SIDES.map((s, i) => `<span><i class="sw s${i + 1}"></i>${s.label}</span>`).join('')}${ref ? '<span><i class="sw-dash"></i>Evolución habitual</span>' : ''}</div>`;

  function chartCard(id, title, sub, series, unit, mode, ref) {
    const has = series.some((s) => s.points.length);
    return `<section class="card chart-card">
      <h2>${title}</h2>
      <p class="section-sub">${sub}</p>
      ${has ? `${legend(ref)}<div class="chart" id="${id}"></div>${dataTable(series, unit, mode)}` : '<p class="empty">Todavía no hay datos. Anótalos en Registro.</p>'}
    </section>`;
  }

  /** Flexión habitual según los días desde la cirugía (más lenta si hay sutura de menisco). */
  function flexReference(repair) {
    return repair
      ? [{ x: 3, y: 60 }, { x: 14, y: 90 }, { x: 42, y: 90 }, { x: 70, y: 120 }, { x: 112, y: 130 }, { x: 168, y: 135 }]
      : [{ x: 3, y: 60 }, { x: 14, y: 90 }, { x: 42, y: 120 }, { x: 84, y: 130 }, { x: 168, y: 135 }];
  }

  function viewProgreso() {
    const s = st();
    const ctx = Plan.context(s);
    const mode = progMode(ctx);
    const flex = seriesFor('flex', mode, ctx);
    const ext = seriesFor('ext', mode, ctx);
    const pain = seriesFor('pain', mode, ctx);
    const streak = Plan.streak(s);

    let sum = 0, n = 0;
    for (let i = 0; i < 7; i++) {
      const a = Plan.adherence(s, D.addDays(ctx.refKey, -i));
      if (a) { sum += a.pct; n++; }
    }
    const week = n ? Math.round(sum / n * 100) + '%' : '—';
    const deg = (v) => (v === null ? '—' : v + '°');

    const kneeStat = (kc) => {
      const i = kc.side === 'der' ? 0 : 1;
      return `<div class="stat knee-stat k-${kc.side}">
        <small><i class="kdot"></i>${kc.label}</small>
        <b>${kc.presurgery ? 'Sin operar' : 'Fase ' + kc.phase}</b>
        <small>${kc.order ? ordinal(kc) + ' · ' : ''}${kc.presurgery ? `faltan ${-kc.day} días` : `día ${kc.day}`}</small>
        <div class="stat-lines">
          <span>Mejor flexión <b>${deg(maxValue(flex[i]))}</b></span>
          <span>Le falta para recta <b>${deg(lastValue(ext[i]))}</b></span>
        </div>
      </div>`;
    };

    const cmp = Plan.comparison(s, ctx, 'flex');
    let cmpCard = '';
    if (cmp) {
      const diff = cmp.recentValue - cmp.firstValue;
      const verdict = Math.abs(diff) <= 5
        ? 'van muy parecidas.'
        : diff > 0
          ? `la ${cmp.recent.name} va ${diff}° por delante.`
          : `la ${cmp.recent.name} va ${-diff}° por detrás. Cada recuperación es distinta; si la diferencia crece, coméntalo con tu fisio.`;
      cmpCard = `<div class="card compare">${I.progreso}<div>
        <b>Día ${cmp.day} de cada rodilla</b>
        <p>La ${esc(cmp.recent.name)} dobla <b>${cmp.recentValue}°</b>. La ${esc(cmp.first.name)} doblaba <b>${cmp.firstValue}°</b> en su día ${cmp.firstDay}: ${esc(verdict)}</p>
      </div></div>`;
    }

    const toggle = ctx.sameDate ? '' : `<div class="segmented" role="group" aria-label="Cómo comparar las rodillas">
        <button data-action="prog-mode" data-mode="dias" aria-pressed="${mode === 'dias'}">Por día de recuperación</button>
        <button data-action="prog-mode" data-mode="fecha" aria-pressed="${mode === 'fecha'}">Por fecha</button>
      </div>`;
    const dias = mode === 'dias';

    return `
      <header class="page-head">
        <h1>Progreso</h1>
        <p class="section-sub">${ctx.sameDate ? 'Tus dos rodillas.' : 'Cada rodilla tiene su propia cirugía: compáralas en el mismo día de su recuperación.'}</p>
      </header>

      <div class="stats">
        ${ctx.ordered.map(kneeStat).join('')}
        <div class="stat"><small>Racha</small><b>${streak}</b><small>${streak === 1 ? 'día' : 'días'} haciendo al menos la mitad del plan</small></div>
        <div class="stat"><small>Últimos 7 días</small><b>${week}</b><small>del plan completado</small></div>
      </div>

      ${cmpCard}
      ${toggle}

      ${chartCard('ch-flex', 'Flexión', dias
        ? 'Cuánto se dobla cada rodilla según los días desde su cirugía. La línea discontinua es la evolución habitual.'
        : 'Cuánto se dobla cada rodilla, por fecha.', flex, '°', mode, dias)}
      ${chartCard('ch-ext', 'Extensión', 'Cuántos grados le faltan a cada rodilla para estar recta. La meta es 0°.', ext, '°', mode, false)}
      ${chartCard('ch-pain', 'Dolor', 'De 0 (nada) a 10 (máximo).', pain, '', mode, false)}

      <section class="card chart-card">
        <h2>Constancia</h2>
        <p class="section-sub">Porcentaje del plan diario completado (las dos rodillas), últimas 12 semanas.</p>
        <div class="heat-legend"><span>Menos</span><i class="cell-sw l0"></i><i class="cell-sw l1"></i><i class="cell-sw l2"></i><i class="cell-sw l3"></i><i class="cell-sw l4"></i><span>Más</span></div>
        <div class="chart" id="ch-heat"></div>
      </section>
    `;
  }

  function drawProgressCharts() {
    const s = st();
    const ctx = Plan.context(s);
    const mode = progMode(ctx);
    const dias = mode === 'dias';
    const xFmt = (x) => xLabel(mode, x, false);
    const tipFmt = (x) => xLabel(mode, x, true) + (dias ? ' tras su cirugía' : '');
    const repair = ctx.knees.some((k) => k.repair);
    const draw = () => {
      const el = (id) => document.getElementById(id);
      const base = { xFmt, tipFmt };
      if (el('ch-flex')) Charts.line(el('ch-flex'), Object.assign({}, base, {
        label: 'Flexión de cada rodilla', unit: '°', series: seriesFor('flex', mode, ctx), yMin: 0, yMax: 140,
        reference: dias ? flexReference(repair) : null
      }));
      if (el('ch-ext')) Charts.line(el('ch-ext'), Object.assign({}, base, {
        label: 'Grados que le faltan a cada rodilla para estar recta', unit: '°', series: seriesFor('ext', mode, ctx), yMin: 0, yMax: 10,
        target: { y: 0, label: 'Meta 0°' }
      }));
      if (el('ch-pain')) Charts.line(el('ch-pain'), Object.assign({}, base, {
        label: 'Dolor de cada rodilla', unit: '', series: seriesFor('pain', mode, ctx), yMin: 0, yMax: 10
      }));
      if (el('ch-heat')) {
        const start = Plan.trackingStart(s);
        Charts.heatmap(el('ch-heat'), {
          weeks: 12,
          today: D.todayKey(),
          valueFor: (k) => { const a = Plan.adherence(s, k, start); return a ? a.pct : null; }
        });
      }
    };
    requestAnimationFrame(draw);
  }

  // ─────────────────────────── PLAN ───────────────────────────
  const legsTag = { one: 'una pierna', both: 'dos piernas', any: 'general' };

  function phaseExercises(ph, ctx, s) {
    return P.EXERCISES.filter((e) => e.phases.includes(ph.id)).map((e) => {
      const gates = ctx.ordered.map((k) => ({ k, g: Plan.gateFor(e, k) })).filter((x) => x.g.minDay > 0);
      let lock = '';
      if (gates.length) {
        const withReason = gates.filter((x) => x.g.reason);
        lock = withReason.length
          ? withReason.map((x) => `${x.k.label}: desde las ${Math.round(x.g.minDay / 7)} semanas (${x.g.reason})`).join(' · ')
          : `Desde las ${Math.round(gates[0].g.minDay / 7)} semanas`;
      }
      return `<li>${esc(e.name)} <span class="tag">${legsTag[e.legs]}</span>${s.hidden[e.id] ? ' <span class="tag">oculto</span>' : ''}${lock ? `<span class="lock">${I.lock}${esc(lock)}</span>` : ''}</li>`;
    }).join('');
  }

  function viewPlan() {
    const s = st();
    const ctx = Plan.context(s);
    const showPrehab = ctx.knees.some((k) => k.presurgery);

    const phases = P.PHASES.filter((ph) => ph.id > 0 || showPrehab).map((ph) => {
      const here = ctx.ordered.filter((k) => k.phase === ph.id);
      const badges = here.map((k) => `<span class="kbadge k-${k.side}"><i class="kdot"></i>${k.label}</span>`).join('');
      const counts = ctx.ordered.map((k) =>
        `${k.label} ${ph.criteria.filter((c) => s.criteria[k.side + ':' + c.id]).length}/${ph.criteria.length}`).join(' · ');
      return `<details class="card phase${here.length ? ' current' : ''}"${here.length ? ' open' : ''}>
        <summary>
          <span class="phase-num">${ph.id}</span>
          <span class="phase-title"><b>${esc(ph.title)}</b><small>${ph.range}</small>${badges ? `<span class="kbadges">${badges}</span>` : ''}</span>
          ${I.chevron}
        </summary>
        <h3>Objetivos</h3>
        <ul class="bullets">${ph.goals.map((g) => `<li>${esc(g)}</li>`).join('')}</ul>
        <h3>Para pasar a la siguiente fase <small data-counts>${counts}</small></h3>
        <p class="section-sub">Marca cada criterio cuando lo cumpla esa rodilla.</p>
        <ul class="criteria">${ph.criteria.map((c) => `<li>
          <span>${esc(c.text)}</span>
          <span class="kchips">${ctx.ordered.map((k) => `<label class="kchip k-${k.side}"><input type="checkbox" data-criterion="${k.side}:${c.id}" data-phase="${ph.id}"${s.criteria[k.side + ':' + c.id] ? ' checked' : ''}><span>${k.side === 'der' ? 'Der.' : 'Izq.'}</span></label>`).join('')}</span>
        </li>`).join('')}</ul>
        <h3>Ejercicios</h3>
        <ul class="ex-names">${phaseExercises(ph, ctx, s)}</ul>
      </details>`;
    }).join('');

    const rhythm = ctx.sameDate ? '' : `<section class="card">
        <h2>Dos cirugías, dos ritmos</h2>
        <ul class="bullets">
          <li>Cada rodilla avanza por sus fases según el tiempo desde <b>su</b> operación (o la fase que fijes en Ajustes).</li>
          <li>Los ejercicios con <b>una pierna</b> siguen la fase de esa rodilla.</li>
          <li>Lo que usa <b>las dos piernas</b> (caminar, bici, sentadillas, correr, saltar) va al ritmo de la ${esc(ctx.recent.name)}, la operada más tarde.</li>
          <li>Volver al deporte depende de que <b>las dos</b> estén listas.</li>
        </ul>
      </section>`;

    return `
      <header class="page-head">
        <h1>Tu plan</h1>
        <p class="section-sub">Pasar de fase depende de cumplir los criterios, no solo del calendario: revísalos con tu fisio.</p>
        <div class="knee-cards">${ctx.ordered.map(kneeCard).join('')}</div>
      </header>

      ${rhythm}

      <section class="card danger" id="alarmas">
        <h2>${I.alert}Señales de alarma</h2>
        <p><b>Llama a emergencias si tienes:</b></p>
        <ul class="bullets">${P.RED_FLAGS.emergency.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        <p><b>Contacta hoy con tu cirujano o centro médico si notas:</b></p>
        <ul class="bullets">${P.RED_FLAGS.call.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      </section>

      <section><h2>Fases</h2>${phases}</section>

      <section>
        <h2>Consejos</h2>
        ${P.TIPS.map((t) => `<details class="card tip"><summary>${I.info}<span>${esc(t.title)}</span>${I.chevron}</summary><p>${esc(t.text)}</p></details>`).join('')}
      </section>

      <p class="disclaimer">Esta app es una guía general basada en protocolos habituales de rehabilitación de LCA y menisco. Tu cirujano y tu fisioterapeuta conocen tu operación y tienen la última palabra.</p>
    `;
  }

  // ─────────────────────────── AJUSTES ───────────────────────────
  const KNEE_TARGET = { ambas: 'las dos piernas', izq: 'pierna izquierda', der: 'pierna derecha' };

  function viewAjustes() {
    const s = st();
    const ctx = Plan.context(s);
    const kneeInfo = (kc) => `<div class="knee-info k-${kc.side}">
      <b><i class="kdot"></i>Rodilla ${kc.label.toLowerCase()}${kc.order ? ' · ' + ordinal(kc) : ''}</b>
      <span>${esc(D.format(kc.date, { day: 'numeric', month: 'long', year: 'numeric' }))}${kc.presurgery ? ' (prevista)' : ''}</span>
      <span>Menisco: ${esc(P.MENISCUS[kc.meniscus] || '—')}</span>
      <span>Injerto: ${esc(P.GRAFTS[kc.graft] || '—')}</span></div>`;
    const phaseSelect = (kc) => `<label class="field k-${kc.side}">
      <span class="field-label"><i class="kdot"></i>Rodilla ${kc.label.toLowerCase()}</span>
      <select class="select" data-phase-side="${kc.side}"${kc.presurgery ? ' disabled' : ''}>
        <option value="">${kc.presurgery ? 'Aún sin operar' : `Automática (ahora: fase ${kc.phaseAuto})`}</option>
        ${P.PHASES.filter((ph) => ph.id > 0).map((ph) => `<option value="${ph.id}"${s.phaseOverride[kc.side] === ph.id ? ' selected' : ''}>Fase ${ph.id} · ${esc(ph.short)}</option>`).join('')}
      </select></label>`;
    const hidden = Object.keys(s.hidden || {}).filter((id) => s.hidden[id]).map(findExercise).filter(Boolean);

    return `
      <header class="page-head"><h1>Ajustes</h1></header>

      <section class="card">
        <h2>Tus cirugías</h2>
        ${ctx.ordered.map(kneeInfo).join('')}
        <a class="btn ghost small" href="#perfil">Editar datos de las cirugías</a>
      </section>

      <section class="card">
        <h2>Fase de cada rodilla</h2>
        <p class="section-sub">Por defecto se calcula con el tiempo desde cada cirugía. Si tu fisio te dice que una rodilla está en otra fase, fíjala aquí.</p>
        ${ctx.ordered.map(phaseSelect).join('')}
      </section>

      <section class="card">
        <h2>Ejercicios de tu fisio</h2>
        <p class="section-sub">Aparecerán cada día en «Hoy», en la sección de la pierna que elijas.</p>
        ${s.custom.length ? `<ul class="plain-list">${s.custom.map((c) => `<li><span><b>${esc(c.name)}</b><small>${esc(KNEE_TARGET[c.knee] || KNEE_TARGET.ambas)}${c.dose ? ' · ' + esc(c.dose) : ''}${c.perDay > 1 ? ` · ${c.perDay} veces al día` : ''}</small></span>
          <button class="icon-btn" data-action="del-custom" data-id="${esc(c.id)}" aria-label="Borrar ${esc(c.name)}">${I.trash}</button></li>`).join('')}</ul>` : ''}
        <form id="custom-form" class="stack">
          <label class="field"><span class="field-label">Nombre</span><input name="name" required maxlength="80" placeholder="p. ej. Sentadilla isométrica en pared"></label>
          <label class="field"><span class="field-label">¿Con qué pierna?</span>
            <select name="knee" class="select">
              <option value="ambas">Las dos piernas a la vez</option>
              ${ctx.ordered.map((kc) => `<option value="${kc.side}">Solo la ${kc.side === 'der' ? 'derecha' : 'izquierda'}</option>`).join('')}
            </select></label>
          <div class="field-row">
            <label class="field"><span class="field-label">Dosis</span><input name="dose" maxlength="80" placeholder="p. ej. 3 × 45 s"></label>
            <label class="field"><span class="field-label">Veces al día</span>
              <select name="perDay" class="select">${[1, 2, 3, 4, 5, 6].map((n) => `<option>${n}</option>`).join('')}</select></label>
          </div>
          <label class="field"><span class="field-label">Notas</span><input name="notes" maxlength="200" placeholder="Opcional"></label>
          <button class="btn primary" type="submit">${I.plus}Añadir ejercicio</button>
        </form>
      </section>

      <section class="card">
        <h2>Ejercicios ocultos</h2>
        ${hidden.length ? `<ul class="plain-list">${hidden.map((e) => `<li><span>${esc(e.name)}</span><button class="btn ghost small" data-action="unhide-ex" data-id="${e.id}">Mostrar</button></li>`).join('')}</ul>`
          : '<p class="section-sub">Ninguno. Si tu fisio te dice que no hagas un ejercicio, ábrelo en «Hoy» y pulsa «No me toca».</p>'}
      </section>

      <section class="card">
        <h2>Copia de seguridad</h2>
        <p class="section-sub">Tus datos se guardan solo en este dispositivo. Exporta una copia de vez en cuando (y antes de cambiar de móvil).</p>
        <div class="row-actions">
          <button class="btn primary small" data-action="export">Exportar copia</button>
          <button class="btn ghost small" data-action="import">Importar copia</button>
          <input type="file" id="import-file" accept="application/json,.json" hidden>
        </div>
        ${!Store.storageOk() ? alertCard({ level: 'warn', text: 'Este navegador no está guardando los datos (¿modo privado?). Exporta una copia para no perderlos.' }) : ''}
      </section>

      <section class="card">
        <h2>Borrar todo</h2>
        <p class="section-sub">Elimina tu perfil, registros y ejercicios de este dispositivo.</p>
        <button class="btn ghost danger-text small" data-action="reset">${I.trash}Borrar todos los datos</button>
      </section>

      <p class="disclaimer">Rodillas v${VERSION}. Guía general de rehabilitación tras reconstrucción de LCA y cirugía de menisco. No sustituye el criterio de tu cirujano ni de tu fisioterapeuta.</p>
    `;
  }

  // ─────────────────────────── PERFIL / BIENVENIDA ───────────────────────────
  function kneeFormFields(side, k) {
    const opts = (map, sel) => Object.keys(map).map((v) => `<option value="${v}"${v === sel ? ' selected' : ''}>${esc(map[v])}</option>`).join('');
    const label = side === 'der' ? 'Rodilla derecha' : 'Rodilla izquierda';
    return `<fieldset class="card knee-form k-${side}" id="kf-${side}">
      <legend><i class="kdot"></i>${label} <small class="kf-order"></small></legend>
      <label class="field"><span class="field-label">Fecha de la cirugía</span><input type="date" name="${side}-date" required value="${esc(k.date || '')}"></label>
      <label class="field"><span class="field-label">¿Qué te hicieron en el menisco?</span><select class="select" name="${side}-meniscus">${opts(P.MENISCUS, k.meniscus || 'nose')}</select></label>
      <label class="field"><span class="field-label">Tipo de injerto del LCA</span><select class="select" name="${side}-graft">${opts(P.GRAFTS, k.graft || 'nose')}</select></label>
    </fieldset>`;
  }

  /** Texto con el orden y la separación entre las dos cirugías (se actualiza al cambiar las fechas). */
  function surgeryGapText(derDate, izqDate) {
    if (!D.isKey(derDate) || !D.isKey(izqDate)) return '';
    const gap = Math.abs(D.diffDays(derDate, izqDate));
    if (gap === 0) return 'Las dos en la misma fecha.';
    const first = derDate < izqDate ? 'derecha' : 'izquierda';
    const months = gap / 30.44;
    const approx = months >= 1 ? ` (unos ${Math.round(months * 2) / 2} meses)`.replace('.5', ',5') : '';
    return `Primero la ${first}; entre las dos cirugías hay ${gap} días${approx}.`;
  }

  function updateSurgeryOrder() {
    const der = document.querySelector('[name="der-date"]');
    const izq = document.querySelector('[name="izq-date"]');
    if (!der || !izq) return;
    const out = document.getElementById('surgery-gap');
    if (out) out.textContent = surgeryGapText(der.value, izq.value);
    const both = D.isKey(der.value) && D.isKey(izq.value) && der.value !== izq.value;
    const set = (side, n) => { const el = document.querySelector(`#kf-${side} .kf-order`); if (el) el.textContent = n ? `${n}.ª cirugía` : ''; };
    set('der', both ? (der.value < izq.value ? 1 : 2) : 0);
    set('izq', both ? (izq.value < der.value ? 1 : 2) : 0);
  }

  function viewProfile() {
    const s = st();
    const p = s.profile;
    const editing = !!p;
    const blank = { date: '', meniscus: 'nose', graft: 'nose' };
    const der = p ? p.knees.der : blank;
    const izq = p ? p.knees.izq : blank;
    setTimeout(updateSurgeryOrder, 0);

    return `
      ${editing ? `<header class="page-head"><h1>Tus cirugías</h1></header>` : `
      <header class="welcome">
        <img src="icons/icon.svg" alt="" width="72" height="72">
        <h1>Recupera tus rodillas</h1>
        <p>Tu plan diario de rehabilitación tras la cirugía de <b>LCA y menisco</b> en las dos rodillas, cada una con su propia operación: ejercicios por fases, registro de dolor y movilidad, y tu progreso en gráficos.</p>
      </header>`}

      <form id="profile-form" class="stack">
        <label class="card field"><span class="field-label">Tu nombre <small>(opcional)</small></span><input name="name" maxlength="40" value="${esc(p ? p.name : '')}" placeholder="Para saludarte"></label>

        <p class="section-sub">Indica la fecha y el tipo de cirugía de cada rodilla. Si una todavía no está operada, pon la fecha prevista.</p>
        ${kneeFormFields('izq', izq)}
        ${kneeFormFields('der', der)}
        <p class="gap-info" id="surgery-gap" aria-live="polite"></p>

        <p class="section-sub">¿No sabes qué te hicieron en el menisco o qué injerto te pusieron? Míralo en tu informe quirúrgico o pregúntalo. Mientras tanto, con «No lo sé» la app aplica las precauciones más prudentes.</p>

        ${editing ? '' : `<label class="card switch-row consent">
          <input type="checkbox" name="consent" required>
          <span>Entiendo que esta app es una guía general y que <b>mi cirujano y mi fisioterapeuta tienen la última palabra</b> sobre mis ejercicios y limitaciones.</span>
        </label>`}

        <button class="btn primary big" type="submit">${editing ? 'Guardar cambios' : 'Empezar mi recuperación'}</button>
        ${editing ? '<a class="btn ghost" href="#ajustes">Cancelar</a>' : ''}
      </form>
    `;
  }

  function saveProfile(form) {
    const fd = new FormData(form);
    const knee = (side) => ({
      date: String(fd.get(side + '-date') || ''),
      meniscus: String(fd.get(side + '-meniscus') || 'nose'),
      graft: String(fd.get(side + '-graft') || 'nose')
    });
    const der = knee('der');
    const izq = knee('izq');
    if (!D.isKey(der.date) || !D.isKey(izq.date)) {
      toast('Indica la fecha de cada cirugía');
      return;
    }
    const prev = st().profile;
    const first = !prev;
    Store.update((s) => {
      s.profile = {
        name: String(fd.get('name') || '').trim(),
        createdAt: (prev && prev.createdAt) || D.todayKey(),
        knees: { der, izq }
      };
    });
    if (first) Store.requestPersist();
    toast(first ? '¡Listo! Este es tu plan de hoy' : 'Datos actualizados');
    location.hash = first ? '#hoy' : '#ajustes';
    render();
  }

  // ─────────────────────────── TEMPORIZADOR ───────────────────────────
  let timer = null;
  let audioCtx = null;

  function beep(freq = 880, dur = 0.15, when = 0) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.frequency.value = freq;
      o.connect(g); g.connect(audioCtx.destination);
      const t = audioCtx.currentTime + when;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* sin audio */ }
  }
  function buzz(pattern) { try { navigator.vibrate && navigator.vibrate(pattern); } catch (e) { /* nada */ } }

  function fmtTime(ms) {
    const sec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function findItem(key) {
    return Plan.allItems(Plan.daily(st())).find((x) => x.key === key);
  }

  function openTimer(key) {
    const it = findItem(key);
    if (!it || !it.ex.timer) return;
    const ex = it.ex;
    const t = ex.timer;
    timer = {
      ex, key, side: it.side, work: t.work * 1000, rest: (t.rest || 0) * 1000, reps: t.reps || 1,
      workLabel: t.workLabel || (t.work <= 60 ? 'Aguanta' : 'En marcha'),
      restLabel: t.restLabel || 'Descansa',
      rep: 1, phase: 'ready', remaining: t.work * 1000, endAt: 0, interval: null, lastTick: null, wake: null
    };
    modalRoot.innerHTML = `<div class="modal-backdrop" data-action="timer-close">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="t-title">
        <h2 id="t-title">${esc(ex.name)}</h2>
        ${it.side ? `<p class="t-side k-${it.side}"><i class="kdot"></i>${esc(sideName(it.side))}</p>` : ''}
        <p class="t-dose">${esc(ex.dose || '')}</p>
        <div class="t-phase" id="t-phase"></div>
        <div class="t-time" id="t-time"></div>
        <div class="t-rep" id="t-rep"></div>
        <div class="t-actions" id="t-actions"></div>
      </div></div>`;
    document.body.classList.add('modal-open');
    updateTimerUI();
    const first = modalRoot.querySelector('.t-actions button');
    if (first) first.focus();
  }

  function updateTimerUI() {
    if (!timer) return;
    const phaseEl = document.getElementById('t-phase');
    const timeEl = document.getElementById('t-time');
    const repEl = document.getElementById('t-rep');
    const actEl = document.getElementById('t-actions');
    const running = !!timer.interval;
    const labels = { ready: 'Preparado/a', work: timer.workLabel, rest: timer.restLabel, done: '¡Hecho!' };
    phaseEl.textContent = (timer.paused ? 'En pausa · ' : '') + labels[timer.phase];
    phaseEl.className = 't-phase ' + timer.phase;
    timeEl.textContent = timer.phase === 'done' ? '✓' : fmtTime(timer.remaining);
    repEl.textContent = timer.reps > 1 && timer.phase !== 'done' ? `Repetición ${timer.rep} de ${timer.reps}` : '';

    const state = timer.phase === 'done' ? 'done' : running ? 'running' : timer.phase === 'ready' ? 'ready' : 'paused';
    if (actEl.dataset.state !== state) {
      actEl.dataset.state = state;
      actEl.innerHTML = state === 'done'
        ? `<button class="btn primary big" data-action="timer-done">${I.check}Marcar como hecho</button><button class="btn ghost" data-action="timer-close">Cerrar</button>`
        : `<button class="btn primary big" data-action="${running ? 'timer-pause' : 'timer-start'}">${running ? 'Pausar' : state === 'paused' ? 'Continuar' : 'Empezar'}</button>
           <div class="t-secondary"><button class="btn ghost" data-action="timer-reset">Reiniciar</button><button class="btn ghost" data-action="timer-close">Cerrar</button></div>`;
    }
  }

  function timerTick() {
    if (!timer || !timer.interval) return;
    const now = performance.now();
    timer.remaining = timer.endAt - now;
    // Pitidos en los últimos 3 segundos
    const secLeft = Math.ceil(timer.remaining / 1000);
    if (secLeft <= 3 && secLeft > 0 && secLeft !== timer.lastTick && (timer.phase === 'work' ? timer.work : timer.rest) >= 8000) {
      timer.lastTick = secLeft; beep(660, 0.08);
    }
    while (timer.remaining <= 0 && timer.phase !== 'done') {
      const over = -timer.remaining;
      if (timer.phase === 'work') {
        if (timer.rep >= timer.reps) {
          timer.phase = 'done';
          stopInterval();
          beep(880, 0.15); beep(880, 0.15, 0.25); beep(1175, 0.3, 0.5); buzz([200, 100, 200, 100, 300]);
          break;
        }
        if (timer.rest > 0) {
          timer.phase = 'rest'; timer.endAt = now - over + timer.rest;
          beep(523, 0.25); buzz(150);
        } else {
          timer.rep++; timer.endAt = now - over + timer.work;
          beep(880, 0.2); buzz(150);
        }
      } else if (timer.phase === 'rest') {
        timer.phase = 'work'; timer.rep++; timer.endAt = now - over + timer.work;
        beep(880, 0.2); buzz(150);
      }
      timer.remaining = timer.endAt - now;
      timer.lastTick = null;
    }
    updateTimerUI();
  }

  function stopInterval() {
    if (timer && timer.interval) { clearInterval(timer.interval); timer.interval = null; }
    if (timer && timer.wake) { try { timer.wake.release(); } catch (e) { /* nada */ } timer.wake = null; }
  }

  function timerStart() {
    if (!timer) return;
    if (timer.phase === 'ready') { timer.phase = 'work'; timer.remaining = timer.work; beep(880, 0.2); }
    timer.paused = false;
    timer.endAt = performance.now() + timer.remaining;
    timer.interval = setInterval(timerTick, 200);
    try {
      if (navigator.wakeLock) navigator.wakeLock.request('screen').then((w) => { if (timer) timer.wake = w; }).catch(() => {});
    } catch (e) { /* nada */ }
    updateTimerUI();
  }

  function timerPause() {
    if (!timer) return;
    timer.remaining = timer.endAt - performance.now();
    timer.paused = true;
    stopInterval();
    updateTimerUI();
  }

  function timerReset() {
    if (!timer) return;
    stopInterval();
    Object.assign(timer, { phase: 'ready', rep: 1, remaining: timer.work, paused: false, lastTick: null });
    updateTimerUI();
  }

  function timerClose() {
    stopInterval();
    timer = null;
    modalRoot.innerHTML = '';
    document.body.classList.remove('modal-open');
  }

  // ─────────────────────────── Acciones ───────────────────────────
  function incrementCount(key, perDay, wrap) {
    const today = D.todayKey();
    let count = 0;
    Store.update((s) => {
      const day = s.done[today] = s.done[today] || {};
      count = (day[key] || 0) + 1;
      if (count > perDay) count = wrap ? 0 : perDay;
      if (count) day[key] = count; else delete day[key];
    });
    return count;
  }

  const actions = {
    count(el) {
      const it = findItem(el.dataset.key);
      if (!it) return;
      const c = incrementCount(it.key, it.perDay, true);
      if (c === it.perDay) { buzz(30); }
      if (c === 0) toast('Desmarcado');
      render();
      const a = Plan.adherence(st(), D.todayKey());
      if (c === it.perDay && a && a.pct >= 1) toast('¡Plan de hoy completado! 💪');
    },
    'toggle-ex'(el) {
      const key = el.dataset.key;
      ui.expanded[key] = !ui.expanded[key];
      el.setAttribute('aria-expanded', String(ui.expanded[key]));
      const detail = el.parentElement.querySelector('.ex-detail');
      if (detail) detail.hidden = !ui.expanded[key];
    },
    timer(el) { openTimer(el.dataset.key); },
    'prog-mode'(el) { ui.progMode = el.dataset.mode; render(); },
    'hide-ex'(el) {
      Store.update((s) => { s.hidden[el.dataset.id] = true; });
      toast('Ocultado. Puedes recuperarlo en Ajustes');
      render();
    },
    'unhide-ex'(el) {
      Store.update((s) => { delete s.hidden[el.dataset.id]; });
      render();
    },
    'log-prev'() { ui.logDate = D.addDays(ui.logDate || D.todayKey(), -1); render(); },
    'log-next'() {
      const next = D.addDays(ui.logDate || D.todayKey(), 1);
      ui.logDate = next > D.todayKey() ? D.todayKey() : next;
      render();
    },
    'log-today'() { ui.logDate = null; render(); },
    'goto-log'(el) { ui.logDate = el.dataset.key; render(); window.scrollTo(0, 0); },
    'delete-log'() {
      const key = document.getElementById('log-form').dataset.key;
      if (!confirm('¿Borrar el registro de ' + longDate(key) + '?')) return;
      Store.update((s) => { delete s.logs[key]; });
      toast('Registro borrado');
      render();
    },
    'del-custom'(el) {
      const c = st().custom.find((x) => x.id === el.dataset.id);
      if (!c || !confirm('¿Borrar «' + c.name + '»?')) return;
      Store.update((s) => { s.custom = s.custom.filter((x) => x.id !== c.id); });
      render();
    },
    export() {
      const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'rodillas-copia-' + D.todayKey() + '.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      toast('Copia descargada');
    },
    import() { document.getElementById('import-file').click(); },
    reset() {
      if (!confirm('Se borrarán tu perfil, tus registros y tus ejercicios de este dispositivo. ¿Seguro?')) return;
      Store.reset();
      ui.logDate = null;
      location.hash = '#hoy';
      render();
    },
    'timer-start'() { timerStart(); },
    'timer-pause'() { timerPause(); },
    'timer-reset'() { timerReset(); },
    'timer-close'(el, e) {
      // Cerrar al tocar fuera solo si el toque es en el fondo
      if (el.classList.contains('modal-backdrop') && e.target !== el) return;
      timerClose();
    },
    'timer-done'() {
      const key = timer && timer.key;
      timerClose();
      if (!key) return;
      const it = findItem(key);
      if (it) { incrementCount(key, it.perDay, false); render(); toast('¡Bien hecho!'); }
    }
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const fn = actions[el.dataset.action];
    if (fn) { fn(el, e); }
  });

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'der-date' || t.name === 'izq-date') {
      updateSurgeryOrder();
    } else if (t.closest && t.closest('#log-form')) {
      saveLogForm(t.closest('#log-form'));
    } else if (t.dataset.criterion) {
      Store.update((s) => { if (t.checked) s.criteria[t.dataset.criterion] = true; else delete s.criteria[t.dataset.criterion]; });
      // Actualizar el recuento "Izquierda 2/5 · Derecha 0/5" de esa fase
      const details = t.closest('details');
      const ph = P.PHASES.find((x) => String(x.id) === t.dataset.phase);
      const counts = details && details.querySelector('[data-counts]');
      if (ph && counts) {
        const s = st();
        counts.textContent = Plan.context(s).ordered.map((k) =>
          `${k.label} ${ph.criteria.filter((c) => s.criteria[k.side + ':' + c.id]).length}/${ph.criteria.length}`).join(' · ');
      }
    } else if (t.dataset.phaseSide) {
      const side = t.dataset.phaseSide;
      Store.update((s) => {
        if (t.value) s.phaseOverride[side] = parseInt(t.value, 10); else delete s.phaseOverride[side];
      });
      toast(`${sideName(side)}: ` + (t.value ? 'fase ' + t.value + ' fijada' : 'fase automática'));
    } else if (t.id === 'import-file' && t.files && t.files[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          if (!confirm('Esto reemplazará los datos actuales de este dispositivo por los de la copia. ¿Continuar?')) return;
          Store.importJSON(String(reader.result));
          toast('Copia importada');
          location.hash = '#hoy';
          render();
        } catch (err) {
          toast('No se pudo importar: ' + err.message);
        }
      };
      reader.readAsText(t.files[0]);
      t.value = '';
    }
  });

  // Guardar notas mientras se escribe (con una pequeña espera)
  let notesTimer = null;
  document.addEventListener('input', (e) => {
    if (e.target.name === 'notes' && e.target.closest('#log-form')) {
      clearTimeout(notesTimer);
      notesTimer = setTimeout(() => saveLogForm(e.target.closest('#log-form')), 600);
    }
  });

  document.addEventListener('submit', (e) => {
    const f = e.target;
    e.preventDefault();
    if (f.id === 'profile-form') saveProfile(f);
    else if (f.id === 'log-form') { saveLogForm(f); toast('Registro guardado'); }
    else if (f.id === 'custom-form') {
      const fd = new FormData(f);
      const name = String(fd.get('name') || '').trim();
      if (!name) return;
      Store.update((s) => {
        s.custom.push({
          id: 'c-' + Date.now().toString(36),
          name,
          knee: ['der', 'izq'].includes(fd.get('knee')) ? String(fd.get('knee')) : 'ambas',
          dose: String(fd.get('dose') || '').trim(),
          perDay: parseInt(fd.get('perDay'), 10) || 1,
          notes: String(fd.get('notes') || '').trim()
        });
      });
      toast('Ejercicio añadido');
      render();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && timer) timerClose();
  });

  window.addEventListener('hashchange', () => { if (timer) timerClose(); render(); });

  // Si la app queda abierta y cambia el día, refrescar al volver
  let lastDay = D.todayKey();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && D.todayKey() !== lastDay && !timer) {
      lastDay = D.todayKey();
      render();
    }
  });

  let resizeT = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { if (parseRoute().name === 'progreso') drawProgressCharts(); }, 200);
  });

  // ─────────────────────────── Inicio ───────────────────────────
  tabbar.innerHTML = [
    ['hoy', 'Hoy'], ['registro', 'Registro'], ['progreso', 'Progreso'], ['plan', 'Plan'], ['ajustes', 'Ajustes']
  ].map(([k, label]) => `<a href="#${k}" data-tab="${k}">${I[k]}<span>${label}</span></a>`).join('');

  render();

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    // Si ya había una versión instalada y llega una nueva, recargar una vez para mostrarla.
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloading || timer) return;
      reloading = true;
      location.reload();
    });
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* sin modo offline */ });
    });
  }
})();
