// Pruebas de la lógica del plan. Ejecuta: node tests/plan.test.js
const path = require('path');
const assert = require('assert');
const root = path.join(__dirname, '..');
globalThis.window = globalThis;
const mem = {};
globalThis.localStorage = { getItem: (k) => mem[k] || null, setItem: (k, v) => { mem[k] = v; }, removeItem: (k) => { delete mem[k]; } };
require(path.join(root, 'js/data.js'));
require(path.join(root, 'js/store.js'));
require(path.join(root, 'js/plan.js'));
const { Plan, DateUtil: D, Store } = globalThis;

const today = D.todayKey();
let passed = 0;
function test(name, fn) {
  Store.reset();
  fn();
  passed++;
  console.log('✓ ' + name);
}
function setKnees(izqDaysAgo, derDaysAgo, opts = {}) {
  Store.update((s) => {
    s.profile = {
      name: '',
      knees: {
        izq: { date: D.addDays(today, -izqDaysAgo), meniscus: opts.meniscus || 'sutura', graft: opts.graft || 'isquios' },
        der: { date: D.addDays(today, -derDaysAgo), meniscus: opts.meniscus || 'sutura', graft: opts.graft || 'isquios' }
      }
    };
  });
}
const both = (d) => d.both.map((i) => i.key);
const knee = (d, side) => d.knees.find((k) => k.knee.side === side);
const kneeKeys = (d, side) => knee(d, side).items.map((i) => i.key);

test('Fechas', () => {
  assert.strictEqual(D.diffDays('2026-03-28', '2026-03-30'), 2); // cambio de hora en Europa
  assert.strictEqual(D.addDays('2026-12-31', 1), '2027-01-01');
  assert.strictEqual(D.weekday('2026-11-23'), 0); // lunes
});

test('Fases por tiempo (0 = antes de operarse)', () => {
  [[-30, 0], [-1, 0], [0, 1], [13, 1], [14, 2], [41, 2], [42, 3], [83, 3], [84, 4], [167, 4], [168, 5], [400, 5]]
    .forEach(([d, p]) => assert.strictEqual(Plan.phaseForDay(d), p, 'día ' + d));
});

test('Dos cirugías con 3 meses de diferencia: cada rodilla en su fase', () => {
  setKnees(120, 30);
  const d = Plan.daily(Store.get());
  const { ctx } = d;
  assert.strictEqual(ctx.first.side, 'izq');
  assert.strictEqual(ctx.recent.side, 'der');
  assert.strictEqual(ctx.bySide.izq.phase, 4);
  assert.strictEqual(ctx.bySide.der.phase, 2);
  assert.deepStrictEqual(d.knees.map((k) => k.knee.side), ['izq', 'der'], 'primero la operada antes');

  // Una pierna: cada una lo suyo
  ['extension-rodilla@izq', 'sentadilla-una-pierna@izq', 'curl-isquios@izq', 'subida-escalon@izq', 'equilibrio@izq']
    .forEach((k) => assert(kneeKeys(d, 'izq').includes(k), k));
  ['cuadriceps-iso@der', 'extension-pasiva@der', 'hielo@der', 'equilibrio@der', 'deslizamiento-talon@der']
    .forEach((k) => assert(kneeKeys(d, 'der').includes(k), k));
  assert(!kneeKeys(d, 'izq').includes('hielo@izq'), 'la izquierda ya no necesita hielo diario');

  // Dos piernas: al ritmo de la derecha (fase 2, sutura día 30)
  ['tobillos', 'mini-sentadilla', 'puente', 'talones', 'transferencias', 'marcha'].forEach((k) => assert(both(d).includes(k), k));
  ['carrera', 'sentadilla', 'bicicleta', 'saltos-bilaterales'].forEach((k) => assert(!both(d).includes(k), k));

  // La izquierda "espera" a la derecha para correr, con fecha estimada
  const run = knee(d, 'izq').waiting.find((w) => w.ex.id === 'carrera');
  assert(run, 'carrera en espera');
  assert.strictEqual(run.blocker.side, 'der');
  assert.strictEqual(run.unlockKey, D.addDays(ctx.bySide.der.date, 84));
});

test('Bicicleta: se desbloquea cuando la segunda rodilla pasa las 6 semanas (sutura)', () => {
  setKnees(120, 41);
  assert(!both(Plan.daily(Store.get())).includes('bicicleta'));
  setKnees(120, 42);
  assert(both(Plan.daily(Store.get())).includes('bicicleta'));
});

test('Segunda cirugía aún por llegar: prehabilitación', () => {
  setKnees(20, -70);
  const d = Plan.daily(Store.get());
  assert(d.ctx.bySide.der.presurgery);
  assert.strictEqual(d.ctx.bySide.der.phase, 0);
  assert(kneeKeys(d, 'der').includes('cuadriceps-iso@der'));
  assert(both(d).includes('mini-sentadilla'), 'izq en fase 2 y der en preparación lo permiten');
  assert(!both(d).includes('bicicleta'), 'la izq. con sutura aún no llega a 6 semanas');
});

test('Recién operada la primera: nada de sentadillas aunque la otra esté sin operar', () => {
  setKnees(5, -80);
  const d = Plan.daily(Store.get());
  assert(!both(d).includes('mini-sentadilla'));
  assert(both(d).includes('tobillos'));
});

