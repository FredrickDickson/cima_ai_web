import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { mockSupabase } from "../../test/mocks/supabase";

vi.mock("../../lib/supabase", () => ({ supabase: mockSupabase }));

import Dashboard from "../Dashboard";
import { AuthProvider } from "../../contexts/AuthContext";

function renderDashboard() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Dashboard />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("Dashboard", () => {
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
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "u1", full_name: "Test User", role: "lawyer" },
      }),
      then: (resolve: (v: unknown) => void) =>
        Promise.resolve({ data: [], error: null }).then(resolve),
    });
  });

  it("renders stat cards", async () => {
    renderDashboard();
    expect(await screen.findByText("Active Cases")).toBeInTheDocument();
    expect(screen.getAllByText("Documents").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Research Sessions").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Upcoming Hearings").length).toBeGreaterThanOrEqual(1);
  });

  it("renders quick action buttons", async () => {
    renderDashboard();
    expect(await screen.findByText("New Research")).toBeInTheDocument();
    expect(screen.getByText("New Case")).toBeInTheDocument();
    expect(screen.getByText("Upload Document")).toBeInTheDocument();
    expect(screen.getByText("Ask AI")).toBeInTheDocument();
  });
});
