import React, { useEffect, useMemo, useState } from "react";
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
  return "neutral";
}

function formatWhen(iso) {
  return new Date(iso).toLocaleString();
}

export function DoctorDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [busyId, setBusyId] = useState("");
  const [consultOpen, setConsultOpen] = useState(false);
  const [consultAppt, setConsultAppt] = useState(null);
  const [medicines, setMedicines] = useState([{ name: "", instructions: "" }]);
  const [notes, setNotes] = useState("");
  const [followUpRecommended, setFollowUpRecommended] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [error, setError] = useState("");

  const pending = useMemo(() => appointments.filter((a) => a.status === "PENDING"), [appointments]);
  const active = useMemo(() => appointments.filter((a) => a.status === "ACCEPTED"), [appointments]);
  const completed = useMemo(() => appointments.filter((a) => a.status === "COMPLETED"), [appointments]);

  async function load() {
    const resp = await api.get("/doctor/appointments");
    setAppointments(resp.data.appointments || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(id, status) {
    setBusyId(id);
    try {
      await api.patch(`/appointments/${id}/decision`, { status });
      await load();
    } finally {
      setBusyId("");
    }
  }

  function openConsult(a) {
    setError("");
    setConsultAppt(a);
    setMedicines([{ name: "", instructions: "" }]);
    setNotes("");
    setFollowUpRecommended(false);
    setFollowUpDate("");
    setConsultOpen(true);
  }

  async function submitConsultation() {
    if (!consultAppt) return;
    setError("");
    const cleaned = medicines.filter((m) => m.name.trim() && m.instructions.trim());
    if (cleaned.length === 0) return setError("Add at least one medicine");
    try {
      await api.post(`/appointments/${consultAppt._id}/consultation`, {
        medicines: cleaned,
        notes,
        followUpRecommended,
        followUpDate: followUpRecommended && followUpDate ? new Date(followUpDate).toISOString() : undefined
      });
      setConsultOpen(false);
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to save consultation");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xl font-semibold text-slate-900">Doctor Dashboard</div>
          <div className="mt-1 text-sm text-slate-600">Review requests, manage schedule, add consultations.</div>
        </div>
        <Button variant="subtle" onClick={load}>
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
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

        <Card>
          <CardHeader>
            <CardTitle>Accepted</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {active.length === 0 ? <div className="text-sm text-slate-600">No accepted appointments.</div> : null}
            {active.map((a) => (
              <div key={a._id} className="rounded-2xl border border-white/60 bg-white/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900">{a.patientEmail || a.patientId}</div>
                  <Badge tone={tone(a.status)}>{a.status}</Badge>
                </div>
                <div className="mt-1 text-sm text-slate-700">{formatWhen(a.startTime)}</div>
                <div className="mt-3">
                  <Button size="sm" onClick={() => openConsult(a)}>
                    Add consultation & complete
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

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
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Modal
        open={consultOpen}
        title="Consultation Notes"
        onClose={() => setConsultOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setConsultOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitConsultation}>Save & complete</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">{consultAppt?.patientEmail || consultAppt?.patientId}</div>
            <div className="text-xs text-slate-600">{consultAppt ? formatWhen(consultAppt.startTime) : ""}</div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-900">Prescription</div>
            <div className="space-y-3">
              {medicines.map((m, idx) => (
                <div key={idx} className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <Input
                    value={m.name}
                    onChange={(e) => setMedicines((prev) => prev.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))}
                    placeholder="Medicine name"
                  />
                  <Input
                    value={m.instructions}
                    onChange={(e) => setMedicines((prev) => prev.map((x, i) => (i === idx ? { ...x, instructions: e.target.value } : x)))}
                    placeholder="Instructions (e.g., 1-0-1 after food)"
                  />
                </div>
              ))}
              <div className="flex gap-2">
                <Button size="sm" variant="subtle" onClick={() => setMedicines((prev) => [...prev, { name: "", instructions: "" }])}>
                  Add medicine
                </Button>
                {medicines.length > 1 ? (
                  <Button size="sm" variant="ghost" onClick={() => setMedicines((prev) => prev.slice(0, -1))}>
                    Remove last
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <textarea
              className="w-full rounded-xl border border-white/70 bg-white/70 p-3 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-brand-400/40"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Consultation notes"
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

