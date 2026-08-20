import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Slot } from 'src/entities/slot.entity';
import { BlockingDependency } from 'src/entities/blocking-dependency.entity';
import { EntityManager } from 'typeorm';
import { Resource } from 'src/entities/resource.entity';
import {
  CreateSlotDto,
  ResourceSlotsDto,
  SlotDto,
  UpdateSlotTimesDto,
} from './types/dtos/slots.dto';

@Injectable()
export class SlotsService {
  constructor(private readonly manager: EntityManager) {}

  async getSlots(): Promise<ResourceSlotsDto[]> {
    const [slots, dependencies] = await Promise.all([
      this.manager.find(Slot, { order: { id: 'ASC' } }),
      this.manager.find(BlockingDependency),
    ]);

    const groups = new Map<number, SlotDto[]>();

    for (const slot of slots) {
      const resourceIds = [slot.resourceId];

      for (const dep of dependencies) {
        if (dep.blockingResourceId === slot.resourceId) {
          resourceIds.push(dep.blockedResourceId);
        }
      }

      for (const resourceId of resourceIds) {
        const group = groups.get(resourceId) ?? [];
        group.push({ ...slot, conflicts: [] });
        groups.set(resourceId, group);
      }
    }

    const conflictIds = new Map<number, Set<number>>();

    for (const group of groups.values()) {
      const ordered = [...group].sort((a, b) =>
        a.start === b.start ? a.id - b.id : a.start < b.start ? -1 : 1,
      );

      for (let i = 0; i < ordered.length; i++) {
        const slot = ordered[i];

        for (let j = i + 1; j < ordered.length; j++) {
          const other = ordered[j];
          if (other.start >= slot.end) {
            break;
          }

          const fromSlot = conflictIds.get(slot.id) ?? new Set<number>();
          fromSlot.add(other.id);
          conflictIds.set(slot.id, fromSlot);

          const fromOther = conflictIds.get(other.id) ?? new Set<number>();
          fromOther.add(slot.id);
          conflictIds.set(other.id, fromOther);
        }
      }
    }

    const slotById = new Map(slots.map((slot) => [slot.id, slot]));

    return [...groups.entries()].map(([resourceId, group]) => ({
      resourceId,
      slots: group.map((slot) => ({
        ...slot,
        conflicts: [...(conflictIds.get(slot.id) ?? [])]
          .map((id) => slotById.get(id))
          .filter((other): other is Slot => other !== undefined)
          .map((other) => ({ ...other, conflicts: [] })),
      })),
    }));
  }

  async addSlot(createSlot: CreateSlotDto): Promise<SlotDto> {
    // TODO: Implement this method.
    // Check for conflicts before saving. Reject with 409 if any exist.

    return this.manager.save(
      Slot.create({
        name: createSlot.name,
        start: createSlot.start,
        end: createSlot.end,
        resourceId: createSlot.resourceId,
      }),
    );
  }

  async updateSlot(
    slotId: number,
    updateSlot: UpdateSlotTimesDto,
  ): Promise<SlotDto> {
    // TODO: Implement this method.
    // Check for conflicts before saving. Reject with 409 if any exist.

    const slot = await this.manager.findOneOrFail(Slot, {
      where: { id: slotId },
    });

    slot.start = updateSlot.start;
    slot.end = updateSlot.end;
    await this.manager.save(slot);

    return {
      ...slot,
      conflicts: [],
    };
  }
}
