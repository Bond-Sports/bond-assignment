import { Slot } from 'src/entities/slot.entity';

export interface ITimeSlot {
  start: string;
  end: string;
  resourceId: number;
}

export interface IConflict {
  timeSlot: ITimeSlot;
  conflicts: Slot[];
}
