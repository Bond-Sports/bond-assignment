const MINUTES_IN_DAY = 1440;
const FULL_DAY_PERCENT = 100;

function calendarDay(datetime: string): string {
  return datetime.split('T')[0] ?? '';
}

function localToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function timeToPercent(datetime: string): number {
  const date = new Date(datetime);
  const minutes = date.getHours() * 60 + date.getMinutes();
  return (minutes / MINUTES_IN_DAY) * FULL_DAY_PERCENT;
}

/**
 * Day-view placement for today. A slot that started yesterday is drawn from
 * midnight, and a slot that ends tomorrow is drawn through midnight.
 * The stored start and end are unchanged.
 */
export function slotPosition(start: string, end: string) {
  const today = localToday();
  const topPercent = calendarDay(start) < today ? 0 : timeToPercent(start);
  const bottomPercent = calendarDay(end) > today ? FULL_DAY_PERCENT : timeToPercent(end);

  return {
    top: `${topPercent}%`,
    height: `${bottomPercent - topPercent}%`,
  };
}

export function formatTime(datetime: string): string {
  const date = new Date(datetime);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}
