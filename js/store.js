/*
 * Utilidades de fecha y almacenamiento local.
 * Todos los datos se guardan solo en este dispositivo (localStorage).
 * Usa "Exportar copia" en Ajustes para no perderlos.
 */
(function (root) {
  'use strict';

  var DAY_MS = 86400000;

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  var DateUtil = {
    /** Fecha local de hoy como 'YYYY-MM-DD'. */
    todayKey: function () {
      var d = new Date();
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    },
    isKey: function (k) {
      return typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
    },
    /** Milisegundos UTC de una fecha 'YYYY-MM-DD' (sin problemas de horario de verano). */
    toUTC: function (k) {
      var p = k.split('-');
      return Date.UTC(+p[0], +p[1] - 1, +p[2]);
    },
    fromUTC: function (ms) {
      var d = new Date(ms);
      return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
    },
    /** Días desde a hasta b (b - a). */
    diffDays: function (a, b) {
      return Math.round((DateUtil.toUTC(b) - DateUtil.toUTC(a)) / DAY_MS);
    },
    addDays: function (k, n) {
      return DateUtil.fromUTC(DateUtil.toUTC(k) + n * DAY_MS);
    },
    /** 0 = lunes … 6 = domingo */
    weekday: function (k) {
      return (new Date(DateUtil.toUTC(k)).getUTCDay() + 6) % 7;
    },
    format: function (k, opts) {
      try {
        return new Intl.DateTimeFormat('es', Object.assign({ timeZone: 'UTC' }, opts || { day: 'numeric', month: 'short' }))
          .format(new Date(DateUtil.toUTC(k)));
      } catch (e) {
        return k;
      }
    }
  };

  var KEY = 'rodillas.v1';

  function defaults() {
    return {
      version: 1,
      profile: null,       // { name, sameSurgery, knees: { der: {date, meniscus, graft}, izq: {...} } }
      phaseOverride: null, // null = automática; 1–5 = fijada por tu fisio
      done: {},            // { 'YYYY-MM-DD': { exerciseId: veces } }
      logs: {},            // { 'YYYY-MM-DD': { der: {pain, swelling, flex, ext}, izq: {...}, notes } }
      custom: [],          // ejercicios de tu fisio [{ id, name, dose, perDay, notes }]
      hidden: {},          // { exerciseId: true }
      criteria: {}         // { criterioId: true }
    };
  }

  function normalize(s) {
    var d = defaults();
    if (!s || typeof s !== 'object') return d;
    Object.keys(d).forEach(function (k) {
      if (s[k] === undefined || s[k] === null && k !== 'profile' && k !== 'phaseOverride') s[k] = d[k];
    });
    return s;
  }

  var storageOk = true;

  function load() {
    try {
      var raw = root.localStorage.getItem(KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) {
      storageOk = false;
    }
    return defaults();
  }

  var state = load();

  function save() {
    try {
      root.localStorage.setItem(KEY, JSON.stringify(state));
      storageOk = true;
    } catch (e) {
      storageOk = false;
    }
    return storageOk;
  }

  var Store = {
    get: function () { return state; },
    update: function (fn) {
      fn(state);
      return save();
    },
    storageOk: function () { return storageOk; },
    exportJSON: function () {
      return JSON.stringify({ app: 'rodillas', exportedAt: new Date().toISOString(), data: state }, null, 2);
    },
    /** Devuelve true si el archivo es válido y se ha importado. */
    importJSON: function (text) {
      var parsed = JSON.parse(text);
      var data = parsed && parsed.app === 'rodillas' ? parsed.data : parsed;
      if (!data || typeof data !== 'object' || !('logs' in data) || !('done' in data)) {
        throw new Error('El archivo no parece una copia de esta app.');
      }
      state = normalize(data);
      save();
      return true;
    },
    reset: function () {
      state = defaults();
      try { root.localStorage.removeItem(KEY); } catch (e) { /* nada */ }
    },
    /** Pide al navegador que no borre los datos si falta espacio. */
    requestPersist: function () {
      try {
        if (root.navigator && navigator.storage && navigator.storage.persist) {
          navigator.storage.persist();
        }
      } catch (e) { /* nada */ }
    }
  };

  root.DateUtil = DateUtil;
  root.Store = Store;
})(typeof window !== 'undefined' ? window : globalThis);
