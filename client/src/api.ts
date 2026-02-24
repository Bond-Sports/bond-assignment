import type { Resource, Slot, ResourceSlots, CreateSlotPayload, UpdateSlotPayload } from './types';

export class ConflictError extends Error {
  constructor(public conflicts: Slot[]) {
    super('Conflict');
  }
}

export async function fetchResources(): Promise<Resource[]> {
  const res = await fetch('/api/resources');
  if (!res.ok) throw new Error(`Failed to fetch resources: ${res.status}`);
  return res.json();
}

export async function fetchSlots(): Promise<ResourceSlots[]> {
  const res = await fetch('/api/slots');
  if (!res.ok) throw new Error(`Failed to fetch slots: ${res.status}`);
  return res.json();
}

async function handle409(res: Response): Promise<never> {
  const body = await res.json();
  throw new ConflictError(body.conflicts ?? body);
}

export async function createSlot(payload: CreateSlotPayload): Promise<Slot> {
  const res = await fetch('/api/slots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (res.status === 409) return handle409(res);
  if (!res.ok) throw new Error(`Failed to create slot: ${res.status}`);
  return res.json();
}

export async function updateSlot(slotId: number, payload: UpdateSlotPayload): Promise<Slot> {
  const res = await fetch(`/api/slots/${slotId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (res.status === 409) return handle409(res);
  if (!res.ok) throw new Error(`Failed to update slot: ${res.status}`);
  return res.json();
}
