export function secondsUntil(endsAt: string, now: number): number {
  return Math.max(0, Math.floor((new Date(endsAt).getTime() - now) / 1000));
}
