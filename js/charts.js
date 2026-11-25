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

  /** Recorta una polilínea al intervalo [x0, x1] interpolando en los bordes. */
  function clip(points, x0, x1) {
    var out = [];
    for (var i = 0; i < points.length; i++) {
      var p = points[i], q = points[i + 1];
      if (p.x >= x0 && p.x <= x1) out.push(p);
      if (!q) break;
      [x0, x1].forEach(function (b) {
        if ((p.x < b && q.x > b)) out.push({ x: b, y: p.y + (q.y - p.y) * (b - p.x) / (q.x - p.x) });
      });
    }
    return out.sort(function (a, b) { return a.x - b.x; });
  }

  /**
   * Gráfico de líneas con eje X numérico (días).
   * opts: {
   *   label, unit,
   *   series: [{ key, slot, name, points: [{ x, y }] }],
   *   yMin, yMax,
   *   target: { y, label },          línea horizontal de meta
   *   reference: [{ x, y }],         curva de referencia discontinua
   *   xFmt(x), tipFmt(x)             textos del eje y del tooltip
   * }
   */
  function line(el, opts) {
    var width = Math.max(260, el.clientWidth || 320);
    var height = 210;
    var m = { l: 34, r: 66, t: 14, b: 28 };
    var iw = width - m.l - m.r;
    var ih = height - m.t - m.b;
    var unit = opts.unit || '';
    var xFmt = opts.xFmt || function (x) { return String(x); };
    var tipFmt = opts.tipFmt || xFmt;

    var all = [];
    opts.series.forEach(function (s) { s.points.forEach(function (p) { all.push(p); }); });
    if (!all.length) { el.innerHTML = ''; return; }

    var xs = all.map(function (p) { return p.x; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    if (x1 - x0 < 2) { x0 -= 1; x1 += 1; }

    var ref = opts.reference ? clip(opts.reference, x0, x1) : [];
    var ys = all.map(function (p) { return p.y; });
    ref.forEach(function (p) { ys.push(p.y); });
    if (opts.target) ys.push(opts.target.y);
    var yMin = Math.min(opts.yMin, Math.min.apply(null, ys));
    var yMax = Math.max(opts.yMax, Math.max.apply(null, ys));
    var step = niceStep(yMax - yMin, 5);
    yMin = Math.floor(yMin / step) * step;
    yMax = Math.ceil(yMax / step) * step;
    if (yMax === yMin) yMax = yMin + step;

    function sx(v) { return m.l + (v - x0) / (x1 - x0) * iw; }
    function sy(v) { return m.t + (1 - (v - yMin) / (yMax - yMin)) * ih; }
    function path(pts) {
      return pts.map(function (p, i) { return (i ? 'L' : 'M') + sx(p.x).toFixed(1) + ',' + sy(p.y).toFixed(1); }).join('');
    }

    var svg = '';
    // Rejilla y eje Y
    for (var v = yMin; v <= yMax + 1e-9; v += step) {
      var y = sy(v).toFixed(1);
      svg += '<line class="grid" x1="' + m.l + '" x2="' + (m.l + iw) + '" y1="' + y + '" y2="' + y + '"/>';
      svg += '<text class="tick" x="' + (m.l - 6) + '" y="' + y + '" dy="0.32em" text-anchor="end">' + v + '</text>';
    }
    // Eje X: 3 marcas
    [x0, (x0 + x1) / 2, x1].forEach(function (xv, i) {
      var anchor = i === 0 ? 'start' : i === 2 ? 'end' : 'middle';
      svg += '<text class="tick" x="' + sx(xv).toFixed(1) + '" y="' + (height - 8) + '" text-anchor="' + anchor + '">' + esc(xFmt(Math.round(xv))) + '</text>';
    });
    // Meta
    if (opts.target) {
      var ty = sy(opts.target.y).toFixed(1);
      svg += '<line class="target" x1="' + m.l + '" x2="' + (m.l + iw) + '" y1="' + ty + '" y2="' + ty + '"/>';
      svg += '<text class="target-label" x="' + (m.l + 4) + '" y="' + (sy(opts.target.y) - 5).toFixed(1) + '">' + esc(opts.target.label) + '</text>';
    }
    // Referencia
    if (ref.length > 1) svg += '<path class="reference" d="' + path(ref) + '"/>';
    // Series
    var ends = [];
    opts.series.forEach(function (s, si) {
      if (!s.points.length) return;
      var cls = 's' + (s.slot || si + 1);
      var pts = s.points.slice().sort(function (a, b) { return a.x - b.x; });
      svg += '<path class="series ' + cls + '" d="' + path(pts) + '"/>';
      pts.forEach(function (p) {
        svg += '<circle class="dot ' + cls + '" cx="' + sx(p.x).toFixed(1) + '" cy="' + sy(p.y).toFixed(1) + '" r="4"/>';
      });
      var last = pts[pts.length - 1];
      ends.push({ name: s.name, x: sx(last.x), y: sy(last.y) });
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
    var byX = {};
    opts.series.forEach(function (s) {
      s.points.forEach(function (p) { (byX[p.x] = byX[p.x] || {})[s.key] = p.y; });
    });
    var xsSorted = Object.keys(byX).map(Number).sort(function (a, b) { return a - b; });
    var svgEl = el.querySelector('svg');
    var hit = el.querySelector('.hit');
    var cross = el.querySelector('.crosshair');
    var tip = el.querySelector('.tooltip');
    var fmt = opts.yFmt || function (val) { return val + unit; };

    function show(evt) {
      var rect = svgEl.getBoundingClientRect();
      var px = (evt.clientX - rect.left) * (width / rect.width);
      var best = null, bestDist = Infinity;
      xsSorted.forEach(function (xv) {
        var dist = Math.abs(sx(xv) - px);
        if (dist < bestDist) { bestDist = dist; best = xv; }
      });
      if (best === null) return;
      var cx = sx(best);
      cross.setAttribute('x1', cx); cross.setAttribute('x2', cx);
      cross.setAttribute('visibility', 'visible');
      var rows = opts.series.map(function (s, si) {
        var val = byX[best][s.key];
        return '<div class="tt-row"><span class="sw s' + (s.slot || si + 1) + '"></span>' + esc(s.name) +
          '<b>' + (val === undefined ? '—' : esc(fmt(val))) + '</b></div>';
      }).join('');
      tip.innerHTML = '<div class="tt-date">' + esc(tipFmt(best)) + '</div>' + rows;
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
