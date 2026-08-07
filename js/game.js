// Estado del juego
const state = {
    operation: 'suma',
    streak: 0,
    bestStreak: 0,
    totalStars: 0,
    levels: { suma: 1, resta: 1, mult: 1, div: 1 },
    correctAnswer: 0,
    num1: 0,
    num2: 0,
    isMuted: false,
    consecutiveCorrect: 0,
    currentText: '',
    currentOp: '',
    missedQueue: [],   // { op, n1, n2, answer, turnsRemaining } para repaso de fallos
    isVariation: false, // true si la pregunta actual viene de la cola de repaso
    totalStickers: 0,  // calcomanías acumuladas
    questionCount: 0,  // preguntas respondidas en la sesión actual
    sessionStars: 0    // estrellas ganadas en la sesión actual
};

// Cada N estrellas acumuladas otorgan una calcomanía
const STICKERS_EVERY = 10;

// Timer para la siguiente pregunta (se cancela al volver al menú)
let nextQuestionTimer = null;

// Cargar progreso
function loadProgress() {
    const saved = localStorage.getItem('mundoMultiplicaSave');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            if (data && typeof data === 'object') {
                state.bestStreak = data.bestStreak || 0;
                state.totalStars = data.totalStars || 0;
                state.levels = data.levels || state.levels;
                state.isMuted = data.isMuted || false;
                state.totalStickers = data.totalStickers || 0;
            }
        } catch (e) {
            // Datos corruptos: restaurar valores iniciales y descartar la save dañada
            localStorage.removeItem('mundoMultiplicaSave');
        }
    }
    updateStatsUI();
    updateMuteUI();
}

function saveProgress() {
    localStorage.setItem('mundoMultiplicaSave', JSON.stringify({
        bestStreak: state.bestStreak,
        totalStars: state.totalStars,
        levels: state.levels,
        isMuted: state.isMuted,
        totalStickers: state.totalStickers
    }));
}

// Una calcomanía por cada STICKERS_EVERY estrellas acumuladas
function awardStickers() {
    const earned = Math.floor(state.totalStars / STICKERS_EVERY);
    if (earned > state.totalStickers) {
        state.totalStickers = earned;
        saveProgress();
    }
}

function updateStatsUI() {
    document.getElementById('total-stars').textContent = state.totalStars;
    document.getElementById('total-stickers').textContent = state.totalStickers;
    document.getElementById('current-streak').textContent = state.streak;
    document.getElementById('best-streak').textContent = state.bestStreak;
    const op = state.currentOp || state.operation;
    document.getElementById('current-level').textContent = state.levels[op] || 1;
    document.getElementById('level-progress').textContent = `${state.consecutiveCorrect % 10}/10`;
}

function updateMuteUI() {
    document.getElementById('mute-btn').textContent = state.isMuted ? '🔇' : '🔊';
}

// Text-to-Speech
function speak(text) {
    if (state.isMuted) return;
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Detener audio anterior
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 1.0;
        utterance.pitch = 1.2; // Voz más aguda y amigable
        window.speechSynthesis.speak(utterance);
    }
}

// Texto hablado de una pregunta (para repetir)
function questionSpoken(op, n1, n2) {
    const opWord = op === 'suma' ? 'más' : op === 'resta' ? 'menos' : op === 'mult' ? 'por' : 'dividido entre';
    return `¿Cuánto es ${n1} ${opWord} ${n2}?`;
}

// Repetir la pregunta en voz alta
function repeatProblem() {
    if (!state.currentOp) return;
    speak(questionSpoken(state.currentOp, state.num1, state.num2));
}

if (typeof document !== 'undefined') {
    document.getElementById('mute-btn').addEventListener('click', () => {
        state.isMuted = !state.isMuted;
        updateMuteUI();
        saveProgress();
        if (state.isMuted) window.speechSynthesis.cancel();
    });

    document.getElementById('repeat-btn').addEventListener('click', repeatProblem);
}

