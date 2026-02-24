import type { Slot } from '../types';
import { slotPosition, formatTime } from '../utils/time';
import { slotColor } from '../utils/color';
import './SlotBlock.css';

interface SlotBlockProps {
  slot: Slot;
  column: number;
  totalColumns: number;
  hasConflict: boolean;
  foreignResourceName?: string;
  onClick?: (slot: Slot) => void;
}

export function SlotBlock({ slot, column, totalColumns, hasConflict, foreignResourceName, onClick }: SlotBlockProps) {
  const position = slotPosition(slot.start, slot.end);
  const color = slotColor(slot.id);

  const widthPercent = 100 / totalColumns;
  const leftPercent = column * widthPercent;

  return (
    <div
      className="slot-block"
      style={{
        top: position.top,
        height: position.height,
        left: `calc(${leftPercent}% + 2px)`,
        width: `calc(${widthPercent}% - 4px)`,
        backgroundColor: color,
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={() => onClick?.(slot)}
    >
      <span className="slot-name">{slot.name}</span>
      {foreignResourceName && (
        <span className="slot-resource">{foreignResourceName}</span>
      )}
      <span className="slot-time">
        {formatTime(slot.start)} – {formatTime(slot.end)}
      </span>
      {hasConflict && (
        <span className="slot-conflict-icon" title="Scheduling conflict">
          <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      )}
    </div>
  );
}