test('Meniscectomía e injerto rotuliano: menos restricciones', () => {
  setKnees(120, 30, { meniscus: 'meniscectomia', graft: 'htth' });
  const d = Plan.daily(Store.get());
  assert(both(d).includes('bicicleta'));
});

test('Fase fijada por rodilla', () => {
  setKnees(120, 30);
  Store.update((s) => { s.phaseOverride = { der: 3 }; });
  const ctx = Plan.context(Store.get());
  assert.strictEqual(ctx.bySide.der.phase, 3);
  assert(ctx.bySide.der.manual);
  assert.strictEqual(ctx.bySide.izq.phase, 4);
  assert(!ctx.bySide.izq.manual);
});

test('Precauciones por rodilla y generales', () => {
  setKnees(120, 30);
  const pr = Plan.precautions(Plan.context(Store.get()));
  assert(pr.some((p) => p.side === 'der' && /90°/.test(p.text)), 'límite de 90° en la derecha');
  assert(!pr.some((p) => p.side === 'izq' && /90°/.test(p.text)), 'la izquierda ya pasó ese límite');
  assert(pr.some((p) => p.side === null && /ritmo de la rodilla derecha/.test(p.text)));
});

test('Ejercicios del fisio por rodilla', () => {
  setKnees(120, 30);
  Store.update((s) => {
    s.custom.push({ id: 'c1', name: 'Isométrico pared', perDay: 1, knee: 'izq' });
    s.custom.push({ id: 'c2', name: 'Caminar', perDay: 1, knee: 'ambas' });
  });
  const d = Plan.daily(Store.get());
  assert(kneeKeys(d, 'izq').includes('c1'));
  assert(both(d).includes('c2'));
});

test('Constancia y racha', () => {
  setKnees(120, 30);
  const d = Plan.daily(Store.get());
  Store.update((s) => {
    for (let i = 0; i < 4; i++) {
      const k = D.addDays(today, -i);
      s.done[k] = {};
      Plan.allItems(d).forEach((it) => { s.done[k][it.key] = it.perDay; });
    }
  });
  assert.strictEqual(Plan.adherence(Store.get(), today).pct, 1);
  assert.strictEqual(Plan.streak(Store.get()), 4);
  assert.strictEqual(Plan.adherence(Store.get(), D.addDays(today, -10)), null, 'antes de empezar a usar la app no cuenta');
});

test('Avisos por rodilla', () => {
  setKnees(120, 30);
  Store.update((s) => { s.logs[today] = { der: { pain: 8 }, izq: { ext: 8 } }; });
  const al = Plan.alerts(Store.get(), Plan.context(Store.get()));
  assert(al.some((a) => a.side === 'der' && /Dolor o hinchazón/.test(a.text)));
  assert(al.some((a) => a.side === 'izq' && /faltan 8°/.test(a.text)));
});

test('Comparar las rodillas en el mismo día de su recuperación', () => {
  setKnees(120, 30);
  const izqDate = Plan.context(Store.get()).bySide.izq.date;
  Store.update((s) => {
    s.logs[D.addDays(izqDate, 31)] = { izq: { flex: 95 } };
    s.logs[today] = { der: { flex: 104 } };
  });
  const c = Plan.comparison(Store.get(), Plan.context(Store.get()), 'flex');
  assert(c);
  assert.strictEqual(c.day, 30);
  assert.strictEqual(c.recentValue, 104);
  assert.strictEqual(c.firstValue, 95);
});

test('Migración de datos de la versión 1 (plan único)', () => {
  const v1 = {
    version: 1,
    profile: { name: 'X', sameSurgery: true, knees: { der: { date: today, meniscus: 'sutura', graft: 'isquios' }, izq: { date: today, meniscus: 'sutura', graft: 'isquios' } } },
    phaseOverride: 3,
    done: { [today]: { 'cuadriceps-iso': 2, puente: 1 } },
    logs: {},
    custom: [{ id: 'c1', name: 'A', perDay: 1 }],
    hidden: {},
    criteria: { 'p2-ext': true }
  };
  Store.importJSON(JSON.stringify(v1));
  const s = Store.get();
  assert.strictEqual(s.version, 2);
  assert.deepStrictEqual(s.phaseOverride, { der: 3, izq: 3 });
  assert(s.criteria['der:p2-ext'] && s.criteria['izq:p2-ext']);
  assert.strictEqual(s.done[today]['cuadriceps-iso@der'], 2);
  assert.strictEqual(s.done[today]['cuadriceps-iso@izq'], 2);
  assert.strictEqual(s.done[today].puente, 1, 'los de dos piernas no cambian');
  assert.strictEqual(s.custom[0].knee, 'ambas');
  assert(!('sameSurgery' in s.profile));
});

test('Exportar / importar', () => {
  setKnees(120, 30);
  const json = Store.exportJSON();
  Store.reset();
  assert.strictEqual(Store.get().profile, null);
  Store.importJSON(json);
  assert.strictEqual(Store.get().profile.knees.der.meniscus, 'sutura');
  assert.throws(() => Store.importJSON('{"foo":1}'));
});

test('Todos los ejercicios tienen tipo de pierna válido', () => {
  globalThis.PROTOCOL.EXERCISES.forEach((e) => assert(['one', 'both', 'any'].includes(e.legs), e.id));
});

console.log(`\n${passed} pruebas OK`);