// Navegación
function goHome() {
    // Cancelar la siguiente pregunta programada y el audio pendiente
    if (nextQuestionTimer) {
        clearTimeout(nextQuestionTimer);
        nextQuestionTimer = null;
    }
    // Ocultar overlay de feedback si quedó abierto tras un fallo
    document.getElementById('feedback-overlay').style.display = 'none';
    document.getElementById('game-screen').classList.remove('active');
    document.getElementById('menu-screen').classList.add('active');
    window.speechSynthesis.cancel();
}

// Lógica del Juego
function startGame(op) {
    state.operation = op;
    state.streak = 0;
    state.consecutiveCorrect = 0; // Reiniciamos contador de dificultad al entrar
    state.questionCount = 0;      // Nueva sesión de 10 preguntas
    state.sessionStars = 0;
    updateStatsUI();
    document.getElementById('menu-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    nextQuestion();
}

function getRangeForLevel(op, level) {
    // Ajuste de dificultad según tus especificaciones
    if (op === 'suma' || op === 'resta') {
        if (level === 1) return { min: 1, max: 10 };
        if (level === 2) return { min: 10, max: 30 };
        if (level === 3) return { min: 30, max: 50 };
        if (level === 4) return { min: 50, max: 100 };
        if (level >= 5) return { min: 100, max: 200 };
    }
    if (op === 'mult') {
        if (level === 1) return { min: 1, max: 3 };
        if (level === 2) return { min: 1, max: 5 };
        if (level === 3) return { min: 1, max: 10 };
        if (level === 4) return { min: 1, max: 13 };
        if (level >= 5) return { min: 13, max: 20 };
    }
    if (op === 'div') {
        // Para división, el nivel marca el tamaño del divisor y resultado
        if (level === 1) return { min: 1, max: 5 };
        if (level === 2) return { min: 1, max: 10 };
        if (level >= 3) return { min: 2, max: 15 };
    }
    return { min: 1, max: 10 };
}

function generateQuestion() {
    let op = state.operation;
    if (op === 'mixta') {
        const ops = ['suma', 'resta', 'mult', 'div'];
        op = ops[Math.floor(Math.random() * ops.length)];
    }

    // Smart repetition: variaciones de operaciones falladas aparecen unas preguntas después
    state.missedQueue.forEach(v => v.turnsRemaining--);
    const due = state.missedQueue.find(v => v.turnsRemaining <= 0);

    let n1, n2, text, answer;
    state.isVariation = !!due;

    if (due) {
        state.missedQueue.splice(state.missedQueue.indexOf(due), 1);
        n1 = due.n1;
        n2 = due.n2;
        answer = due.answer;
        op = due.op;
        text = formatText(op, n1, n2);
    } else {
        const level = state.levels[op] || 1;
        const range = getRangeForLevel(op, level);

        if (op === 'suma') {
            n1 = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
            n2 = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
            answer = n1 + n2;
        } else if (op === 'resta') {
            n1 = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
            // Restar por 0 es trivial: se evita a partir del nivel 3
            const minN2 = level >= 3 ? 1 : 0;
            n2 = Math.floor(Math.random() * (n1 - minN2 + 1)) + minN2;
            answer = n1 - n2;
        } else if (op === 'mult') {
            n1 = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
            n2 = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
            answer = n1 * n2;
        } else if (op === 'div') {
            // Generar división exacta; divisor >= 2 a partir del nivel 2 (dividir por 1 es trivial)
            const minDivisor = level >= 2 ? 2 : 1;
            n2 = Math.floor(Math.random() * (range.max - minDivisor + 1)) + minDivisor;
            let result = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min; // Resultado
            n1 = n2 * result; // Dividendo
            answer = result;
        }
        text = formatText(op, n1, n2);
    }

    state.num1 = n1;
    state.num2 = n2;
    state.correctAnswer = answer;
    state.currentText = text;
    state.currentOp = op;

    document.getElementById('question-text').innerText = text;
    
    // Leer en voz alta
    const opWord = op === 'suma' ? 'más' : op === 'resta' ? 'menos' : op === 'mult' ? 'por' : 'dividido entre';
    speak(`¿Cuánto es ${n1} ${opWord} ${n2}?`);

    generateAnswers(answer, op);
}

// Distractores por operación: errores típicos de cálculo infantil
function sumaDistractor(correct) {
    const r = Math.random();
    if (r < 0.4) return correct + (Math.random() < 0.5 ? 1 : -1);  // error de unidad
    if (r < 0.7) return state.num1 + (state.num2 % 10);            // olvidar decenas
    return state.num1 + Math.floor(state.num2 / 10) * 10;          // olvidar unidades
}

function restaDistractor(correct) {
    const r = Math.random();
    if (r < 0.3) return state.num1 + state.num2;                   // sumar en vez de restar
    if (r < 0.6) return state.num1 + state.num2 - 1;               // sumar y errar por uno
    return correct + (Math.random() < 0.5 ? 1 : -1);               // error ±1
}

function multDistractor(correct) {
    // Tabla anterior o siguiente
    const variants = [
        state.num1 * (state.num2 - 1),
        state.num1 * (state.num2 + 1),
        (state.num1 - 1) * state.num2,
        (state.num1 + 1) * state.num2
    ].filter(v => v > 0 && v !== correct);
    if (variants.length > 0) return variants[Math.floor(Math.random() * variants.length)];
    return correct + (Math.random() < 0.5 ? 1 : -1);
}

function divDistractor(correct) {
    const r = Math.random();
    if (r < 0.5) return correct + (Math.random() < 0.5 ? 1 : -1);  // cociente cercano
    if (r < 0.75) return state.num2;                               // confundir divisor con cociente
    return state.num2 + (Math.random() < 0.5 ? 1 : -1);            // divisor cercano
}

function generateAnswers(correct, op) {
    let options = [correct];
    
    // Distractores relacionados por operación
    while (options.length < 3) {
        const distractor =
            op === 'suma' ? sumaDistractor(correct) :
            op === 'resta' ? restaDistractor(correct) :
            op === 'mult' ? multDistractor(correct) :
            op === 'div' ? divDistractor(correct) :
            correct + (Math.floor(Math.random() * 5) - 2);

        // Evitar negativos, duplicados y ceros
        if (distractor > 0 && !options.includes(distractor)) {
            options.push(distractor);
        }
    }

    // Mezclar opciones
    options.sort(() => Math.random() - 0.5);

    const grid = document.getElementById('answers-grid');
    grid.innerHTML = '';
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'answer-btn';
        btn.innerText = opt;
        btn.setAttribute('aria-label', `Responder ${opt}`);
        btn.onclick = () => checkAnswer(opt, btn);
        grid.appendChild(btn);
    });
}

