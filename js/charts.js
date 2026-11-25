/*
 * Gráficos SVG ligeros (sin librerías) para la pantalla de Progreso.
 */
(function (root) {
  'use strict';

  var D = root.DateUtil;
  var NS = 'http://www.w3.org/2000/svg';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function niceStep(range, target) {
    var steps = [1, 2, 5, 10, 15, 20, 25, 30, 45, 50, 100];
    for (var i = 0; i < steps.length; i++) if (range / steps[i] <= target) return steps[i];
    return steps[steps.length - 1];
  }

  /**
   * Gráfico de líneas por fecha.
   * opts: { label, unit, series:[{key,name,points:[{x:'YYYY-MM-DD',y}]}], yMin, yMax, target:{y,label}, yFmt }
   */
  function line(el, opts) {
    var width = Math.max(260, el.clientWidth || 320);
    var height = 210;
    var m = { l: 34, r: 66, t: 14, b: 28 };
    var iw = width - m.l - m.r;
    var ih = height - m.t - m.b;
    var unit = opts.unit || '';

    var all = [];
    opts.series.forEach(function (s) { s.points.forEach(function (p) { all.push(p); }); });
    if (!all.length) { el.innerHTML = ''; return; }

    var xs = all.map(function (p) { return D.toUTC(p.x); });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    if (x1 - x0 < 2 * 86400000) { x0 -= 86400000; x1 += 86400000; }

    var ys = all.map(function (p) { return p.y; });
    if (opts.target) ys.push(opts.target.y);
    var yMin = Math.min(opts.yMin, Math.min.apply(null, ys));
    var yMax = Math.max(opts.yMax, Math.max.apply(null, ys));
    var step = niceStep(yMax - yMin, 5);
    yMin = Math.floor(yMin / step) * step;
    yMax = Math.ceil(yMax / step) * step;
    if (yMax === yMin) yMax = yMin + step;

    function sx(ms) { return m.l + (ms - x0) / (x1 - x0) * iw; }
    function sy(v) { return m.t + (1 - (v - yMin) / (yMax - yMin)) * ih; }

    var svg = '';
    // Rejilla y eje Y
    for (var v = yMin; v <= yMax + 1e-9; v += step) {
      var y = sy(v).toFixed(1);
      svg += '<line class="grid" x1="' + m.l + '" x2="' + (m.l + iw) + '" y1="' + y + '" y2="' + y + '"/>';
      svg += '<text class="tick" x="' + (m.l - 6) + '" y="' + y + '" dy="0.32em" text-anchor="end">' + v + '</text>';
    }
    // Eje X: 3 fechas
    var xTicks = [x0, (x0 + x1) / 2, x1];
    xTicks.forEach(function (ms, i) {
      var key = D.fromUTC(Math.round(ms / 86400000) * 86400000);
      var anchor = i === 0 ? 'start' : i === 2 ? 'end' : 'middle';
      svg += '<text class="tick" x="' + sx(ms).toFixed(1) + '" y="' + (height - 8) + '" text-anchor="' + anchor + '">' + esc(D.format(key)) + '</text>';
    });
    // Objetivo
    if (opts.target) {
      var ty = sy(opts.target.y).toFixed(1);
      svg += '<line class="target" x1="' + m.l + '" x2="' + (m.l + iw) + '" y1="' + ty + '" y2="' + ty + '"/>';
      svg += '<text class="target-label" x="' + (m.l + 4) + '" y="' + (sy(opts.target.y) - 5).toFixed(1) + '">' + esc(opts.target.label) + '</text>';
    }
    // Series
    var ends = [];
    opts.series.forEach(function (s, si) {
      if (!s.points.length) return;
      var pts = s.points.slice().sort(function (a, b) { return a.x < b.x ? -1 : 1; });
      var d = pts.map(function (p, i) {
        return (i ? 'L' : 'M') + sx(D.toUTC(p.x)).toFixed(1) + ',' + sy(p.y).toFixed(1);
      }).join('');
      svg += '<path class="series s' + (si + 1) + '" d="' + d + '"/>';
      pts.forEach(function (p) {
        svg += '<circle class="dot s' + (si + 1) + '" cx="' + sx(D.toUTC(p.x)).toFixed(1) + '" cy="' + sy(p.y).toFixed(1) + '" r="4"/>';
      });
      var last = pts[pts.length - 1];
      ends.push({ name: s.name, si: si, x: sx(D.toUTC(last.x)), y: sy(last.y) });
    });
    // Etiquetas directas al final de cada línea, separadas si chocan
    ends.sort(function (a, b) { return a.y - b.y; });
    for (var i = 1; i < ends.length; i++) {
      if (ends[i].y - ends[i - 1].y < 13) ends[i].y = ends[i - 1].y + 13;
    }
    ends.forEach(function (e) {
      svg += '<text class="end-label" x="' + (e.x + 8).toFixed(1) + '" y="' + e.y.toFixed(1) + '" dy="0.32em">' + esc(e.name) + '</text>';
    });
    // Capa de interacción
    svg += '<line class="crosshair" x1="0" x2="0" y1="' + m.t + '" y2="' + (m.t + ih) + '" visibility="hidden"/>';
    svg += '<rect class="hit" x="' + m.l + '" y="0" width="' + iw + '" height="' + height + '" fill="transparent"/>';

    el.innerHTML =
      '<svg viewBox="0 0 ' + width + ' ' + height + '" width="' + width + '" height="' + height + '" role="img" aria-label="' + esc(opts.label) + '">' + svg + '</svg>' +
      '<div class="tooltip" hidden></div>';

    // Tooltip con cruz al pasar el dedo / ratón
    var byDate = {};
    opts.series.forEach(function (s) {
      s.points.forEach(function (p) {
        (byDate[p.x] = byDate[p.x] || {})[s.key] = p.y;
      });
    });
    var dates = Object.keys(byDate).sort();
    var svgEl = el.querySelector('svg');
    var hit = el.querySelector('.hit');
    var cross = el.querySelector('.crosshair');
    var tip = el.querySelector('.tooltip');
    var fmt = opts.yFmt || function (v) { return v + unit; };

    function show(evt) {
      var rect = svgEl.getBoundingClientRect();
      var px = (evt.clientX - rect.left) * (width / rect.width);
      var best = null, bestDist = Infinity;
      dates.forEach(function (k) {
        var dist = Math.abs(sx(D.toUTC(k)) - px);
        if (dist < bestDist) { bestDist = dist; best = k; }
      });
      if (!best) return;
      var cx = sx(D.toUTC(best));
      cross.setAttribute('x1', cx); cross.setAttribute('x2', cx);
      cross.setAttribute('visibility', 'visible');
      var rows = opts.series.map(function (s, si) {
        var val = byDate[best][s.key];
        return '<div class="tt-row"><span class="sw s' + (si + 1) + '"></span>' + esc(s.name) +
          '<b>' + (val === undefined ? '—' : esc(fmt(val))) + '</b></div>';
      }).join('');
      tip.innerHTML = '<div class="tt-date">' + esc(D.format(best, { weekday: 'short', day: 'numeric', month: 'short' })) + '</div>' + rows;
      tip.hidden = false;
      var left = cx / width * rect.width;
      var tw = tip.offsetWidth;
      tip.style.left = Math.max(0, Math.min(rect.width - tw, left - tw / 2)) + 'px';
    }
    function hide() {
      cross.setAttribute('visibility', 'hidden');
      tip.hidden = true;
    }
    hit.addEventListener('pointermove', show);
    hit.addEventListener('pointerdown', show);
    // En pantallas táctiles el tooltip se queda visible al levantar el dedo.
    hit.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hide(); });
  }

  /**
   * Calendario de constancia (últimas N semanas).
   * opts: { weeks, today, valueFor(dateKey) -> null | 0..1, startKey }
   */
  function heatmap(el, opts) {
    var weeks = opts.weeks || 12;
    var today = opts.today;
    // Empieza en el lunes de hace (weeks-1) semanas
    var start = D.addDays(today, -D.weekday(today) - (weeks - 1) * 7);
    var labels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    var width = Math.max(260, el.clientWidth || 320);
    var lw = 18, gap = 3;
    var cell = Math.min(26, Math.floor((width - lw - gap * weeks) / weeks));
    var w = lw + weeks * (cell + gap);
    var h = 7 * (cell + gap) + 18;
    var svg = '';
    labels.forEach(function (l, r) {
      svg += '<text class="tick" x="0" y="' + (r * (cell + gap) + cell / 2) + '" dy="0.32em">' + l + '</text>';
    });
    for (var c = 0; c < weeks; c++) {
      var monday = D.addDays(start, c * 7);
      if (c === 0 || D.format(monday, { month: 'short' }) !== D.format(D.addDays(monday, -7), { month: 'short' })) {
        svg += '<text class="tick" x="' + (lw + c * (cell + gap)) + '" y="' + (h - 4) + '">' + esc(D.format(monday, { month: 'short' })) + '</text>';
      }
      for (var r = 0; r < 7; r++) {
        var key = D.addDays(start, c * 7 + r);
        if (key > today) continue;
        var v = opts.valueFor(key);
        var lvl = v === null ? 'none' : v >= 1 ? 4 : v >= 0.66 ? 3 : v >= 0.33 ? 2 : v > 0 ? 1 : 0;
        var title = D.format(key, { weekday: 'long', day: 'numeric', month: 'long' }) +
          (v === null ? '' : ': ' + Math.round(v * 100) + '% del plan');
        svg += '<rect class="cell l' + lvl + (key === today ? ' today' : '') + '" data-key="' + key + '" data-title="' + esc(title) + '" x="' +
          (lw + c * (cell + gap)) + '" y="' + (r * (cell + gap)) + '" width="' + cell + '" height="' + cell + '" rx="4"><title>' + esc(title) + '</title></rect>';
      }
    }
    el.innerHTML = '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="Calendario de constancia de las últimas ' + weeks + ' semanas">' + svg + '</svg>' +
      '<p class="heat-caption" aria-live="polite">Toca un día para ver el detalle.</p>';
    var cap = el.querySelector('.heat-caption');
    el.querySelector('svg').addEventListener('click', function (e) {
      var t = e.target.closest('.cell');
      if (t) cap.textContent = t.getAttribute('data-title');
    });
  }

  root.Charts = { line: line, heatmap: heatmap };
})(window);
