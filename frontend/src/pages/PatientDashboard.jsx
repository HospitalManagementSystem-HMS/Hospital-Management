import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card.jsx";
import { Button } from "../ui/Button.jsx";
import { Badge } from "../ui/Badge.jsx";
import { Label } from "../ui/Input.jsx";

function statusTone(status) {
  if (status === "ACCEPTED") return "ok";
  if (status === "REJECTED") return "danger";
  if (status === "COMPLETED") return "neutral";
  return "warn";
}

function formatWhen(iso) {
  return new Date(iso).toLocaleString();
}

function nextSlots(days = 7) {
  const slots = [];
  const now = new Date();
  for (let dayOffset = 0; dayOffset < days; dayOffset += 1) {
    const d = new Date(now);
    d.setDate(now.getDate() + dayOffset);
    d.setHours(9, 0, 0, 0);
    for (let i = 0; i < 16; i += 1) {
      const s = new Date(d.getTime() + i * 30 * 60 * 1000);
      if (s.getTime() < now.getTime() + 10 * 60 * 1000) continue;
      slots.push(s);
    }
  }
  return slots;
}

export function PatientDashboard() {
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [doctorId, setDoctorId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const slots = useMemo(() => nextSlots(), []);

  async function load() {
    const [d, a] = await Promise.all([api.get("/doctors"), api.get("/appointments/me")]);
    setDoctors(d.data.doctors || []);
    setAppointments(a.data.appointments || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function book() {
    setError("");
    if (!doctorId) return setError("Select a doctor");
    if (!selectedSlot) return setError("Select a time slot");
    setBusy(true);
    try {
      await api.post("/appointments", { doctorId, startTime: new Date(selectedSlot).toISOString(), durationMinutes: 30 });
      setSelectedSlot("");
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || "Booking failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xl font-semibold text-slate-900">Patient Dashboard</div>
          <div className="mt-1 text-sm text-slate-600">Book appointments and track status.</div>
        </div>
        <Button variant="subtle" onClick={load}>
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Book Appointment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Doctor</Label>
              <select
                className="h-11 w-full rounded-xl border border-white/70 bg-white/70 px-4 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-brand-400/40"
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
              >
                <option value="">Select a doctor</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.specialization}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Time Slot (30 mins)</Label>
              <select
                className="h-11 w-full rounded-xl border border-white/70 bg-white/70 px-4 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-brand-400/40"
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
              >
                <option value="">Choose a slot</option>
                {slots.slice(0, 60).map((s) => (
                  <option key={s.toISOString()} value={s.toISOString()}>
                    {s.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
            {error ? <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</div> : null}
            <Button onClick={book} disabled={busy}>
              {busy ? "Booking..." : "Book appointment"}
            </Button>
            <div className="text-xs text-slate-500">
              Rule enforced: doctors cannot have overlapping appointments; one patient per time slot.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Appointments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {appointments.length === 0 ? <div className="text-sm text-slate-600">No appointments yet.</div> : null}
            {appointments.map((a) => (
              <div key={a._id} className="rounded-2xl border border-white/60 bg-white/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900">{a.doctorEmail || a.doctorId}</div>
                  <Badge tone={statusTone(a.status)}>{a.status}</Badge>
                </div>
                <div className="mt-1 text-sm text-slate-700">{formatWhen(a.startTime)}</div>
                {a.status === "COMPLETED" && a.prescription ? (
                  <div className="mt-3 rounded-xl border border-white/60 bg-white/70 p-3">
                    <div className="text-xs font-semibold text-slate-700">Prescription</div>
                    <ul className="mt-2 space-y-1 text-sm text-slate-800">
                      {a.prescription.medicines.map((m, idx) => (
                        <li key={idx}>
                          <span className="font-medium">{m.name}:</span> {m.instructions}
                        </li>
                      ))}
                    </ul>
                    {a.followUpDate ? <div className="mt-2 text-xs text-slate-600">Follow-up: {formatWhen(a.followUpDate)}</div> : null}
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

