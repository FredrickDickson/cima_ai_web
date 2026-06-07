import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { mockSupabase } from "../../test/mocks/supabase";

vi.mock("../../lib/supabase", () => ({ supabase: mockSupabase }));

import Cases from "../Cases";
import { AuthProvider } from "../../contexts/AuthContext";

function renderCases() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Cases />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("Cases Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: { user: { id: "u1", email: "a@b.com" } },
      },
      error: null,
    });
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "u1", full_name: "Test User", role: "lawyer" },
      }),
      then: (resolve: (v: unknown) => void) =>
        Promise.resolve({ data: [], error: null }).then(resolve),
    });
  });

  it("renders the Cases page", async () => {
    renderCases();
    const matches = await screen.findAllByText(/case/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});
