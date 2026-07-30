import type { Resource, Slot, ResourceSlots, CreateSlotPayload, UpdateSlotPayload } from './types';

const API_BASE_URL = 'http://localhost:3000';

export class ConflictError extends Error {
  conflicts: Slot[];

  constructor(conflicts: Slot[]) {
    super('Conflict');
    this.conflicts = conflicts;
  }
}

export async function fetchResources(): Promise<Resource[]> {
  const res = await fetch(`${API_BASE_URL}/resources`);
  if (!res.ok) throw new Error(`Failed to fetch resources: ${res.status}`);
  return res.json();
}

export async function fetchSlots(): Promise<ResourceSlots[]> {
  const res = await fetch(`${API_BASE_URL}/slots`);
  if (!res.ok) throw new Error(`Failed to fetch slots: ${res.status}`);
  return res.json();
}

async function handle409(res: Response): Promise<never> {
  const body = await res.json();
  throw new ConflictError(body.conflicts ?? body);
}

export async function createSlot(payload: CreateSlotPayload): Promise<Slot> {
  const res = await fetch(`${API_BASE_URL}/slots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (res.status === 409) return handle409(res);
  if (!res.ok) throw new Error(`Failed to create slot: ${res.status}`);
  return res.json();
}

export async function updateSlot(slotId: number, payload: UpdateSlotPayload): Promise<Slot> {
  const res = await fetch(`${API_BASE_URL}/slots/${slotId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (res.status === 409) return handle409(res);
  if (!res.ok) throw new Error(`Failed to update slot: ${res.status}`);
  return res.json();
}