function checkAnswer(selected, btn) {
    // Deshabilitar botones
    document.querySelectorAll('.answer-btn').forEach(b => b.onclick = null);

    if (selected === state.correctAnswer) {
        // Acierto
        btn.classList.add('correct');
        btn.innerText = '✓ ' + btn.innerText; // símbolo además del color
        state.streak++;
        state.consecutiveCorrect++;
        state.totalStars++;
        state.sessionStars++;
        
        if (state.streak > state.bestStreak) state.bestStreak = state.streak;
        
        // Subir dificultad cada 10 aciertos
        if (state.consecutiveCorrect % 10 === 0) {
            if (state.operation === 'mixta') {
                // Modo mixto: avanzan las cuatro operaciones juntas
                ['suma', 'resta', 'mult', 'div'].forEach(op => state.levels[op]++);
            } else {
                state.levels[state.currentOp]++;
            }
            showFeedback('levelup');
            speak(`¡Excelente! Has subido de nivel.`);
        } else {
            showFeedback('correct');
            const praises = ['¡Muy bien!', '¡Genial!', '¡Lo lograste!', '¡Sigue así!'];
            speak(praises[Math.floor(Math.random() * praises.length)]);
        }
        awardStickers();
        updateStatsUI();
        saveProgress();
    } else {
        // Fallo amable
        btn.classList.add('incorrect');
        btn.innerText = '✗ ' + btn.innerText; // símbolo además del color
        state.streak = 0;
        state.consecutiveCorrect = 0;
        updateStatsUI();
        
        // Resaltar respuesta correcta (con símbolo además del color)
        document.querySelectorAll('.answer-btn').forEach(b => {
            const val = parseInt(b.innerText.replace(/[^\d-]/g, ''));
            if (val === state.correctAnswer) {
                b.classList.add('correct');
                b.innerText = '✓ ' + b.innerText;
            }
        });
        
        showFeedback('incorrect');
        speak(`¡Casi! La respuesta era ${state.correctAnswer}`);
        // Smart repetition: guardar el fallo para repasarlo unas preguntas después
        if (!state.isVariation) {
            queueMissedVariations(state.currentOp, state.num1, state.num2, state.correctAnswer);
        }
        // Pausa: el niño observa la respuesta correcta y pulsa Continuar
        return;
    }

    // Tras acierto se cuenta la pregunta y se decide sesión/auto-avance
    maybeEndSession();
}

