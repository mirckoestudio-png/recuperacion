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

  const VERSION = '1.0.0';

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

  function alertCard(a) {
    const icon = a.level === 'warn' ? I.alert : I.info;
    return `<div class="callout ${a.level}">${icon}<p>${esc(a.text)}</p></div>`;
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

  function exerciseRow(it) {
    const ex = it.ex;
    const id = ex.id;
    const full = it.count >= it.perDay;
    const open = !!ui.expanded[id];
    const p = Math.min(1, it.count / it.perDay);
    const counter = full
      ? I.check
      : it.perDay > 1 ? `<span>${it.count}/${it.perDay}</span>` : '';
    const label = full
      ? `${ex.name}: completado. Toca para desmarcar`
      : `${ex.name}: ${it.count} de ${it.perDay} hechas. Toca para sumar una`;

    let detail = '';
    if (it.custom) {
      detail = (ex.notes ? `<p>${esc(ex.notes)}</p>` : '<p class="muted">Ejercicio añadido por ti. Puedes editarlo o borrarlo en Ajustes.</p>');
    } else {
      detail = `
        <p class="why">${esc(ex.why)}</p>
        <ol class="steps">${ex.how.map((h) => `<li>${esc(h)}</li>`).join('')}</ol>
        ${it.notes.map((n) => alertCard({ level: 'warn', text: n })).join('')}
        ${ex.caution ? alertCard({ level: 'info', text: ex.caution }) : ''}
        <div class="row-actions">
          ${ex.timer ? `<button class="btn primary small" data-action="timer" data-id="${id}">${I.timer}Temporizador</button>` : ''}
          <button class="btn ghost small" data-action="hide-ex" data-id="${id}">${I.eyeOff}No me toca</button>
        </div>`;
    }

    return `<li class="ex${full ? ' done' : ''}">
      <button class="count" style="--p:${p}" data-action="count" data-id="${esc(id)}" aria-label="${esc(label)}">${counter}</button>
      <button class="ex-main" data-action="toggle-ex" data-id="${esc(id)}" aria-expanded="${open}">
        <span class="ex-text"><span class="ex-name">${esc(ex.name)}</span><span class="ex-dose">${esc(ex.dose || '')}</span></span>
        ${I.chevron}
      </button>
      <div class="ex-detail"${open ? '' : ' hidden'}>${detail}</div>
    </li>`;
  }

  function viewHoy() {
    const s = st();
    const d = Plan.daily(s);
    const ctx = d.ctx;
    const adh = Plan.adherence(s, ctx.refKey);
    const hello = s.profile.name ? `Hola, ${esc(s.profile.name)}` : 'Tu recuperación';

    let hero;
    if (ctx.presurgery) {
      hero = `<p class="eyebrow">${hello}</p>
        <h1>Faltan ${-ctx.day} ${-ctx.day === 1 ? 'día' : 'días'}</h1>
        <p class="hero-sub">para tu cirugía. Practica los ejercicios de la fase 1: después de operarte te será más fácil hacerlos.</p>`;
    } else {
      const kneeDays = ctx.sameDate ? '' :
        `<p class="hero-sub">${ctx.knees.map((k) => `${k.label}: día ${k.day}`).join(' · ')}</p>`;
      hero = `<div class="hero-row">
          <div>
            <p class="eyebrow">${hello}</p>
            <h1>Día ${ctx.day} <span class="muted">· semana ${ctx.week}</span></h1>
            <a class="phase-pill" href="#plan">Fase ${ctx.phase} · ${esc(ctx.phaseObj.short)}${ctx.manual ? ' (fijada)' : ''}</a>
            ${kneeDays}
          </div>
          ${adh ? ring(adh.pct) : ''}
        </div>`;
    }

    const alerts = Plan.alerts(s, ctx);
    const prec = Plan.precautions(ctx);
    const required = d.items.filter((i) => !i.optional);
    const optional = d.items.filter((i) => i.optional);
    const hasLogToday = !!s.logs[ctx.refKey];

    return `
      <header class="hero">${hero}</header>
      ${alerts.map(alertCard).join('')}
      ${!hasLogToday ? `<a class="card cta" href="#registro">${I.registro}<span><b>¿Cómo están hoy tus rodillas?</b><small>Anota dolor, hinchazón y ángulos: 1 minuto</small></span>${I.chevron}</a>` : ''}

      <details class="card precautions">
        <summary>${I.alert}<span>Precauciones ahora <small>(${prec.length})</small></span>${I.chevron}</summary>
        <ul>${prec.map((p) => `<li class="${p.level}">${esc(p.text)}</li>`).join('')}</ul>
      </details>

      <section>
        <h2>Ejercicios de hoy</h2>
        <p class="section-sub">Toca el círculo cada vez que completes una sesión. Toca el nombre para ver cómo se hace.</p>
        <ul class="ex-list">${required.map(exerciseRow).join('')}</ul>
      </section>

      ${d.custom.length ? `<section><h2>De tu fisio</h2><ul class="ex-list">${d.custom.map(exerciseRow).join('')}</ul></section>` : ''}

      ${optional.length ? `<section><h2>Opcionales</h2>
        <p class="section-sub">Días alternos o cuando tu fisio lo autorice. No cuentan para el % del día.</p>
        <ul class="ex-list">${optional.map(exerciseRow).join('')}</ul></section>` : ''}

      <a class="card redflag-link" href="#plan/alarmas">${I.phone}<span><b>Señales de alarma</b><small>Cuándo llamar a tu médico o a urgencias</small></span>${I.chevron}</a>
    `;
  }

  // ─────────────────────────── REGISTRO ───────────────────────────
  const SWELLING = ['Nada', 'Leve', 'Moderada', 'Mucha'];

  function kneeLogFields(side, label, k, ctxKnee) {
    k = k || {};
    const painChips = Array.from({ length: 11 }, (_, v) =>
      `<label class="chip"><input type="radio" name="${side}-pain" value="${v}"${k.pain === v ? ' checked' : ''}><span>${v}</span></label>`).join('');
    const swellChips = SWELLING.map((t, v) =>
      `<label class="chip wide"><input type="radio" name="${side}-swelling" value="${v}"${k.swelling === v ? ' checked' : ''}><span>${t}</span></label>`).join('');
    return `<fieldset class="card knee-log">
      <legend>${I.knee}Rodilla ${label}${ctxKnee && ctxKnee.day >= 0 ? ` <small>· día ${ctxKnee.day}</small>` : ''}</legend>
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

  function logSummary(log) {
    return Plan.SIDES.map((s) => {
      const k = log[s.key] || {};
      const parts = [];
      if (num(k.pain)) parts.push(`dolor ${k.pain}`);
      if (num(k.flex)) parts.push(`${k.flex}° flex.`);
      if (num(k.ext)) parts.push(`ext. ${k.ext}°`);
      return parts.length ? `<span><b>${s.short}</b> ${parts.join(', ')}</span>` : '';
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
        ${Plan.SIDES.map((side, i) => kneeLogFields(side.key, side.label.toLowerCase(), log[side.key], ctx.knees[i])).join('')}
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
          <span class="h-sum">${logSummary(s.logs[k])}</span></button></li>`).join('')}</ul></section>` : ''}
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
  function seriesFor(field) {
    const s = st();
    return Plan.SIDES.map((side) => ({
      key: side.key,
      name: side.label,
      points: Object.keys(s.logs).sort()
        .filter((k) => s.logs[k][side.key] && num(s.logs[k][side.key][field]))
        .map((k) => ({ x: k, y: s.logs[k][side.key][field] }))
    }));
  }

  function lastValue(series) {
    const p = series.points;
    return p.length ? p[p.length - 1].y : null;
  }

  function maxValue(series) {
    return series.points.length ? Math.max(...series.points.map((p) => p.y)) : null;
  }

  function dataTable(series, unit) {
    const dates = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort().reverse();
    if (!dates.length) return '';
    const val = (s, k) => { const p = s.points.find((q) => q.x === k); return p ? p.y + unit : '—'; };
    return `<details class="table-view"><summary>Ver datos en tabla</summary>
      <table><thead><tr><th>Fecha</th>${series.map((s) => `<th>${esc(s.name)}</th>`).join('')}</tr></thead>
      <tbody>${dates.map((k) => `<tr><td>${esc(D.format(k))}</td>${series.map((s) => `<td>${val(s, k)}</td>`).join('')}</tr>`).join('')}</tbody></table></details>`;
  }

  const legend = () => `<div class="legend">${Plan.SIDES.map((s, i) => `<span><i class="sw s${i + 1}"></i>${s.label}</span>`).join('')}</div>`;

  function chartCard(id, title, sub, series, unit) {
    const has = series.some((s) => s.points.length);
    return `<section class="card chart-card">
      <h2>${title}</h2>
      <p class="section-sub">${sub}</p>
      ${has ? `${legend()}<div class="chart" id="${id}"></div>${dataTable(series, unit)}` : '<p class="empty">Todavía no hay datos. Anótalos en Registro.</p>'}
    </section>`;
  }

  function viewProgreso() {
    const s = st();
    const ctx = Plan.context(s);
    const flex = seriesFor('flex');
    const ext = seriesFor('ext');
    const pain = seriesFor('pain');
    const streak = Plan.streak(s);

    let sum = 0, n = 0;
    for (let i = 0; i < 7; i++) {
      const a = Plan.adherence(s, D.addDays(ctx.refKey, -i));
      if (a) { sum += a.pct; n++; }
    }
    const week = n ? Math.round(sum / n * 100) + '%' : '—';
    const pair = (a, b, u) => `<span>D ${a === null ? '—' : a + u}</span><span>I ${b === null ? '—' : b + u}</span>`;

    return `
      <header class="page-head">
        <h1>Progreso</h1>
        <p class="section-sub">${ctx.presurgery ? 'Aún no te has operado.' : `Día ${ctx.day} desde la cirugía · fase ${ctx.phase}`}</p>
      </header>

      <div class="stats">
        <div class="stat"><small>Mejor flexión</small><div class="stat-pair">${pair(maxValue(flex[0]), maxValue(flex[1]), '°')}</div></div>
        <div class="stat"><small>Le falta para estar recta</small><div class="stat-pair">${pair(lastValue(ext[0]), lastValue(ext[1]), '°')}</div></div>
        <div class="stat"><small>Racha</small><b>${streak}</b><small>${streak === 1 ? 'día' : 'días'} haciendo al menos la mitad del plan</small></div>
        <div class="stat"><small>Últimos 7 días</small><b>${week}</b><small>del plan completado</small></div>
      </div>

      ${chartCard('ch-flex', 'Flexión', `Cuánto se doblan tus rodillas. Meta de esta fase: ${ctx.phaseObj.flexTarget}°.`, flex, '°')}
      ${chartCard('ch-ext', 'Extensión', 'Cuántos grados le faltan para estar recta. La meta es 0°.', ext, '°')}
      ${chartCard('ch-pain', 'Dolor', 'De 0 (nada) a 10 (máximo).', pain, '')}

      <section class="card chart-card">
        <h2>Constancia</h2>
        <p class="section-sub">Porcentaje del plan diario completado, últimas 12 semanas.</p>
        <div class="heat-legend"><span>Menos</span><i class="cell-sw l0"></i><i class="cell-sw l1"></i><i class="cell-sw l2"></i><i class="cell-sw l3"></i><i class="cell-sw l4"></i><span>Más</span></div>
        <div class="chart" id="ch-heat"></div>
      </section>
    `;
  }

  function drawProgressCharts() {
    const s = st();
    const ctx = Plan.context(s);
    const draw = () => {
      const el = (id) => document.getElementById(id);
      if (el('ch-flex')) Charts.line(el('ch-flex'), { label: 'Flexión de cada rodilla por fecha', unit: '°', series: seriesFor('flex'), yMin: 0, yMax: 140, target: { y: ctx.phaseObj.flexTarget, label: `Meta ${ctx.phaseObj.flexTarget}°` } });
      if (el('ch-ext')) Charts.line(el('ch-ext'), { label: 'Grados que le faltan a cada rodilla para estar recta', unit: '°', series: seriesFor('ext'), yMin: 0, yMax: 10, target: { y: 0, label: 'Meta 0°' } });
      if (el('ch-pain')) Charts.line(el('ch-pain'), { label: 'Dolor de cada rodilla por fecha', unit: '', series: seriesFor('pain'), yMin: 0, yMax: 10 });
      if (el('ch-heat')) Charts.heatmap(el('ch-heat'), {
        weeks: 12,
        today: D.todayKey(),
        valueFor: (k) => { const a = Plan.adherence(s, k); return a ? a.pct : null; }
      });
    };
    requestAnimationFrame(draw);
  }

  // ─────────────────────────── PLAN ───────────────────────────
  function viewPlan() {
    const s = st();
    const ctx = Plan.context(s);

    const phases = P.PHASES.map((ph) => {
      const current = ph.id === ctx.phase;
      const fakeCtx = Object.assign({}, ctx, { phase: ph.id });
      const exs = P.EXERCISES.filter((e) => e.phases.includes(ph.id)).map((e) => Plan.exerciseStatus(e, fakeCtx, s));
      const done = ph.criteria.filter((c) => s.criteria[c.id]).length;
      return `<details class="card phase${current ? ' current' : ''}"${current ? ' open' : ''}>
        <summary>
          <span class="phase-num">${ph.id}</span>
          <span class="phase-title"><b>${esc(ph.title)}</b><small>${ph.range}${current ? ' · <em>estás aquí</em>' : ''}</small></span>
          ${I.chevron}
        </summary>
        <h3>Objetivos</h3>
        <ul class="bullets">${ph.goals.map((g) => `<li>${esc(g)}</li>`).join('')}</ul>
        <h3>Para pasar a la siguiente fase <small>${done}/${ph.criteria.length}</small></h3>
        <ul class="checklist">${ph.criteria.map((c) => `<li><label><input type="checkbox" data-criterion="${c.id}"${s.criteria[c.id] ? ' checked' : ''}><span>${esc(c.text)}</span></label></li>`).join('')}</ul>
        <h3>Ejercicios</h3>
        <ul class="ex-names">${exs.map((x) => `<li>${esc(x.ex.name)}${x.hidden ? ' <span class="tag">oculto</span>' : ''}${x.locked ? `<span class="lock">${I.lock}${esc(x.lockText)}</span>` : ''}</li>`).join('')}</ul>
      </details>`;
    }).join('');

    return `
      <header class="page-head">
        <h1>Tu plan</h1>
        <p class="section-sub">${ctx.manual
          ? `Fase ${ctx.phase} fijada manualmente (por tiempo te correspondería la ${ctx.phaseAuto}).`
          : `Fase ${ctx.phase} según el tiempo desde la cirugía.`}
          Pasar de fase depende de cumplir los criterios, no solo del calendario: revísalos con tu fisio.
          ${!ctx.sameDate ? ` El plan sigue a la rodilla ${ctx.refKnee.label.toLowerCase()}, la operada más recientemente.` : ''}</p>
      </header>

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
  function viewAjustes() {
    const s = st();
    const ctx = Plan.context(s);
    const p = s.profile;
    const kneeInfo = (k, label) => `<div class="knee-info"><b>${label}</b>
      <span>${esc(D.format(k.date, { day: 'numeric', month: 'long', year: 'numeric' }))}</span>
      <span>Menisco: ${esc(P.MENISCUS[k.meniscus] || '—')}</span>
      <span>Injerto: ${esc(P.GRAFTS[k.graft] || '—')}</span></div>`;
    const hidden = Object.keys(s.hidden || {}).filter((id) => s.hidden[id]).map(findExercise).filter(Boolean);

    return `
      <header class="page-head"><h1>Ajustes</h1></header>

      <section class="card">
        <h2>Tu cirugía</h2>
        ${p.sameSurgery ? kneeInfo(p.knees.der, 'Ambas rodillas') : kneeInfo(p.knees.der, 'Rodilla derecha') + kneeInfo(p.knees.izq, 'Rodilla izquierda')}
        <a class="btn ghost small" href="#perfil">Editar datos de la cirugía</a>
      </section>

      <section class="card">
        <h2>Fase del plan</h2>
        <p class="section-sub">Si tu fisio te dice que estás en otra fase, fíjala aquí.</p>
        <select id="phase-override" class="select">
          <option value="">Automática (ahora: fase ${ctx.phaseAuto})</option>
          ${P.PHASES.map((ph) => `<option value="${ph.id}"${s.phaseOverride === ph.id ? ' selected' : ''}>Fase ${ph.id} · ${esc(ph.short)}</option>`).join('')}
        </select>
      </section>

      <section class="card">
        <h2>Ejercicios de tu fisio</h2>
        <p class="section-sub">Aparecerán cada día en «Hoy», en cualquier fase.</p>
        ${s.custom.length ? `<ul class="plain-list">${s.custom.map((c) => `<li><span><b>${esc(c.name)}</b><small>${esc(c.dose || '')}${c.perDay > 1 ? ` · ${c.perDay} veces al día` : ''}</small></span>
          <button class="icon-btn" data-action="del-custom" data-id="${esc(c.id)}" aria-label="Borrar ${esc(c.name)}">${I.trash}</button></li>`).join('')}</ul>` : ''}
        <form id="custom-form" class="stack">
          <label class="field"><span class="field-label">Nombre</span><input name="name" required maxlength="80" placeholder="p. ej. Sentadilla isométrica en pared"></label>
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
  function kneeFormFields(side, k, legend, required) {
    const opts = (map, sel) => Object.keys(map).map((v) => `<option value="${v}"${v === sel ? ' selected' : ''}>${esc(map[v])}</option>`).join('');
    return `<fieldset class="card knee-form" id="kf-${side}">
      <legend>${I.knee}<span class="kf-legend">${legend}</span></legend>
      <label class="field"><span class="field-label">Fecha de la cirugía</span><input type="date" name="${side}-date"${required ? ' required' : ''} value="${esc(k.date || '')}"></label>
      <label class="field"><span class="field-label">¿Qué te hicieron en el menisco?</span><select class="select" name="${side}-meniscus">${opts(P.MENISCUS, k.meniscus || 'nose')}</select></label>
      <label class="field"><span class="field-label">Tipo de injerto del LCA</span><select class="select" name="${side}-graft">${opts(P.GRAFTS, k.graft || 'nose')}</select></label>
    </fieldset>`;
  }

  function viewProfile() {
    const s = st();
    const p = s.profile;
    const editing = !!p;
    const blank = { date: '', meniscus: 'nose', graft: 'nose' };
    const der = p ? p.knees.der : blank;
    const izq = p ? p.knees.izq : blank;
    const same = p ? p.sameSurgery : true;

    return `
      ${editing ? `<header class="page-head"><h1>Tu cirugía</h1></header>` : `
      <header class="welcome">
        <img src="icons/icon.svg" alt="" width="72" height="72">
        <h1>Recupera tus rodillas</h1>
        <p>Tu plan diario de rehabilitación tras la cirugía de <b>LCA y menisco</b> en las dos rodillas: ejercicios por fases, registro de dolor y movilidad, y tu progreso en gráficos.</p>
      </header>`}

      <form id="profile-form" class="stack">
        <label class="card field"><span class="field-label">Tu nombre <small>(opcional)</small></span><input name="name" maxlength="40" value="${esc(p ? p.name : '')}" placeholder="Para saludarte"></label>

        <label class="card switch-row">
          <input type="checkbox" name="same" id="same-surgery"${same ? ' checked' : ''}>
          <span>Me operaron las dos rodillas el mismo día y con la misma técnica</span>
        </label>

        ${kneeFormFields('der', der, same ? 'Ambas rodillas' : 'Rodilla derecha', true)}
        <div id="izq-wrap"${same ? ' hidden' : ''}>${kneeFormFields('izq', izq, 'Rodilla izquierda', !same)}</div>

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
    const same = !!fd.get('same');
    const knee = (side) => ({
      date: String(fd.get(side + '-date') || ''),
      meniscus: String(fd.get(side + '-meniscus') || 'nose'),
      graft: String(fd.get(side + '-graft') || 'nose')
    });
    const der = knee('der');
    const izq = same ? Object.assign({}, der) : knee('izq');
    if (!D.isKey(der.date) || !D.isKey(izq.date)) {
      toast('Indica la fecha de la cirugía');
      return;
    }
    const first = !st().profile;
    Store.update((s) => {
      s.profile = { name: String(fd.get('name') || '').trim(), sameSurgery: same, knees: { der, izq } };
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

  function openTimer(id) {
    const ex = findExercise(id);
    if (!ex || !ex.timer) return;
    const t = ex.timer;
    timer = {
      ex, work: t.work * 1000, rest: (t.rest || 0) * 1000, reps: t.reps || 1,
      workLabel: t.workLabel || (t.work <= 60 ? 'Aguanta' : 'En marcha'),
      restLabel: t.restLabel || 'Descansa',
      rep: 1, phase: 'ready', remaining: t.work * 1000, endAt: 0, interval: null, lastTick: null, wake: null
    };
    modalRoot.innerHTML = `<div class="modal-backdrop" data-action="timer-close">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="t-title">
        <h2 id="t-title">${esc(ex.name)}</h2>
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
  function incrementCount(id, perDay, wrap) {
    const today = D.todayKey();
    let count = 0;
    Store.update((s) => {
      const day = s.done[today] = s.done[today] || {};
      count = (day[id] || 0) + 1;
      if (count > perDay) count = wrap ? 0 : perDay;
      if (count) day[id] = count; else delete day[id];
    });
    return count;
  }

  const actions = {
    count(el) {
      const d = Plan.daily(st());
      const it = d.items.concat(d.custom).find((x) => x.ex.id === el.dataset.id);
      if (!it) return;
      const c = incrementCount(it.ex.id, it.perDay, true);
      if (c === it.perDay) { buzz(30); }
      if (c === 0) toast('Desmarcado');
      render();
      const a = Plan.adherence(st(), D.todayKey());
      if (c === it.perDay && a && a.pct >= 1) toast('¡Plan de hoy completado! 💪');
    },
    'toggle-ex'(el) {
      const id = el.dataset.id;
      ui.expanded[id] = !ui.expanded[id];
      el.setAttribute('aria-expanded', String(ui.expanded[id]));
      const detail = el.parentElement.querySelector('.ex-detail');
      if (detail) detail.hidden = !ui.expanded[id];
    },
    timer(el) { openTimer(el.dataset.id); },
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
      const id = timer && timer.ex.id;
      timerClose();
      if (!id) return;
      const d = Plan.daily(st());
      const it = d.items.concat(d.custom).find((x) => x.ex.id === id);
      if (it) { incrementCount(id, it.perDay, false); render(); toast('¡Bien hecho!'); }
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
    if (t.id === 'same-surgery') {
      document.getElementById('izq-wrap').hidden = t.checked;
      document.querySelector('#kf-der .kf-legend').textContent = t.checked ? 'Ambas rodillas' : 'Rodilla derecha';
      const izqDate = document.querySelector('[name="izq-date"]');
      izqDate.required = !t.checked;
      // Al separar las rodillas, partir de los datos de la derecha
      if (!t.checked && !izqDate.value) {
        ['date', 'meniscus', 'graft'].forEach((f) => {
          document.querySelector(`[name="izq-${f}"]`).value = document.querySelector(`[name="der-${f}"]`).value;
        });
      }
    } else if (t.closest && t.closest('#log-form')) {
      saveLogForm(t.closest('#log-form'));
    } else if (t.dataset.criterion) {
      Store.update((s) => { if (t.checked) s.criteria[t.dataset.criterion] = true; else delete s.criteria[t.dataset.criterion]; });
      const h3 = t.closest('details').querySelectorAll('h3')[1];
      const list = t.closest('.checklist');
      const small = h3 && h3.querySelector('small');
      if (small) small.textContent = list.querySelectorAll('input:checked').length + '/' + list.querySelectorAll('input').length;
    } else if (t.id === 'phase-override') {
      Store.update((s) => { s.phaseOverride = t.value ? parseInt(t.value, 10) : null; });
      toast(t.value ? 'Fase ' + t.value + ' fijada' : 'Fase automática');
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
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* sin modo offline */ });
    });
  }
})();
