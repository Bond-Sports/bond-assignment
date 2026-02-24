export interface Resource {
  id: number;
  name: string;
}

export interface Slot {
  id: number;
  name: string;
  start: string;
  end: string;
  resourceId: number;
  conflicts: Slot[];
}

export interface ResourceSlots {
  resourceId: number;
  slots: Slot[];
}

export interface CreateSlotPayload {
  name: string;
  start: string;
  end: string;
  resourceId: number;
}

export interface UpdateSlotPayload {
  start: string;
  end: string;
}
