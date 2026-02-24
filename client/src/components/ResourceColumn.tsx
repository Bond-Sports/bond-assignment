import type { Resource, Slot } from '../types';
import { computeSlotLayout } from '../utils/layout';
import { SlotBlock } from './SlotBlock';

interface ResourceColumnProps {
  resource: Resource;
  slots: Slot[];
  resources: Resource[];
  onSlotClick?: (slot: Slot) => void;
}

export function ResourceColumn({ resource, slots, resources, onSlotClick }: ResourceColumnProps) {
  const layout = computeSlotLayout(slots);

  const resourceName = (id: number) =>
    resources.find((r) => r.id === id)?.name ?? '';

  return (
    <div className="resource-column">
      <div className="resource-header">{resource.name}</div>
      <div className="resource-body">
        {layout.map(({ slot, column, totalColumns, hasConflict }) => (
          <SlotBlock
            key={slot.id}
            slot={slot}
            column={column}
            totalColumns={totalColumns}
            hasConflict={hasConflict}
            foreignResourceName={
              slot.resourceId !== resource.id
                ? resourceName(slot.resourceId)
                : undefined
            }
            onClick={onSlotClick}
          />
        ))}
      </div>
    </div>
  );
}
