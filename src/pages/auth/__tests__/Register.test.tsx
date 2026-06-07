import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { mockSupabase } from "../../../test/mocks/supabase";

vi.mock("../../../lib/supabase", () => ({ supabase: mockSupabase }));
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...(actual as object), useNavigate: () => vi.fn() };
});

import Register from "../Register";
import { AuthProvider } from "../../../contexts/AuthContext";

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={["/register"]}>
      <AuthProvider>
        <Register />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("Register Page", () => {
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

  it("renders registration form fields", async () => {
    renderRegister();
    expect(await screen.findByPlaceholderText("you@lawfirm.com")).toBeInTheDocument();
  });

  it("renders create account button", async () => {
    renderRegister();
    expect(await screen.findByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("has a link to login page", async () => {
    renderRegister();
    expect(await screen.findByText(/sign in/i)).toBeInTheDocument();
  });
});