// Continuar tras un fallo: el niño ya observó la respuesta correcta
function continueGame() {
    document.getElementById('feedback-overlay').style.display = 'none';
    endQuestionAndAdvance();
}

// Al terminar cada pregunta se decide si la sesión de 10 termina
function endQuestionAndAdvance() {
    state.questionCount++;
    if (state.questionCount >= 10) {
        showSessionSummary();
    } else {
        nextQuestion();
    }
}

// Tras acierto (auto-avance) se cuenta la pregunta y se decide sesión
function maybeEndSession() {
    nextQuestionTimer = setTimeout(() => {
        endQuestionAndAdvance();
        nextQuestionTimer = null;
    }, 2500);
}

// Resumen breve de la sesión: estrellas ganadas y mejor racha
function showSessionSummary() {
    document.getElementById('session-stars').textContent = state.sessionStars;
    document.getElementById('session-best').textContent = state.bestStreak;
    document.getElementById('session-stickers').textContent = state.totalStickers;
    document.getElementById('session-overlay').style.display = 'flex';
}

function closeSession() {
    document.getElementById('session-overlay').style.display = 'none';
    startGame(state.operation);
}

function showFeedback(type) {
    const overlay = document.getElementById('feedback-overlay');
    const emoji = document.getElementById('feedback-emoji');
    const text = document.getElementById('feedback-text');
    const continueBtn = document.getElementById('continue-btn');

    if (type === 'correct') {
        emoji.innerText = '🎉';
        const praises = ['¡Muy bien!', '¡Genial!', '¡Lo lograste!'];
        text.innerText = praises[Math.floor(Math.random() * praises.length)];
        continueBtn.style.display = 'none';
    } else if (type === 'levelup') {
        emoji.innerText = '🚀';
        text.innerText = '¡Subiste de nivel!';
        continueBtn.style.display = 'none';
    } else if (type === 'incorrect') {
        emoji.innerText = '🤗';
        text.innerText = `¡Casi! La respuesta era ${state.correctAnswer}`;
        continueBtn.style.display = 'block';
    }

    overlay.style.display = 'flex';
    // En fallo, el overlay permanece hasta que el niño pulse Continuar
    if (type !== 'incorrect') {
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 2000);
    }
}

function nextQuestion() {
    generateQuestion();
}

// Smart repetition
// Formatea el texto de una operación (compartido por preguntas normales y de repaso)
function formatText(op, n1, n2) {
    if (op === 'suma') return `${n1} + ${n2}`;
    if (op === 'resta') return `${n1} - ${n2}`;
    if (op === 'mult') return `${n1} × ${n2}`;
    return `${n1} ÷ ${n2}`;
}

