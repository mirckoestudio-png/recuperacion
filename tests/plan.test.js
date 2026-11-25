// Pruebas de la lógica del plan. Ejecuta: node tests/plan.test.js
const path = require('path');
const assert = require('assert');
const root = path.join(__dirname, '..');
globalThis.window = globalThis;
const mem = {};
globalThis.localStorage = { getItem: k => mem[k] || null, setItem: (k, v) => { mem[k] = v; }, removeItem: k => { delete mem[k]; } };
require(path.join(root, 'js/data.js'));
require(path.join(root, 'js/store.js'));
require(path.join(root, 'js/plan.js'));
const { Plan, DateUtil: D, Store } = globalThis;

const today = D.todayKey();
function setProfile(daysAgoDer, daysAgoIzq, meniscus, graft) {
  Store.update(s => {
    s.profile = { name: '', sameSurgery: daysAgoDer === daysAgoIzq, knees: {
      der: { date: D.addDays(today, -daysAgoDer), meniscus, graft },
      izq: { date: D.addDays(today, -daysAgoIzq), meniscus, graft } } };
  });
}
const ids = d => d.items.map(i => i.ex.id);

// Fechas
assert.strictEqual(D.diffDays('2026-03-28', '2026-03-30'), 2); // cambio de hora en Europa
assert.strictEqual(D.addDays('2026-12-31', 1), '2027-01-01');
assert.strictEqual(D.weekday('2026-11-23'), 0); // lunes

// Fases por tiempo
[[0,1],[13,1],[14,2],[41,2],[42,3],[83,3],[84,4],[167,4],[168,5],[400,5]].forEach(([d,p]) => assert.strictEqual(Plan.phaseForDay(d), p, 'día ' + d));

// Día 26, sutura + isquios: fase 2, sin bicicleta (sutura hasta día 42)
setProfile(26, 26, 'sutura', 'isquios');
let d = Plan.daily(Store.get());
assert.strictEqual(d.ctx.phase, 2);
assert.strictEqual(d.ctx.day, 26);
assert(!ids(d).includes('bicicleta'), 'bici bloqueada por sutura');
assert(ids(d).includes('mini-sentadilla'));
console.log('Día 26 (sutura, isquios) →', ids(d).join(', '));
console.log('Precauciones:', Plan.precautions(d.ctx).length);

// Día 26 con meniscectomía + rotuliano: bici disponible
setProfile(26, 26, 'meniscectomia', 'htth');
d = Plan.daily(Store.get());
assert(ids(d).includes('bicicleta'));

// Día 60, isquios: peso muerto (56) sí, curl (70) no
setProfile(60, 60, 'meniscectomia', 'isquios');
d = Plan.daily(Store.get());
assert(ids(d).includes('peso-muerto') && !ids(d).includes('curl-isquios'));

// Bilateral con fechas distintas: sigue a la más reciente
setProfile(100, 20, 'sutura', 'isquios');
d = Plan.daily(Store.get());
assert.strictEqual(d.ctx.day, 20); assert.strictEqual(d.ctx.refKnee.side, 'izq'); assert.strictEqual(d.ctx.phase, 2);

// Antes de la cirugía: ejercicios de fase 1 visibles
setProfile(-5, -5, 'nose', 'nose');
d = Plan.daily(Store.get());
assert(d.ctx.presurgery && d.items.length > 0, 'pre-cirugía muestra fase 1');
assert.strictEqual(Plan.adherence(Store.get(), today), null);

// Fase manual
setProfile(26, 26, 'sutura', 'isquios');
Store.update(s => { s.phaseOverride = 3; });
d = Plan.daily(Store.get());
assert.strictEqual(d.ctx.phase, 3); assert(d.ctx.manual);
Store.update(s => { s.phaseOverride = null; });

// Adherencia y racha
d = Plan.daily(Store.get());
Store.update(s => {
  for (let i = 0; i < 4; i++) {
    const k = D.addDays(today, -i); s.done[k] = {};
    d.items.forEach(it => { s.done[k][it.ex.id] = it.perDay; });
  }
});
const a = Plan.adherence(Store.get(), today);
assert.strictEqual(a.pct, 1);
assert.strictEqual(Plan.streak(Store.get()), 4);

// Avisos
Store.update(s => { s.logs[today] = { der: { pain: 8, ext: 8 }, izq: { swelling: 1 } }; });
const al = Plan.alerts(Store.get(), Plan.context(Store.get()));
assert(al.length >= 2, 'avisos por dolor alto y falta de extensión');

// Export / import
const json = Store.exportJSON();
Store.reset();
assert.strictEqual(Store.get().profile, null);
Store.importJSON(json);
assert.strictEqual(Store.get().profile.knees.der.meniscus, 'sutura');
assert.throws(() => Store.importJSON('{"foo":1}'));

console.log('Todas las pruebas OK');
