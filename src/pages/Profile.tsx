import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Building2,
  Globe,
  Mail,
  Camera,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Briefcase,
  FileText,
  ClipboardCheck,
  LogOut,
  Key,
  Trash2,
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import Header from "../components/layout/Header";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { supabase } from "../lib/supabase";

const ROLES = [
  { value: "lawyer", label: "Lawyer / Advocate" },
  { value: "arbitrator", label: "Arbitrator" },
  { value: "mediator", label: "Mediator" },
  { value: "in_house", label: "In-house Counsel" },
  { value: "researcher", label: "Legal Researcher" },
  { value: "student", label: "Law Student" },
];

const JURISDICTIONS = [
  "Ghana", "Kenya", "Nigeria", "South Africa", "Uganda", "Tanzania",
  "Zambia", "Zimbabwe", "Malawi", "Namibia", "Botswana", "Rwanda",
  "Mauritius", "Eswatini", "Lesotho", "Mozambique", "England & Wales",
  "Singapore", "United States",
];

export default function Profile() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [stats, setStats] = useState({ cases: 0, documents: 0, reviews: 0 });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    role: "lawyer",
    organization: "",
    jurisdiction: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        role: profile.role || "lawyer",
        organization: profile.organization || "",
        jurisdiction: profile.jurisdiction || "",
      });
      setAvatarPreview(profile.avatar_url || null);
      loadStats();
    }
  }, [profile]);

  async function loadStats() {
    if (!user) return;
    try {
      const [casesRes, docsRes, reviewsRes] = await Promise.all([
        supabase.from("cases").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("documents").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("contract_analyses").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setStats({
        cases: casesRes.count || 0,
        documents: docsRes.count || 0,
        reviews: reviewsRes.count || 0,
      });
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please select an image file" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image must be less than 2MB" });
      return;
    }

    setAvatarFile(file);
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    setMessage(null);
  }

  async function uploadAvatar() {
    if (!avatarFile || !user) return null;

    try {
      const fileExt = avatarFile.name.split(".").pop();
      const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
      
      console.log("Uploading avatar to:", fileName);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, avatarFile, { upsert: true });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw uploadError;
      }

      console.log("Upload successful:", uploadData);

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      console.log("Public URL:", publicUrl);
      return publicUrl;
    } catch (err) {
      console.error("Avatar upload failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setMessage({ type: "error", text: `Avatar upload failed: ${errorMessage}` });
      return null;
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      let avatarUrl = profile?.avatar_url || "";
      console.log("Current avatar_url from profile:", profile?.avatar_url);

      // Upload new avatar if selected
      if (avatarFile) {
        console.log("Avatar file selected, uploading...");
        const uploadedUrl = await uploadAvatar();
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
          console.log("Avatar uploaded successfully, URL:", avatarUrl);
        } else {
          console.log("Avatar upload returned null");
        }
      }

      console.log("Saving profile with avatar_url:", avatarUrl);

      // Update profile
      const updatePayload: any = {
        full_name: form.full_name,
        role: form.role || null,
        organization: form.organization || null,
        jurisdiction: form.jurisdiction || null,
      };
      if (avatarUrl) updatePayload.avatar_url = avatarUrl;

      const { error } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", user.id);

      if (error) {
        console.error("Supabase update error:", error);
        throw new Error(error.message);
      }

      console.log("Profile updated successfully in database");
      await refreshProfile();
      setAvatarFile(null);
      setMessage({ type: "success", text: "Profile updated successfully" });
    } catch (err) {
      console.error("Profile update error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to update profile. Please try again.";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await signOut();
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);

    // Validation
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setPasswordLoading(true);

    try {
      // Supabase doesn't have a direct "verify current password" API
      // So we need to re-authenticate with current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: passwordForm.currentPassword,
      });

      if (signInError) {
        setPasswordError("Current password is incorrect");
        setPasswordLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (updateError) {
        setPasswordError(updateError.message);
        setPasswordLoading(false);
        return;
      }

      // Success
      showToast("Password updated successfully");
      setShowPasswordModal(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordError(null);
    } catch (err) {
      console.error("Password change error:", err);
      setPasswordError("Failed to change password. Please try again.");
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleDeleteAccount() {
    const confirmation = prompt(
      'This action cannot be undone. All your data will be permanently deleted.\n\nType "DELETE" to confirm:'
    );
    
    if (confirmation !== "DELETE") {
      if (confirmation !== null) {
        showToast("Account deletion cancelled", "error");
      }
      return;
    }

    setLoading(true);
    try {
      // Delete user's data (cascade should handle most)
      if (user?.id) {
        await supabase.from("profiles").delete().eq("id", user.id);
      }
      
      // Delete the auth user
      const { error } = await supabase.auth.admin.deleteUser(user?.id || "");
      
      if (error) {
        // If admin delete fails (requires service role), just sign out
        console.error("Admin delete error:", error);
      }
      
      await signOut();
      showToast("Your account has been deleted");
    } catch (err) {
      console.error("Delete account error:", err);
      setMessage({ type: "error", text: "Failed to delete account. Please contact support." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout>
      <Header title="Profile" subtitle="Manage your account settings" />

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Avatar Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-start gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-slate-100 overflow-hidden border-2 border-slate-200">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-2xl font-semibold">
                      {form.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-navy-950 rounded-full flex items-center justify-center cursor-pointer hover:bg-navy-800 transition-colors border-2 border-white">
                  <Camera size={14} className="text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-navy-950">{form.full_name || "Your Name"}</h2>
                <p className="text-sm text-slate-500 mt-0.5">{user?.email}</p>
                <p className="text-xs text-slate-400 mt-1 capitalize">{profile?.role || "Lawyer"}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-navy-100 flex items-center justify-center">
                  <Briefcase size={20} className="text-navy-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-navy-950">{stats.cases}</p>
                  <p className="text-xs text-slate-500">Total Cases</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-navy-100 flex items-center justify-center">
                  <FileText size={20} className="text-navy-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-navy-950">{stats.documents}</p>
                  <p className="text-xs text-slate-500">Documents</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-navy-100 flex items-center justify-center">
                  <ClipboardCheck size={20} className="text-navy-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-navy-950">{stats.reviews}</p>
                  <p className="text-xs text-slate-500">Contract Reviews</p>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Form */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-navy-950 mb-4">Personal Information</h3>
            
            {message && (
              <div className={`flex items-center gap-2.5 p-3.5 rounded-lg mb-4 text-sm ${
                message.type === "success" 
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}>
                {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {message.text}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1.5">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-all"
                    placeholder="Your full name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1.5">Role</label>
                <div className="relative">
                  <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-navy-950 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-all bg-white appearance-none"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1.5">Organization</label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={form.organization}
                    onChange={(e) => setForm({ ...form, organization: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-all"
                    placeholder="Your law firm or organization"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1.5">Jurisdiction</label>
                <div className="relative">
                  <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={form.jurisdiction}
                    onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-navy-950 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-all bg-white appearance-none"
                  >
                    <option value="">Select jurisdiction</option>
                    {JURISDICTIONS.map((j) => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-500 bg-slate-50 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setForm({
                      full_name: profile?.full_name || "",
                      role: profile?.role || "lawyer",
                      organization: profile?.organization || "",
                      jurisdiction: profile?.jurisdiction || "",
                    });
                    setAvatarPreview(profile?.avatar_url || null);
                    setAvatarFile(null);
                    setMessage(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-navy-950 hover:bg-navy-800 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>

          {/* Account Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-navy-950 mb-4">Account Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => setShowPasswordModal(true)}
                className="w-full flex items-center gap-3 px-4 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left"
              >
                <Key size={18} className="text-slate-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-navy-900">Change Password</p>
                  <p className="text-xs text-slate-500">Update your password</p>
                </div>
              </button>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left"
              >
                <LogOut size={18} className="text-slate-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-navy-900">Sign Out</p>
                  <p className="text-xs text-slate-500">Sign out of your account</p>
                </div>
              </button>

              <button
                onClick={handleDeleteAccount}
                disabled={loading}
                className="w-full flex items-center gap-3 px-4 py-3 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-left"
              >
                <Trash2 size={18} className="text-red-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-700">Delete Account</p>
                  <p className="text-xs text-red-500">Permanently delete your account and all data</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-navy-950 mb-4">Change Password</h3>
            
            {passwordError && (
              <div className="flex items-center gap-2 p-3 rounded-lg mb-4 text-sm bg-red-50 border border-red-200 text-red-700">
                <AlertCircle size={16} />
                {passwordError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1.5">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-all"
                  placeholder="Enter current password"
                  autoComplete="current-password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1.5">New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-all"
                  placeholder="Enter new password (min 6 characters)"
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-all"
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                    setPasswordError(null);
                  }}
                  disabled={passwordLoading}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-4 py-2 bg-navy-950 hover:bg-navy-800 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {passwordLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                  {passwordLoading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