// Al fallar 7 × 8 se encolan 8 × 7, 7 × 7 y 56 ÷ 8, presentadas unas preguntas después.
// ponytail: las variaciones falladas no se re-encolan para evitar inundar la cola; el set único es el refuerzo.
function queueMissedVariations(op, n1, n2, answer) {
    const add = (vop, vn1, vn2, turns) => {
        let vans;
        if (vop === 'suma') vans = vn1 + vn2;
        else if (vop === 'resta') vans = vn1 - vn2;
        else if (vop === 'mult') vans = vn1 * vn2;
        else vans = vn1 / vn2;
        const valid = vn1 > 0 && vn2 > 0 && vans > 0 && vans === Math.floor(vans);
        if (valid) {
            state.missedQueue.push({ op: vop, n1: vn1, n2: vn2, answer: vans, turnsRemaining: turns });
        }
    };
    if (op === 'mult') {
        add('mult', n2, n1, 3);                          // 8 × 7
        add('mult', n1, n2 > 1 ? n2 - 1 : n2 + 1, 4);    // 7 × 7
        add('div', answer, n2, 5);                       // 56 ÷ 8
    } else if (op === 'div') {
        add('div', n1, answer, 3);                       // 56 ÷ 7
        if (n1 > n2) add('div', n1 - n2, n2, 4);         // 48 ÷ 8
        add('mult', n2, answer, 5);                      // 8 × 7
    } else if (op === 'suma') {
        add('suma', n2, n1, 3);                          // 8 + 7
        add('suma', n1, n2 > 1 ? n2 - 1 : n2 + 1, 4);    // 7 + 7
        add('resta', answer, n2, 5);                     // 15 - 8
    } else if (op === 'resta') {
        add('resta', n1, n2 > 1 ? n2 - 1 : n2 + 1, 3);   // 15 - 7
        add('suma', n2, answer, 4);                      // 8 + 7
        add('suma', answer, n2, 5);                      // 7 + 8
    }
}

// Ayudas Visuales
// Renderiza un conteo como bloques; si es grande, agrupa en decenas para no desbordar
function renderCount(count, color) {
    if (count <= 20) return `<div style="color:${color}">` + '⬛'.repeat(count) + `</div>`;
    const groups = Math.ceil(count / 10);
    return `<div style="color:${color}">` + '⬛'.repeat(groups) + `</div><div style="color:${color}; font-size:0.9rem;">${count} = ${groups} grupos de 10</div>`;
}

function showHelp() {
    const modal = document.getElementById('help-modal');
    const container = document.getElementById('blocks-container');
    const title = document.getElementById('help-title');
    container.innerHTML = '';
    
    const op = state.currentOp;
    let html = '';

    if (op === 'suma') {
        title.innerText = `${state.num1} + ${state.num2}`;
        html += renderCount(state.num1, '#4CAF50');
        html += renderCount(state.num2, '#FF9800');
    } else if (op === 'resta') {
        title.innerText = `${state.num1} - ${state.num2}`;
        if (state.num1 <= 20) {
            let blocks = '';
            for(let i=0; i<state.num1; i++) {
                if (i < state.num2) blocks += '⬛'; // Se quitan
                else blocks += '🟩'; // Quedan
            }
            html += `<div>` + blocks + `</div>`;
        } else {
            html += renderCount(state.num2, '#333') + renderCount(state.num1 - state.num2, '#4CAF50');
        }
    } else if (op === 'mult') {
        title.innerText = `${state.num1} grupos de ${state.num2}`;
        if (state.num1 <= 10 && state.num2 <= 20) {
            for(let i=0; i<state.num1; i++) {
                html += `<div>` + '🟦'.repeat(state.num2) + `</div>`;
            }
        } else {
            html += renderCount(state.num1, '#2196F3') + `<div style="font-size:0.9rem;">grupos de ${state.num2}</div>`;
        }
    } else if (op === 'div') {
        title.innerText = `Repartir ${state.num1} en ${state.num2} grupos`;
        if (state.num2 <= 10 && state.correctAnswer <= 20) {
            for(let i=0; i<state.num2; i++) {
                html += `<div style="margin: 5px; padding: 5px; border: 2px dashed #9C27B0; border-radius: 10px;">` + '🟣'.repeat(state.correctAnswer) + `</div>`;
            }
        } else {
            html += renderCount(state.num2, '#9C27B0') + `<div style="font-size:0.9rem;">grupos de ${state.correctAnswer}</div>`;
        }
    }

    container.innerHTML = html;
    modal.style.display = 'flex';
}

function closeHelp() {
    document.getElementById('help-modal').style.display = 'none';
}

// Inicializar (solo en navegador; en Node el check hace require del módulo)
if (typeof document !== 'undefined') {
    loadProgress();
}

// Export para el check de Node (no afecta al navegador)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { state, formatText, queueMissedVariations, sumaDistractor, restaDistractor, multDistractor, divDistractor };
}
