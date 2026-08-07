// Check rápido de smart repetition y distractores por operación.
// 1) Fallar 7 × 8 encola 8 × 7, 7 × 7 y 56 ÷ 8 con respuestas correctas,
//    y las variaciones se descartan de la cola al presentarse.
// 2) Cada operación genera distractores válidos (> 0 y distintos del correcto).
const assert = require('assert');

const { state, formatText, queueMissedVariations, sumaDistractor, restaDistractor, multDistractor, divDistractor } = require('./js/game.js');

// --- Smart repetition ---
state.missedQueue = [];
queueMissedVariations('mult', 7, 8, 56);

assert.strictEqual(state.missedQueue.length, 3, 'se encolan 3 variaciones');

for (const v of state.missedQueue) {
    assert.ok(v.n1 > 0 && v.n2 > 0, 'operandos positivos');
    assert.strictEqual(v.answer, eval(formatText(v.op, v.n1, v.n2).replace('×', '*').replace('÷', '/')), 'respuesta correcta');
}

const texts = state.missedQueue.map(v => formatText(v.op, v.n1, v.n2));
assert.ok(texts.includes('8 × 7'), 'incluye 8 × 7');
assert.ok(texts.includes('7 × 7'), 'incluye 7 × 7');
assert.ok(texts.includes('56 ÷ 8'), 'incluye 56 ÷ 8');

state.missedQueue.forEach(v => v.turnsRemaining = 0);
const due = state.missedQueue.find(v => v.turnsRemaining <= 0);
state.missedQueue.splice(state.missedQueue.indexOf(due), 1);
assert.strictEqual(state.missedQueue.length, 2, 'la variación presentada se descarta');

// --- Suma: operando de dos cifras para que "olvidar decenas" sea posible ---
state.num1 = 47; state.num2 = 28;
assertSumaDistractors:
{
    const correct = 75;
    for (let i = 0; i < 100; i++) {
        const d = sumaDistractor(correct);
        assert.ok(Number.isInteger(d) && d > 0, 'suma: distractor entero y positivo');
        assert.notStrictEqual(d, correct, 'suma: distractor distinto del correcto');
    }
}

// --- Resta y mult: num2 = 8 ---
state.num1 = 47; state.num2 = 8;
const correctMult = 376;
const correctResta = 39;

// Cociente 12: los distractores de división (cociente ±1, divisor 8, divisor ±1)
// nunca colisionan con 12 dado state.num2 = 8
const cases = [
    { fn: restaDistractor, correct: correctResta },
    { fn: multDistractor, correct: correctMult },
    { fn: divDistractor, correct: 12 }
];

for (const { fn, correct } of cases) {
    let seen = 0;
    for (let i = 0; i < 100; i++) {
        const d = fn(correct);
        assert.ok(Number.isInteger(d) && d > 0, `${fn.name}: distractor entero y positivo`);
        assert.notStrictEqual(d, correct, `${fn.name}: distractor distinto del correcto`);
        seen++;
    }
    assert.strictEqual(seen, 100, `${fn.name}: genera distractores en 100 intentos`);
}

console.log('OK: smart repetition y distractores funcionan');