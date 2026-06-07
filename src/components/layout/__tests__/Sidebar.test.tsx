import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { mockSupabase } from "../../../test/mocks/supabase";

vi.mock("../../../lib/supabase", () => ({ supabase: mockSupabase }));

import Sidebar from "../Sidebar";
import { AuthProvider } from "../../../contexts/AuthContext";

function renderSidebar() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Sidebar />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("Sidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it("renders all navigation links", async () => {
    renderSidebar();
    const labels = [
      "Dashboard", "Research", "Cases", "Documents",
      "Drafting Studio", "Contract Review", "AI Assistant",
    ];
    for (const label of labels) {
      expect(await screen.findByText(label)).toBeInTheDocument();
    }
  });

  it("renders CIMA AI branding", async () => {
    renderSidebar();
    expect(await screen.findByText("CIMA")).toBeInTheDocument();
    expect(screen.getByText("AI")).toBeInTheDocument();
  });
});
