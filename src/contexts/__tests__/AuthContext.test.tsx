import { renderHook, waitFor, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { type ReactNode } from "react";
import { mockSupabase } from "../../test/mocks/supabase";

vi.mock("../../lib/supabase", () => ({ supabase: mockSupabase }));

import { AuthProvider, useAuth } from "../../contexts/AuthContext";

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it("starts with loading=true then resolves", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it("provides user when session exists", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: { user: { id: "u1", email: "a@b.com" } },
      },
      error: null,
    });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "u1", full_name: "Test", role: "lawyer" },
      }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user?.id).toBe("u1");
  });

  it("throws when used outside AuthProvider", () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used within AuthProvider"
    );
  });

  it("signIn calls supabase.auth.signInWithPassword", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      const res = await result.current.signIn("a@b.com", "pw");
      expect(res.error).toBeNull();
    });
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "pw",
    });
  });

  it("signOut calls supabase.auth.signOut", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signOut();
    });
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });
});
