import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";
import { api } from "../lib/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card.jsx";
import { Button } from "../ui/Button.jsx";
import { Badge } from "../ui/Badge.jsx";
import { Modal } from "../ui/Modal.jsx";
import { Input, Label } from "../ui/Input.jsx";

function tone(status) {
  if (status === "PENDING") return "warn";
  if (status === "ACCEPTED") return "ok";
  if (status === "REJECTED") return "danger";
  if (status === "CANCELLED") return "danger";
  return "neutral";
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

function emptyMedicineRow() {
  return { name: "", instructions: "", morning: true, noon: false, night: false };
}

function rowToMedicine(row) {
  const schedule = [];
  if (row.morning) schedule.push("MORNING");
  if (row.noon) schedule.push("NOON");
  if (row.night) schedule.push("NIGHT");
  return { name: row.name.trim(), instructions: row.instructions.trim(), schedule };
}

export function DoctorDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [busyId, setBusyId] = useState("");
  const [rxOpen, setRxOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [targetAppt, setTargetAppt] = useState(null);
  const [medicines, setMedicines] = useState([emptyMedicineRow()]);
  const [consultationNotes, setConsultationNotes] = useState("");
  const [prescriptionNotes, setPrescriptionNotes] = useState("");
  const [followUpRecommended, setFollowUpRecommended] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [error, setError] = useState("");
  const [myAvailability, setMyAvailability] = useState([]);
  const [avDate, setAvDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [avStart, setAvStart] = useState("09:00");
  const [avEnd, setAvEnd] = useState("10:00");
  const [avBusy, setAvBusy] = useState(false);
  const [avError, setAvError] = useState("");
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [showWeek, setShowWeek] = useState(false);
  const todayYmd = useMemo(() => new Date(nowTick).toISOString().slice(0, 10), [nowTick]);
  const minTimeToday = useMemo(() => new Date(nowTick).toTimeString().slice(0, 5), [nowTick]);

  const timeOptions = useMemo(() => {
    const opts = [];
    for (let h = 0; h < 24; h += 1) {
      for (let m = 0; m < 60; m += 30) {
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        opts.push(`${hh}:${mm}`);
      }
    }
    return opts;
  }, []);

  const isToday = useMemo(() => {
    if (!avDate) return false;
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return avDate === `${y}-${m}-${d}`;
  }, [avDate]);

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 30_000);
    
    // Connect WebSocket
    const socket = io(); // Connects to the same host which is proxied
    socket.on("availability_updated", () => loadMyAvailability());
    socket.on("appointment_updated", () => load());
    
    return () => {
      clearInterval(t);
      socket.disconnect();
    };
  }, []);

  function isPastTime(hhmm) {
    if (!avDate || !hhmm) return false;
    const dt = new Date(`${avDate}T${hhmm}:00`);
    return dt.getTime() < nowTick;
  }

  const pending = useMemo(() => appointments.filter((a) => a.status === "PENDING"), [appointments]);
  const active = useMemo(() => appointments.filter((a) => a.status === "ACCEPTED"), [appointments]);
  const completed = useMemo(() => appointments.filter((a) => a.status === "COMPLETED"), [appointments]);

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
    const resp = await api.get("/doctor/appointments");
    setAppointments(resp.data.appointments || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function loadMyAvailability() {
    try {
      const resp = await api.get("/doctor/availability");
      setMyAvailability(resp.data.availability || []);
    } catch {
      setMyAvailability([]);
    }
  }

  useEffect(() => {
    loadMyAvailability();
  }, []);

  async function addAvailability() {
    setAvError("");
    setAvBusy(true);
    try {
      if (!avDate) throw new Error("Pick a date");
      if (!avStart || !avEnd) throw new Error("Pick start and end times");
      if (avStart >= avEnd) throw new Error("End time must be after start time");
      if (isPastTime(avStart)) throw new Error("Cannot add past time slot");
      
      // Auto-generate 30 min interval slots
      const slots = [];
      let [sh, sm] = avStart.split(":").map(Number);
      const [eh, em] = avEnd.split(":").map(Number);
      
      let currentMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      
      while (currentMin < endMin) {
        let nextMin = currentMin + 30;
        if (nextMin > endMin) nextMin = endMin;
        
        const c_h = String(Math.floor(currentMin / 60)).padStart(2, "0");
        const c_m = String(currentMin % 60).padStart(2, "0");
        const n_h = String(Math.floor(nextMin / 60)).padStart(2, "0");
        const n_m = String(nextMin % 60).padStart(2, "0");
        
        slots.push({ time: `${c_h}:${c_m}-${n_h}:${n_m}` });
        currentMin = nextMin;
      }
      
      await api.post("/doctor/availability", { date: avDate, slots });
      await loadMyAvailability();
    } catch (e) {
      setAvError(e?.response?.data?.error || e.message || "Failed to add slot");
    } finally {
      setAvBusy(false);
    }
  }

  async function removeSlot(slotId) {
    await api.delete(`/doctor/availability/${slotId}`);
    await loadMyAvailability();
  }

  async function toggleSlot(slotId, enabled) {
    await api.patch(`/doctor/availability/${slotId}`, { enabled: !enabled });
    await loadMyAvailability();
  }

  async function decide(id, status) {
    setBusyId(id);
    try {
      await api.patch(`/appointments/${id}/decision`, { status });
      await Promise.all([load(), loadMyAvailability()]);
    } finally {
      setBusyId("");
    }
  }

  function openRx(a) {
    setError("");
    setTargetAppt(a);
    setMedicines([emptyMedicineRow()]);
    setPrescriptionNotes(a.prescription?.notes || "");
    setRxOpen(true);
  }

  function openNotes(a) {
    setError("");
    setTargetAppt(a);
    setConsultationNotes(a.consultationNotes || "");
    setNotesOpen(true);
  }

  function openComplete(a) {
    setError("");
    setTargetAppt(a);
    setConsultationNotes(a.consultationNotes || "");
    setFollowUpRecommended(false);
    setFollowUpDate("");
    setCompleteOpen(true);
  }

  async function savePrescription() {
    if (!targetAppt) return;
    setError("");
    const cleanedRows = medicines.map(rowToMedicine).filter((m) => m.name && m.instructions && m.schedule.length > 0);
    if (cleanedRows.length === 0) return setError("Add at least one medicine with a schedule (Morning / Noon / Night).");
    try {
      await api.post(`/appointments/${targetAppt._id}/prescription`, {
        medicines: cleanedRows,
        notes: prescriptionNotes
      });
      setRxOpen(false);
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to save prescription");
    }
  }

  async function saveNotes() {
    if (!targetAppt) return;
    setError("");
    try {
      await api.patch(`/appointments/${targetAppt._id}/consultation-notes`, { consultationNotes });
      setNotesOpen(false);
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to save notes");
    }
  }

  async function submitCompletion() {
    if (!targetAppt) return;
    setError("");
    const payload = {
      consultationNotes,
      followUpRecommended,
      followUpDate: followUpRecommended && followUpDate ? new Date(followUpDate).toISOString() : undefined
    };
    try {
      await api.post(`/appointments/${targetAppt._id}/consultation`, payload);
      setCompleteOpen(false);
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to complete consultation");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-2xl font-semibold tracking-tight text-slate-900">Clinical cockpit</div>
          <div className="mt-1 text-sm text-slate-600">Triage requests, orchestrate visits, digitize therapeutics with structured dosing windows.</div>
        </div>
        <div className="flex gap-2">
          <Button variant="subtle" onClick={() => setShowWeek((v) => !v)}>
            {showWeek ? "Hide week" : "View week"}
          </Button>
          <Button
            variant="subtle"
            onClick={() => {
              load();
              loadMyAvailability();
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      <Card className="border-white/70 bg-white/55 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Availability studio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" min={todayYmd} value={avDate} onChange={(e) => setAvDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Start time</Label>
              <Input
                type="time"
                min={isToday ? minTimeToday : undefined}
                value={avStart}
                onChange={(e) => setAvStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End time</Label>
              <Input
                type="time"
                min={avStart || (isToday ? minTimeToday : undefined)}
                value={avEnd}
                onChange={(e) => setAvEnd(e.target.value)}
              />
            </div>
          </div>
          {avError ? <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{avError}</div> : null}
          <Button onClick={addAvailability} disabled={avBusy}>
            {avBusy ? "Publishing…" : "Add slot"}
          </Button>
          <div className="grid grid-cols-1 gap-3 max-h-[320px] overflow-y-auto pr-1">
            {myAvailability.map((day) => (
              <div key={day.date} className="rounded-2xl border border-white/60 bg-white/60 p-3">
                <div className="text-xs font-semibold text-slate-700">{day.date}</div>
                <div className="mt-2 space-y-2">
                  {(day.slots || []).map((slot) => {
                    const booked = slot.isBooked;
                    const enabled = slot.enabled !== false;
                    return (
                      <div
                        key={slot.slotId}
                        className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
                          booked ? "border-rose-200 bg-rose-50" : enabled ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-slate-900">{slot.time}</div>
                          <div className="text-[11px] text-slate-600">
                            {booked ? "Booked" : enabled ? "Open" : "Paused"}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="subtle" disabled={booked} onClick={() => toggleSlot(slot.slotId, enabled)}>
                            {enabled ? "Pause" : "Resume"}
                          </Button>
                          <Button size="sm" variant="danger" disabled={booked} onClick={() => removeSlot(slot.slotId)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {showWeek ? (
      <Card className="border-white/70 bg-white/55 backdrop-blur-xl overflow-hidden">
        <CardHeader>
          <CardTitle>Week orbit (from {weekStart.toLocaleDateString()})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
            {weekDays.map((d) => {
              const key = d.toDateString();
              const items = calendarMap.get(key) || [];
              return (
                <div key={key} className="rounded-2xl border border-white/60 bg-gradient-to-b from-white/70 to-sky-50/30 p-3 min-h-[140px]">
                  <div className="text-xs font-semibold text-slate-700">{d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div>
                  <div className="mt-2 space-y-2">
                    {items.length === 0 ? <div className="text-[11px] text-slate-500">Open</div> : null}
                    {items.map((a) => (
                      <div key={a._id} className="rounded-xl bg-white/80 border border-white/70 p-2 text-[11px]">
                        <div className="font-semibold text-slate-900">{new Date(a.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                        <div className="text-slate-600 truncate">{a.patientEmail || a.patientId}</div>
                        <Badge tone={tone(a.status)}>{a.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle>Pending</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pending.length === 0 ? <div className="text-sm text-slate-600">No pending requests.</div> : null}
              {pending.map((a) => (
                <div key={a._id} className="rounded-2xl border border-white/60 bg-white/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-900">{a.patientEmail || a.patientId}</div>
                    <Badge tone={tone(a.status)}>{a.status}</Badge>
                  </div>
                  <div className="mt-1 text-sm text-slate-700">{formatWhen(a.startTime)}</div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => decide(a._id, "ACCEPTED")} disabled={busyId === a._id}>
                      Accept
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => decide(a._id, "REJECTED")} disabled={busyId === a._id}>
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card>
            <CardHeader>
              <CardTitle>Accepted</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {active.length === 0 ? <div className="text-sm text-slate-600">No accepted appointments.</div> : null}
              {active.map((a) => (
                <div key={a._id} className="rounded-2xl border border-white/60 bg-white/50 p-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-900">{a.patientEmail || a.patientId}</div>
                    <Badge tone={tone(a.status)}>{a.status}</Badge>
                  </div>
                  <div className="text-sm text-slate-700">{formatWhen(a.startTime)}</div>
                  {a.problemDescription ? (
                    <div className="rounded-xl border border-white/60 bg-white/70 p-3 text-xs text-slate-700">
                      <span className="font-semibold">Problem:</span> {a.problemDescription}
                    </div>
                  ) : null}
                  {a.consultationNotes ? <div className="text-xs text-slate-600">Notes on file</div> : null}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="subtle" onClick={() => openNotes(a)}>
                      Visit notes
                    </Button>
                    <Button size="sm" onClick={() => openComplete(a)}>
                      Complete visit
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle>Completed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {completed.length === 0 ? <div className="text-sm text-slate-600">No completed appointments.</div> : null}
              {completed.map((a) => (
                <div key={a._id} className="rounded-2xl border border-white/60 bg-white/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-900">{a.patientEmail || a.patientId}</div>
                    <Badge tone={tone(a.status)}>{a.status}</Badge>
                  </div>
                  <div className="mt-1 text-sm text-slate-700">{formatWhen(a.startTime)}</div>
                  {a.problemDescription ? <div className="mt-2 text-xs text-slate-600">Problem: {a.problemDescription}</div> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="subtle" onClick={() => openRx(a)}>
                      {a.prescription?.medicines?.length ? "Update prescription" : "Add prescription"}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Modal
        open={rxOpen}
        title="Structured prescription"
        onClose={() => setRxOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setRxOpen(false)}>
              Cancel
            </Button>
            <Button onClick={savePrescription}>Save prescription</Button>
          </div>
        }
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="text-xs text-slate-600">Map each medicine to Morning (08:30), Noon (12:30), Night (19:30). Stored as JSON schedules for automated reminders.</div>
          <div className="space-y-2">
            <Label>Prescription notes</Label>
            <textarea
              className="w-full rounded-xl border border-white/70 bg-white/70 p-3 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-brand-400/40"
              rows={2}
              value={prescriptionNotes}
              onChange={(e) => setPrescriptionNotes(e.target.value)}
            />
          </div>
          <div className="space-y-3">
            {medicines.map((m, idx) => (
              <div key={idx} className="rounded-2xl border border-white/60 bg-white/60 p-3 space-y-3">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <Input
                    value={m.name}
                    onChange={(e) => setMedicines((prev) => prev.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))}
                    placeholder="Medicine name"
                  />
                  <Input
                    value={m.instructions}
                    onChange={(e) => setMedicines((prev) => prev.map((x, i) => (i === idx ? { ...x, instructions: e.target.value } : x)))}
                    placeholder="Instructions"
                  />
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-slate-800">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={m.morning} onChange={(e) => setMedicines((prev) => prev.map((x, i) => (i === idx ? { ...x, morning: e.target.checked } : x)))} />
                    Morning
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={m.noon} onChange={(e) => setMedicines((prev) => prev.map((x, i) => (i === idx ? { ...x, noon: e.target.checked } : x)))} />
                    Noon
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={m.night} onChange={(e) => setMedicines((prev) => prev.map((x, i) => (i === idx ? { ...x, night: e.target.checked } : x)))} />
                    Night
                  </label>
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <Button size="sm" variant="subtle" onClick={() => setMedicines((prev) => [...prev, emptyMedicineRow()])}>
                Add medicine
              </Button>
              {medicines.length > 1 ? (
                <Button size="sm" variant="ghost" onClick={() => setMedicines((prev) => prev.slice(0, -1))}>
                  Remove last
                </Button>
              ) : null}
            </div>
          </div>
          {error ? <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</div> : null}
        </div>
      </Modal>

      <Modal
        open={notesOpen}
        title="Consultation notes"
        onClose={() => setNotesOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setNotesOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveNotes}>Save notes</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <textarea
            className="w-full rounded-xl border border-white/70 bg-white/70 p-3 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-brand-400/40"
            rows={5}
            value={consultationNotes}
            onChange={(e) => setConsultationNotes(e.target.value)}
            placeholder="Clinical narrative, vitals, differential, plan..."
          />
          {error ? <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</div> : null}
        </div>
      </Modal>

      <Modal
        open={completeOpen}
        title="Complete consultation"
        onClose={() => setCompleteOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setCompleteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitCompletion}>Mark completed</Button>
          </div>
        }
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="text-xs text-slate-600">
            Completion is allowed only after the scheduled time starts. Prescriptions are added after completion.
          </div>
          <div className="space-y-2">
            <Label>Consultation notes</Label>
            <textarea
              className="w-full rounded-xl border border-white/70 bg-white/70 p-3 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-brand-400/40"
              rows={3}
              value={consultationNotes}
              onChange={(e) => setConsultationNotes(e.target.value)}
            />
          </div>
          <div className="rounded-2xl border border-white/60 bg-white/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-900">Follow-up</div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={followUpRecommended} onChange={(e) => setFollowUpRecommended(e.target.checked)} />
                Recommend
              </label>
            </div>
            {followUpRecommended ? (
              <div className="mt-3 space-y-2">
                <Label>Suggested follow-up date/time</Label>
                <Input type="datetime-local" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
              </div>
            ) : null}
          </div>
          {error ? <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</div> : null}
        </div>
      </Modal>
    </div>
  );
}
