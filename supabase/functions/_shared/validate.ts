import { HttpError } from "./http-error.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireString(
  value: unknown,
  field: string,
  opts: { maxLength: number; minLength?: number } = { maxLength: 4000 },
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpError(400, `${field} is required`);
  }
  if (opts.minLength && value.length < opts.minLength) {
    throw new HttpError(400, `${field} must be at least ${opts.minLength} characters`);
  }
  if (value.length > opts.maxLength) {
    throw new HttpError(400, `${field} must be at most ${opts.maxLength} characters`);
  }
  return value;
}

export function optionalString(value: unknown, field: string, maxLength: number): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new HttpError(400, `${field} must be a string`);
  if (value.length > maxLength) throw new HttpError(400, `${field} must be at most ${maxLength} characters`);
  return value;
}

export function requireUUID(value: unknown, field: string): string {
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    throw new HttpError(400, `${field} must be a valid UUID`);
  }
  return value;
}

export function optionalUUID(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return requireUUID(value, field);
}

export function requireEnum<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new HttpError(400, `${field} must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
}

export function optionalEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return requireEnum(value, field, allowed);
}

export function optionalUUIDArray(value: unknown, field: string, maxItems = 20): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw new HttpError(400, `${field} must be an array`);
  if (value.length > maxItems) throw new HttpError(400, `${field} may contain at most ${maxItems} items`);
  return value.map((v) => requireUUID(v, `${field}[]`));
}

export function requireArray<T>(
  value: unknown,
  field: string,
  opts: { maxItems: number; itemValidator: (item: unknown, index: number) => T },
): T[] {
  if (!Array.isArray(value)) throw new HttpError(400, `${field} must be an array`);
  if (value.length > opts.maxItems) {
    throw new HttpError(400, `${field} may contain at most ${opts.maxItems} items`);
  }
  return value.map((item, i) => opts.itemValidator(item, i));
}
