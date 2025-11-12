// ✅ Pagination helper to calculate dynamic range
export const getPaginationRange = (current: number, total: number, delta = 2) => {
  const range = [];
  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);

  range.push(1); // Always show first page

  if (left > 2) {
    range.push('...');
  }

  for (let i = left; i <= right; i++) {
    range.push(i);
  }

  if (right < total - 1) {
    range.push('...');
  }

  if (total > 1) {
    range.push(total); // Always show last page
  }

  return range;
};
