import type { Slot } from '../types';

export interface SlotLayout {
  slot: Slot;
  column: number;
  totalColumns: number;
  hasConflict: boolean;
}

function slotsOverlap(a: Slot, b: Slot): boolean {
  return new Date(a.start) < new Date(b.end) && new Date(a.end) > new Date(b.start);
}

/**
 * Assigns horizontal column positions to overlapping slots so they
 * render side-by-side instead of stacking. Uses greedy column assignment
 * then groups connected (transitively overlapping) slots so every slot
 * in a group shares the same totalColumns denominator.
 */
export function computeSlotLayout(slots: Slot[]): SlotLayout[] {
  if (slots.length === 0) return [];

  const sorted = [...slots].sort((a, b) => {
    const d = new Date(a.start).getTime() - new Date(b.start).getTime();
    return d !== 0 ? d : new Date(b.end).getTime() - new Date(a.end).getTime();
  });

  const columns: number[][] = [];
  const slotCol = new Map<number, number>();
  const endTimes = new Map<number, number>();

  for (const slot of sorted) {
    const start = new Date(slot.start).getTime();
    const end = new Date(slot.end).getTime();
    endTimes.set(slot.id, end);

    let placed = false;
    for (let col = 0; col < columns.length; col++) {
      const lastId = columns[col][columns[col].length - 1];
      if (endTimes.get(lastId)! <= start) {
        columns[col].push(slot.id);
        slotCol.set(slot.id, col);
        placed = true;
        break;
      }
    }

    if (!placed) {
      columns.push([slot.id]);
      slotCol.set(slot.id, columns.length - 1);
    }
  }

  const visited = new Set<number>();
  const groups: Slot[][] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (visited.has(i)) continue;
    const group: Slot[] = [];
    const queue = [i];
    visited.add(i);

    while (queue.length > 0) {
      const idx = queue.shift()!;
      group.push(sorted[idx]);
      for (let j = 0; j < sorted.length; j++) {
        if (!visited.has(j) && slotsOverlap(sorted[idx], sorted[j])) {
          visited.add(j);
          queue.push(j);
        }
      }
    }
    groups.push(group);
  }

  const totalColsMap = new Map<number, number>();
  const conflictMap = new Map<number, boolean>();

  for (const group of groups) {
    const maxCol = Math.max(...group.map((s) => slotCol.get(s.id)!));
    const hasConflict = group.length > 1;
    for (const s of group) {
      totalColsMap.set(s.id, maxCol + 1);
      conflictMap.set(s.id, hasConflict);
    }
  }

  return sorted.map((slot) => ({
    slot,
    column: slotCol.get(slot.id)!,
    totalColumns: totalColsMap.get(slot.id)!,
    hasConflict: conflictMap.get(slot.id)!,
  }));
}
