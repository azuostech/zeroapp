const CATEGORY_ORDER = ['pequeno', 'medio', 'grande', 'epico'];

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

function triangularTotal(count) {
  return roundMoney((Number(count || 0) * (Number(count || 0) + 1)) / 2);
}

export function getSequentialSquareCount(metaTotal) {
  const target = normalizeMetaTotal(metaTotal);
  return Math.max(1, Math.ceil((Math.sqrt(8 * target + 1) - 1) / 2));
}

export function getSequentialMetaTotal(metaTotal) {
  return triangularTotal(getSequentialSquareCount(metaTotal));
}

export function getCategoryRanges(metaTotal) {
  const count = getSequentialSquareCount(metaTotal);

  return {
    pequeno: { min: 1, max: Math.max(1, Math.floor(count * 0.4)), pct: 0.4 },
    medio: { min: Math.floor(count * 0.4) + 1, max: Math.max(1, Math.floor(count * 0.8)), pct: 0.4 },
    grande: { min: Math.floor(count * 0.8) + 1, max: Math.max(1, Math.floor(count * 0.95)), pct: 0.15 },
    epico: { min: Math.floor(count * 0.95) + 1, max: count, pct: 0.05 }
  };
}

function categoryForPosition(position, total) {
  const ratio = total > 0 ? position / total : 1;
  if (ratio <= 0.4) return 'pequeno';
  if (ratio <= 0.8) return 'medio';
  if (ratio <= 0.95) return 'grande';
  return 'epico';
}

function sumSquares(squares) {
  return roundMoney(squares.reduce((sum, square) => sum + Number(square.position || square.value || 0), 0));
}

export function generateBoard(metaTotal) {
  const count = getSequentialSquareCount(metaTotal);
  const adjustedMetaTotal = triangularTotal(count);
  const squares = Array.from({ length: count }, (_, index) => {
    const position = index + 1;
    return {
      position,
      value: position,
      category: categoryForPosition(position, count)
    };
  });

  const validation = validateBoard(squares, adjustedMetaTotal);
  if (!validation.valid) {
    throw new Error(`board_generation_failed:${validation.diff}`);
  }

  return squares;
}

export function validateBoard(squares, metaTotal) {
  const normalizedMetaTotal = normalizeMetaTotal(metaTotal);
  const rows = Array.isArray(squares) ? squares : [];
  const sum = sumSquares(rows);
  const diff = roundMoney(normalizedMetaTotal - sum);
  const sequential = rows.every((square, index) => {
    const expected = index + 1;
    return Number(square.position) === expected && Number(square.value) === expected;
  });

  return {
    valid: Math.abs(diff) < 0.01 && sequential,
    sum,
    metaTotal: normalizedMetaTotal,
    squaresCount: rows.length,
    diff,
    sequential
  };
}

export function getBoardStats(squares) {
  const rows = Array.isArray(squares) ? squares : [];
  const byCategory = rows.reduce((acc, square) => {
    const category = CATEGORY_ORDER.includes(square.category) ? square.category : 'sem_categoria';
    const value = Number(square.position || square.value || 0);
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
