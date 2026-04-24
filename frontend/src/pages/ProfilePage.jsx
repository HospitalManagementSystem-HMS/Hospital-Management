import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../lib/api.js";
import { setToken } from "../lib/authStorage.js";
import { useAuth } from "../state/auth.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card.jsx";
import { Button } from "../ui/Button.jsx";
import { Input, Label } from "../ui/Input.jsx";
import { SPECIALIZATIONS } from "../constants/specializations.js";

export function ProfilePage() {
  const { user, refreshMe } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const resp = await api.get("/profile/me");
    setName(resp.data.auth?.name || resp.data.profile?.name || "");
    setEmail(resp.data.auth?.email || "");
    setPhone(resp.data.auth?.phone || resp.data.profile?.phone || "");
    if (resp.data.profile?.specialization !== undefined) setSpecialization(resp.data.profile.specialization || "");
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
        phone
      };
      if (user?.role === "DOCTOR") payload.specialization = specialization;
      if (newPassword) {
        payload.newPassword = newPassword;
        payload.currentPassword = currentPassword;
      }
      const resp = await api.put("/profile/update", payload);
      if (resp.data.token) {
        setToken(resp.data.token);
        await refreshMe();
      }
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
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={name} readOnly disabled className="opacity-80" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={email} readOnly disabled className="opacity-80" type="email" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 …" />
              </div>

              {user?.role === "DOCTOR" ? (
                <div className="space-y-2">
                  <Label>Specialization</Label>
                  <select
                    className="h-11 w-full rounded-xl border border-white/70 bg-white/70 px-4 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-brand-400/40"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                  >
                    <option value="">Select specialization</option>
                    {SPECIALIZATIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
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
                <div className="text-xs text-slate-500">Required when changing your password.</div>
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

      {/* Directory snapshot removed (non-production UI) */}
    </div>
  );
}
