export const ACTIVE_MS = 24 * 60 * 60 * 1000;
export const CYCLE_MS = 36 * 60 * 60 * 1000;
export function validCode(code: unknown): code is string {
  return typeof code === 'string' && /^25212007[a-z]{2}$/.test(code);
}
export function phase(start: number, now: number) {
  if (now >= start + CYCLE_MS) return {state:'available' as const};
  if (now >= start + ACTIVE_MS) return {state:'cooldown' as const, retryAt:start+CYCLE_MS};
  return {state:'active' as const, expiresAt:start+ACTIVE_MS};
}
// Redis owns the clock and performs activation atomically across concurrent visitors.
export const ACTIVATE = `
local clock = redis.call('TIME')
local now = tonumber(clock[1])*1000 + math.floor(tonumber(clock[2])/1000)
local start = tonumber(redis.call('GET', KEYS[1]))
if not start or now >= start + 129600000 then
 start = now
 redis.call('SET', KEYS[1], tostring(start), 'PX', 129600000)
end
return {start, now}
`;
