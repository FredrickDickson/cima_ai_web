import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { mockSupabase } from "../../../test/mocks/supabase";

vi.mock("../../../lib/supabase", () => ({ supabase: mockSupabase }));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...(actual as object), useNavigate: () => mockNavigate };
});

import Login from "../Login";
import { AuthProvider } from "../../../contexts/AuthContext";

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("Login Page", () => {
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

  it("renders email and password fields", async () => {
    renderLogin();
    expect(await screen.findByPlaceholderText("you@lawfirm.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
  });

  it("renders sign in button", async () => {
    renderLogin();
    expect(await screen.findByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("calls signIn on form submit", async () => {
    const user = userEvent.setup();
    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: null });
    renderLogin();

    await user.type(await screen.findByPlaceholderText("you@lawfirm.com"), "test@law.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@law.com",
        password: "password123",
      });
    });
  });

  it("displays error on failed login", async () => {
    const user = userEvent.setup();
    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: {},
      error: { message: "Invalid login credentials" },
    });
    renderLogin();

    await user.type(await screen.findByPlaceholderText("you@lawfirm.com"), "bad@law.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Invalid login credentials")).toBeInTheDocument();
  });

  it("has a link to register page", async () => {
    renderLogin();
    expect(await screen.findByText(/create an account/i)).toHaveAttribute("href", "/register");
  });
});
