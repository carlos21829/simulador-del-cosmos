// Ejecutar con: node tests/physics.test.mjs
import assert from 'node:assert/strict';
import { tiempoCaida, estado, validar as vCaida } from '../js/physics/free-fall.js';
import { ideal, alcanceMismaAltura, trayectoria, evaluar, validar as vTiro, C_ARRASTRE } from '../js/physics/projectile.js';
const cerca = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} ≠ ${b}`);
const g = 9.81; let n = 0;
const t = (nombre, f) => { f(); n++; console.log('✔', nombre); };

t('Caída: Luna, 80 m → t = √(2h/g)', () => cerca(tiempoCaida(80, 1.62), Math.sqrt(160 / 1.62)));
t('Caída: al final y = 0 y v = g·t', () => { const tf = tiempoCaida(50, g), e = estado(50, g, tf + 1); cerca(e.y, 0); cerca(e.v, g * tf); assert.ok(e.fin); });
t('Caída: validación de límites', () => { assert.equal(vCaida(1, 10, 50), ''); assert.notEqual(vCaida(0, 10, 50), ''); assert.notEqual(vCaida(1, 10, NaN), ''); assert.notEqual(vCaida(1, 10, 600), ''); });
t('Tiro ideal h0 = 0, 45°: alcance = v²/g', () => cerca(ideal(30, 45, 0, g).alcance, 900 / g));
t('Tiro ideal con h0: y(tf) = 0', () => { const a = ideal(20, 30, 10, g); cerca(10 + a.vy0 * a.tf - 0.5 * g * a.tf ** 2, 0); });
t('Tiro ideal: altura máxima', () => cerca(ideal(20, 30, 10, g).hmax, 10 + 100 / (2 * g)));
t('Fórmula de igual altura NO sirve con h0 ≠ 0', () => assert.ok(Math.abs(alcanceMismaAltura(25, 40, g) - ideal(25, 40, 10, g).alcance) > 5));
t('RK4 con c → 0 coincide con el modelo ideal', () => cerca(trayectoria(30, 45, 10, g, 1e-9).alcance, ideal(30, 45, 10, g).alcance, 1e-4));
t('Con arrastre el alcance es menor', () => assert.ok(trayectoria(30, 45, 0, g, C_ARRASTRE).alcance < ideal(30, 45, 0, g).alcance));
t('Evaluar: acierto cuando cae en el objetivo', () => assert.equal(evaluar(trayectoria(30, 45, 0, g, 0).pts, ideal(30, 45, 0, g).alcance).estado, 'acierto'));
t('Evaluar: corto y largo', () => { const p = trayectoria(30, 45, 0, g, 0).pts; assert.equal(evaluar(p, 150).estado, 'corto'); assert.equal(evaluar(p, 70).estado, 'largo'); });
t('Evaluar: tiro rasante choca con el obstáculo', () => assert.equal(evaluar(trayectoria(30, 20, 0, g, 0).pts, 120).estado, 'obstaculo'));
t('Tiro: validación de límites', () => { assert.equal(vTiro(30, 45, 0, 120), ''); assert.notEqual(vTiro(30, 0, 0, 120), ''); assert.notEqual(vTiro(30, 45, 0, 40), ''); });
console.log(`\n${n} pruebas superadas`);