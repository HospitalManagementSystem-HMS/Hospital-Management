import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
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

function startOfWeekMonday(ref) {
  const d = new Date(ref);
  const day = d.getDay();
  const diffFromMonday = (day + 6) % 7;
  d.setDate(d.getDate() - diffFromMonday);
  d.setHours(0, 0, 0, 0);
  return d;
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

function scheduleLabel(s) {
  if (s === "MORNING") return "08:30";
  if (s === "NOON") return "12:30";
  if (s === "NIGHT") return "19:30";
  return s;
}

export function PatientDashboard() {
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [doctorId, setDoctorId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const slots = useMemo(() => nextSlots(), []);

  const weekStart = useMemo(() => startOfWeekMonday(new Date()), []);
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const calendarMap = useMemo(() => {
    const map = new Map();
    for (const d of weekDays) {
      map.set(d.toDateString(), []);
    }
    for (const a of appointments) {
      const dt = new Date(a.startTime);
      const key = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).toDateString();
      if (!map.has(key)) continue;
      map.get(key).push(a);
    }
    for (const list of map.values()) list.sort((x, y) => new Date(x.startTime) - new Date(y.startTime));
    return map;
  }, [appointments, weekDays]);

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
          <div className="text-2xl font-semibold tracking-tight text-slate-900">Care journey</div>
          <div className="mt-1 text-sm text-slate-600">Reserve slots, monitor triage, and sync with therapeutic schedules.</div>
        </div>
        <Button variant="subtle" onClick={load}>
          Refresh
        </Button>
      </div>

      <Card className="border-white/70 bg-white/55 backdrop-blur-xl overflow-hidden">
        <CardHeader>
          <CardTitle>Your week at a glance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
            {weekDays.map((d) => {
              const key = d.toDateString();
              const items = calendarMap.get(key) || [];
              return (
                <motion.div layout key={key} className="rounded-2xl border border-white/60 bg-gradient-to-b from-white/70 to-emerald-50/25 p-3 min-h-[120px]">
                  <div className="text-xs font-semibold text-slate-700">{d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div>
                  <div className="mt-2 space-y-2">
                    {items.length === 0 ? <div className="text-[11px] text-slate-500">No visits</div> : null}
                    {items.map((a) => (
                      <div key={a._id} className="rounded-xl bg-white/85 border border-white/70 p-2 text-[11px]">
                        <div className="font-semibold text-slate-900">{new Date(a.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                        <div className="text-slate-600 truncate">{a.doctorEmail || a.doctorId}</div>
                        <Badge tone={statusTone(a.status)}>{a.status}</Badge>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-white/70 bg-white/55 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Book appointment</CardTitle>
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
              <Label>Time slot (30 minutes)</Label>
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
            <div className="text-xs text-slate-500">One patient per slot; overlapping bookings are blocked server-side.</div>
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/55 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Visits & therapeutics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {appointments.length === 0 ? <div className="text-sm text-slate-600">No appointments yet.</div> : null}
            {appointments.map((a) => (
              <motion.div layout key={a._id} className="rounded-2xl border border-white/60 bg-white/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900">{a.doctorEmail || a.doctorId}</div>
                  <Badge tone={statusTone(a.status)}>{a.status}</Badge>
                </div>
                <div className="mt-1 text-sm text-slate-700">{formatWhen(a.startTime)}</div>
                {a.consultationNotes ? (
                  <div className="mt-3 rounded-xl border border-white/60 bg-white/70 p-3 text-xs text-slate-700">
                    <span className="font-semibold">Clinical notes:</span> {a.consultationNotes}
                  </div>
                ) : null}
                {a.prescription?.medicines?.length ? (
                  <div className="mt-3 rounded-xl border border-white/60 bg-white/70 p-3">
                    <div className="text-xs font-semibold text-slate-700">Prescription</div>
                    <ul className="mt-2 space-y-2 text-sm text-slate-800">
                      {a.prescription.medicines.map((m, idx) => (
                        <li key={idx} className="rounded-lg bg-white/80 px-2 py-1">
                          <div className="font-medium">{m.name}</div>
                          <div className="text-xs text-slate-600">{m.instructions}</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {(m.schedule || []).map((s) => (
                              <span key={s} className="rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] text-brand-900">
                                {s} · {scheduleLabel(s)}
                              </span>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                    {a.prescription.notes ? <div className="mt-2 text-xs text-slate-600">Notes: {a.prescription.notes}</div> : null}
                  </div>
                ) : null}
                {a.followUpDate ? <div className="mt-2 text-xs text-slate-600">Follow-up: {formatWhen(a.followUpDate)}</div> : null}
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
