const BASE_META_TOTAL = 125000;
const VALUE_STEP = 50;

const CATEGORY_ORDER = ['pequeno', 'medio', 'grande', 'epico'];

export function getCategoryRanges(metaTotal) {
  const safeMetaTotal = normalizeMetaTotal(metaTotal);
  const scale = safeMetaTotal / BASE_META_TOTAL;

  return {
    pequeno: {
      min: roundToStep(Math.max(VALUE_STEP, 50 * scale)),
      max: roundToStep(Math.max(VALUE_STEP, 500 * scale)),
      pct: 0.4
    },
    medio: {
      min: roundToStep(Math.max(VALUE_STEP, 500 * scale)),
      max: roundToStep(Math.max(VALUE_STEP, 2000 * scale)),
      pct: 0.4
    },
    grande: {
      min: roundToStep(Math.max(VALUE_STEP, 2000 * scale)),
      max: roundToStep(Math.max(VALUE_STEP, 5000 * scale)),
      pct: 0.15
    },
    epico: {
      min: roundToStep(Math.max(VALUE_STEP, 5000 * scale)),
      max: roundToStep(Math.max(VALUE_STEP, 15000 * scale)),
      pct: 0.05
    }
  };
}

function normalizeMetaTotal(metaTotal) {
  const parsed = Number(metaTotal);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('metaTotal deve ser maior que zero');
  }
  return roundMoney(parsed);
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function roundToStep(value, step = VALUE_STEP) {
  return Math.max(step, Math.round(Number(value) / step) * step);
}

function randomValue(min, max) {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  const raw = low + Math.random() * (high - low);
  return roundToStep(raw);
}

function shuffle(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function sumSquares(squares) {
  return roundMoney(squares.reduce((sum, square) => sum + Number(square.value || 0), 0));
}

function trimExcess(squares, excess) {
  let remaining = roundMoney(excess);

  for (let i = squares.length - 1; i >= 0 && remaining > 0; i -= 1) {
    const square = squares[i];
    const reducible = roundMoney(Number(square.value) - VALUE_STEP);
    if (reducible <= 0) continue;

    const reduction = Math.min(reducible, remaining);
    square.value = roundMoney(Number(square.value) - reduction);
    remaining = roundMoney(remaining - reduction);
  }

  if (remaining > 0) {
    throw new Error('Nao foi possivel ajustar o tabuleiro para a meta informada');
  }
}

function addRemainingSquares(squares, remaining, ranges) {
  let valueLeft = roundMoney(remaining);

  while (valueLeft > 0) {
    const category = valueLeft >= ranges.medio.min ? 'medio' : 'pequeno';
    const range = ranges[category];
    const max = Math.min(range.max, valueLeft);
    const value = valueLeft <= VALUE_STEP ? valueLeft : Math.min(valueLeft, randomValue(range.min, max));

    squares.push({
      value: roundMoney(value),
      category
    });
    valueLeft = roundMoney(valueLeft - value);
  }
}

export function generateBoard(metaTotal) {
  const normalizedMetaTotal = normalizeMetaTotal(metaTotal);
  const ranges = getCategoryRanges(normalizedMetaTotal);
  const squares = [];

  for (const category of CATEGORY_ORDER) {
    const { min, max, pct } = ranges[category];
    const targetSum = normalizedMetaTotal * pct;
    const avgValue = (min + max) / 2;
    const estimatedCount = Math.max(1, Math.round(targetSum / avgValue));

    for (let i = 0; i < estimatedCount; i += 1) {
      squares.push({
        value: randomValue(min, max),
        category
      });
    }
  }

  const firstDiff = roundMoney(normalizedMetaTotal - sumSquares(squares));
  if (firstDiff > 0) {
    addRemainingSquares(squares, firstDiff, ranges);
  } else if (firstDiff < 0) {
    trimExcess(squares, Math.abs(firstDiff));
  }

  const finalDiff = roundMoney(normalizedMetaTotal - sumSquares(squares));
  if (finalDiff !== 0) {
    squares[squares.length - 1].value = roundMoney(squares[squares.length - 1].value + finalDiff);
  }

  const validation = validateBoard(squares, normalizedMetaTotal);
  if (!validation.valid) {
    throw new Error(`board_generation_failed:${validation.diff}`);
  }

  return shuffle(squares).map((square, index) => ({
    position: index + 1,
    value: square.value,
    category: square.category
  }));
}

export function validateBoard(squares, metaTotal) {
  const normalizedMetaTotal = normalizeMetaTotal(metaTotal);
  const sum = sumSquares(Array.isArray(squares) ? squares : []);
  const diff = roundMoney(normalizedMetaTotal - sum);

  return {
    valid: Math.abs(diff) < 0.01,
    sum,
    metaTotal: normalizedMetaTotal,
    squaresCount: Array.isArray(squares) ? squares.length : 0,
    diff
  };
}

export function getBoardStats(squares) {
  const rows = Array.isArray(squares) ? squares : [];
  const byCategory = rows.reduce((acc, square) => {
    const category = square.category || 'sem_categoria';
    const value = Number(square.value || 0);
    const current = acc[category] || { count: 0, sum: 0 };

    acc[category] = {
      count: current.count + 1,
      sum: roundMoney(current.sum + value)
    };

    return acc;
  }, {});

  return {
    total: rows.length,
    sum: sumSquares(rows),
    by_category: byCategory
  };
}
