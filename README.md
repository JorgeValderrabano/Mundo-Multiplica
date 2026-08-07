# Mundo Multiplica: Aventuras con Números

Juego de matemáticas para niños que practica suma, resta, multiplicación y división a través de aventuras temáticas. Diseñado para ser accesible, amigable y adaptativo al nivel del niño.

## Características

- **4 operaciones + modo mixto**: Bosque de la Suma, Montaña de la Resta, Ciudad Multiplicadora, Bahía de la División y Aventura Mixta.
- **Dificultad adaptativa**: cada operación sube de nivel cada 10 aciertos, ampliando el rango de números.
- **Repetición inteligente**: las operaciones falladas se repasan unas preguntas después con variaciones relacionadas (ej. fallar `7 x 8` encola `8 x 7`, `7 x 7` y `56 / 8`).
- **Distractores por operación**: errores típicos de cálculo infantil (olvidar decenas, sumar en vez de restar, tabla anterior/siguiente, confundir divisor con cociente).
- **Sesiones de 10 preguntas**: resumen final con estrellas ganadas, mejor racha y calcomanías.
- **Colección de calcomanías**: una por cada 10 estrellas acumuladas.
- **Ayuda visual**: bloques que representan la operación, agrupados en decenas para números grandes.
- **Texto a voz**: las preguntas se leen en voz alta (es-ES), con botón para repetir y control de silencio.
- **Accesibilidad**: nombres accesibles (aria-label), navegación por teclado con contorno visible, soporte de `prefers-reduced-motion`, alto contraste y mensajes no solo por color (símbolos ✓/✗).
- **Progreso persistente**: estrellas, niveles, mejor racha y calcomanías se guardan en `localStorage`.

## Estructura del proyecto

```
index.html              Estructura HTML
css/styles.css          Estilos y animaciones
js/game.js              Lógica del juego
test-smart-repetition.js Check ejecutable de la lógica de repaso y distractores
```

## Cómo ejecutar

Abre `index.html` en cualquier navegador moderno. No requiere servidor ni dependencias.

## Cómo ejecutar el check

```bash
node test-smart-repetition.js
```

Verifica que la repetición inteligente encola las variaciones correctas y que los distractores por operación generan valores válidos.

## Tecnologías

HTML, CSS y JavaScript puro (sin dependencias externas). Usa `localStorage` para persistencia y la Web Speech API para texto a voz.