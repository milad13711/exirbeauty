// Pure inventory rules (no DB).

/** Total quantity per product across an invoice's PRODUCT lines (the same product may appear on several lines). */
export function quantities(lines: { kind: string; refId: string | null; qty: number }[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const l of lines) if (l.kind === "PRODUCT" && l.refId) out.set(l.refId, (out.get(l.refId) ?? 0) + l.qty);
  return out;
}

/** A sale takes what is there and never more: stock stops at zero and the shortfall is reported. */
export function deduct(stock: number, qty: number) {
  const taken = Math.min(stock, qty);
  return { stockAfter: stock - taken, delta: taken ? -taken : 0, shortfall: qty - taken };
}

export const isLow = (p: { stock: number; reorder: number }) => p.stock <= p.reorder;

export function summarize(items: { stock: number; cost: number; reorder: number; supplier: string }[]) {
  return {
    items: items.length,
    low: items.filter(isLow).length,
    value: items.reduce((a, x) => a + x.stock * x.cost, 0),
    suppliers: new Set(items.map((x) => x.supplier.trim()).filter(Boolean)).size,
  };
}
