export function slotColor(slotId: number): string {
  const hue = (slotId * 137.508) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}
