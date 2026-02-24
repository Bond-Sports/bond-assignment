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

  private toSlotDto(slot: Slot, conflicts: SlotDto[] = []): SlotDto {
    return {
      id: slot.id,
      name: slot.name,
      start: slot.start,
      end: slot.end,
      resourceId: slot.resourceId,
      conflicts,
    };
  }

  private overlaps(
    aStart: string,
    aEnd: string,
    bStart: string,
    bEnd: string,
  ): boolean {
    return aStart < bEnd && aEnd > bStart;
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private async getBlockerIds(resourceId: number): Promise<number[]> {
    const deps = await this.manager.find(BlockingDependency, {
      where: { blockedResourceId: resourceId },
    });
    return deps.map((d) => d.blockingResourceId);
  }

  /**
   * Finds all existing slots that conflict with a proposed time range on a resource.
   * Checks same resource + upstream blockers.
   */
  private async findConflicts(
    resourceId: number,
    start: string,
    end: string,
    excludeSlotId?: number,
  ): Promise<SlotDto[]> {
    const blockerIds = await this.getBlockerIds(resourceId);
    const relevantResourceIds = [resourceId, ...blockerIds];

    const allSlots = await this.manager.find(Slot);

    return allSlots
      .filter((slot) => {
        if (excludeSlotId != null && slot.id === excludeSlotId) return false;
        if (!relevantResourceIds.includes(slot.resourceId)) return false;
        return this.overlaps(start, end, slot.start, slot.end);
      })
      .map((slot) => this.toSlotDto(slot));
  }

  async getSlots(): Promise<ResourceSlotsDto[]> {
    const today = new Date();
    const todayStr = this.formatDate(today);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = this.formatDate(tomorrow);

    const todayStart = `${todayStr}T00:00:00`;
    const tomorrowStart = `${tomorrowStr}T00:00:00`;

    const resources = await this.manager.find(Resource, {
      order: { id: 'ASC' },
    });

    const allSlots = await this.manager.find(Slot, {
      order: { start: 'ASC' },
    });

    const todaySlots = allSlots.filter((s) =>
      this.overlaps(s.start, s.end, todayStart, tomorrowStart),
    );

    const allDeps = await this.manager.find(BlockingDependency);
    const blockersMap = new Map<number, number[]>();
    for (const dep of allDeps) {
      if (!blockersMap.has(dep.blockedResourceId)) {
        blockersMap.set(dep.blockedResourceId, []);
      }
      blockersMap.get(dep.blockedResourceId)!.push(dep.blockingResourceId);
    }

    const slotConflictsMap = new Map<number, SlotDto[]>();
    for (const slot of todaySlots) {
      const blockerIds = blockersMap.get(slot.resourceId) || [];
      const conflicts = todaySlots
        .filter((other) => {
          if (other.id === slot.id) return false;
          if (
            other.resourceId !== slot.resourceId &&
            !blockerIds.includes(other.resourceId)
          )
            return false;
          return this.overlaps(slot.start, slot.end, other.start, other.end);
        })
        .map((other) => this.toSlotDto(other));
      slotConflictsMap.set(slot.id, conflicts);
    }

    return resources.map((resource) => {
      const blockerIds = blockersMap.get(resource.id) || [];
      const relevantResourceIds = [resource.id, ...blockerIds];

      const slots = todaySlots
        .filter((s) => relevantResourceIds.includes(s.resourceId))
        .map((s) => this.toSlotDto(s, slotConflictsMap.get(s.id) || []));

      return { resourceId: resource.id, slots };
    });
  }

  async addSlot(createSlot: CreateSlotDto): Promise<SlotDto> {
    const conflicts = await this.findConflicts(
      createSlot.resourceId,
      createSlot.start,
      createSlot.end,
    );

    if (conflicts.length > 0) {
      throw new HttpException(
        conflicts as unknown as Record<string, unknown>,
        HttpStatus.CONFLICT,
      );
    }

    const slot = await this.manager.save(
      Slot.create({
        start: createSlot.start,
        end: createSlot.end,
        name: createSlot.name,
        resourceId: createSlot.resourceId,
      }),
    );

    return this.toSlotDto(slot);
  }

  async updateSlot(
    slotId: number,
    updateSlot: UpdateSlotTimesDto,
  ): Promise<SlotDto> {
    const existingSlot = await this.manager.findOneBy(Slot, { id: slotId });
    if (!existingSlot) {
      throw new HttpException('Slot not found', HttpStatus.NOT_FOUND);
    }

    const conflicts = await this.findConflicts(
      existingSlot.resourceId,
      updateSlot.start,
      updateSlot.end,
      slotId,
    );

    if (conflicts.length > 0) {
      throw new HttpException(
        conflicts as unknown as Record<string, unknown>,
        HttpStatus.CONFLICT,
      );
    }

    existingSlot.start = updateSlot.start;
    existingSlot.end = updateSlot.end;
    await this.manager.save(existingSlot);

    return this.toSlotDto(existingSlot);
  }
}
