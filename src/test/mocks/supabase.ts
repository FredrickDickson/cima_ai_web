import { vi } from "vitest";

function createQueryBuilder(data: unknown = [], error: unknown = null) {
  const builder: Record<string, unknown> = {};
  const chainMethods = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "in",
    "order", "limit", "range", "is", "not", "match", "filter",
  ];
  for (const m of chainMethods) {
    builder[m] = vi.fn(() => builder);
  }
  builder.single = vi.fn().mockResolvedValue({ data, error });
  builder.maybeSingle = vi.fn().mockResolvedValue({ data, error });
  builder.then = (resolve: (v: unknown) => void) =>
    Promise.resolve({ data, error }).then(resolve);
  return builder;
}

export function createMockSupabase() {
  return {
    from: vi.fn(() => createQueryBuilder()),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: { id: "test-uid" } },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: "test.pdf" }, error: null }),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: "https://test.supabase.co/storage/test.pdf" },
        })),
      })),
    },
  };
}

export const mockSupabase = createMockSupabase();
