import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../lib/api.js";
import { setToken } from "../lib/authStorage.js";
import { useAuth } from "../state/auth.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card.jsx";
import { Button } from "../ui/Button.jsx";
import { Input, Label } from "../ui/Input.jsx";

export function ProfilePage() {
  const { user, refreshMe } = useAuth();
  const [auth, setAuth] = useState(null);
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [experienceYears, setExperienceYears] = useState("0");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [adminTargetUserId, setAdminTargetUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const resp = await api.get("/profile/me");
    setAuth(resp.data.auth);
    setProfile(resp.data.profile);
    setName(resp.data.auth?.name || resp.data.profile?.name || "");
    setEmail(resp.data.auth?.email || "");
    setPhone(resp.data.auth?.phone || resp.data.profile?.phone || "");
    if (resp.data.profile?.medicalHistory !== undefined) setMedicalHistory(resp.data.profile.medicalHistory || "");
    if (resp.data.profile?.specialization !== undefined) setSpecialization(resp.data.profile.specialization || "");
    if (resp.data.profile?.experienceYears !== undefined) setExperienceYears(String(resp.data.profile.experienceYears ?? 0));
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  async function save(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const payload = {
        name,
        email,
        phone
      };
      if (user?.role === "PATIENT") payload.medicalHistory = medicalHistory;
      if (user?.role === "DOCTOR") {
        payload.specialization = specialization;
        payload.experienceYears = Number(experienceYears || 0);
      }
      if (newPassword) {
        payload.newPassword = newPassword;
        payload.currentPassword = currentPassword;
      }
      if (user?.role === "ADMIN" && adminTargetUserId.trim()) {
        payload.userId = adminTargetUserId.trim();
      }
      const resp = await api.put("/profile/update", payload);
      if (resp.data.token) {
        setToken(resp.data.token);
        await refreshMe();
      }
      setAuth(resp.data.auth);
      setProfile(resp.data.profile);
      setSuccess("Profile saved");
      setCurrentPassword("");
      setNewPassword("");
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold tracking-tight text-slate-900">Identity & security</div>
        <div className="mt-1 text-sm text-slate-600">Update your hospital directory details and credentials.</div>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-white/70 bg-white/55 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={save} className="space-y-4">
              {user?.role === "ADMIN" ? (
                <div className="space-y-2">
                  <Label>Admin override user ID (optional)</Label>
                  <Input value={adminTargetUserId} onChange={(e) => setAdminTargetUserId(e.target.value)} placeholder="Leave blank to edit yourself" />
                  <div className="text-xs text-slate-500">When set, updates apply to the selected account instead of yours.</div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 …" />
              </div>

              {user?.role === "PATIENT" ? (
                <div className="space-y-2">
                  <Label>Medical history notes</Label>
                  <textarea
                    className="w-full rounded-xl border border-white/70 bg-white/70 p-3 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-brand-400/40"
                    rows={4}
                    value={medicalHistory}
                    onChange={(e) => setMedicalHistory(e.target.value)}
                  />
                </div>
              ) : null}

              {user?.role === "DOCTOR" ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Specialization</Label>
                    <Input value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Experience (years)</Label>
                    <Input value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} type="number" min={0} />
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl border border-white/60 bg-white/50 p-4 space-y-3">
                <div className="text-sm font-semibold text-slate-900">Change password</div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Current password</Label>
                    <Input value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label>New password</Label>
                    <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" />
                  </div>
                </div>
                <div className="text-xs text-slate-500">Required when changing email or password for your own account.</div>
              </div>

              {error ? <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</div> : null}
              {success ? <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">{success}</div> : null}

              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      <Card className="border-white/70 bg-white/55 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Directory snapshot</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700 space-y-2">
          <div>
            <span className="font-semibold">Role:</span> {auth?.role}
          </div>
          <div>
            <span className="font-semibold">Auth ID:</span> {auth?.id}
          </div>
          {profile ? (
            <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-slate-900/90 text-emerald-100 p-3 text-xs">{JSON.stringify(profile, null, 2)}</pre>
          ) : (
            <div className="text-slate-500">No extended profile row (admin accounts).</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
