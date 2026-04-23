import React, { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card.jsx";
import { Button } from "../ui/Button.jsx";
import { Input, Label } from "../ui/Input.jsx";
import { Badge } from "../ui/Badge.jsx";

function formatWhen(iso) {
  return new Date(iso).toLocaleString();
}

export function AdminDashboard() {
  const [name, setName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activities, setActivities] = useState([]);
  const [appointments, setAppointments] = useState([]);

  async function load() {
    const [act, ap] = await Promise.all([api.get("/admin/activities"), api.get("/admin/appointments")]);
    setActivities(act.data.activities || []);
    setAppointments(ap.data.appointments || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function createDoctor(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      await api.post("/admin/doctors", { name, specialization, email, password });
      setSuccess("Doctor created");
      setName("");
      setSpecialization("");
      setEmail("");
      setPassword("");
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to create doctor");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xl font-semibold text-slate-900">Admin Dashboard</div>
          <div className="mt-1 text-sm text-slate-600">Create doctors, monitor appointments and system activity.</div>
        </div>
        <Button variant="subtle" onClick={load}>
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create Doctor</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createDoctor} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Name" required />
                </div>
                <div className="space-y-2">
                  <Label>Specialization</Label>
                  <Input value={specialization} onChange={(e) => setSpecialization(e.target.value)} placeholder="Cardiology" required />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="doctor@hospital.local" required />
                </div>
                <div className="space-y-2">
                  <Label>Temporary Password</Label>
                  <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Min 8 chars" required />
                </div>
              </div>
              {error ? <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</div> : null}
              {success ? <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">{success}</div> : null}
              <Button disabled={busy} type="submit">
                {busy ? "Creating..." : "Create doctor"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activities.length === 0 ? <div className="text-sm text-slate-600">No activity yet.</div> : null}
            {activities.slice(0, 10).map((a) => (
              <div key={a._id} className="rounded-2xl border border-white/60 bg-white/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900">{a.action}</div>
                  <Badge tone="neutral">{formatWhen(a.createdAt)}</Badge>
                </div>
                <div className="mt-2 text-xs text-slate-600">{a.actorUserId || "system"}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Appointments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {appointments.length === 0 ? <div className="text-sm text-slate-600">No appointments yet.</div> : null}
          {appointments.slice(0, 12).map((a) => (
            <div key={a._id} className="rounded-2xl border border-white/60 bg-white/50 p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-sm font-semibold text-slate-900">{a.doctorEmail || a.doctorId}</div>
                <Badge
                  tone={
                    a.status === "ACCEPTED" ? "ok" : a.status === "REJECTED" ? "danger" : a.status === "PENDING" ? "warn" : "neutral"
                  }
                >
                  {a.status}
                </Badge>
              </div>
              <div className="mt-1 text-sm text-slate-700">{formatWhen(a.startTime)}</div>
              <div className="mt-2 text-xs text-slate-600">Patient: {a.patientEmail || a.patientId}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

