const MINUTES_IN_DAY = 1440;

export function timeToPercent(datetime: string): number {
  const date = new Date(datetime);
  const minutes = date.getHours() * 60 + date.getMinutes();
  return (minutes / MINUTES_IN_DAY) * 100;
}

export function slotPosition(start: string, end: string) {
  const topPercent = Math.max(0, timeToPercent(start));
  const bottomPercent = Math.min(100, timeToPercent(end));
  return {
    top: `${topPercent}%`,
    height: `${bottomPercent - topPercent}%`,
  };
}

export function formatTime(datetime: string): string {
  const date = new Date(datetime);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}
