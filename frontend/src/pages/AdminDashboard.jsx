import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../lib/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card.jsx";
import { Button } from "../ui/Button.jsx";
import { Input, Label } from "../ui/Input.jsx";
import { Badge } from "../ui/Badge.jsx";
import { Modal } from "../ui/Modal.jsx";

function formatWhen(iso) {
  return new Date(iso).toLocaleString();
}

function toneForStatus(status) {
  if (status === "ACCEPTED") return "ok";
  if (status === "REJECTED") return "danger";
  if (status === "PENDING") return "warn";
  if (status === "CANCELLED") return "danger";
  return "neutral";
}

export function AdminDashboard() {
  const [name, setName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [experienceYears, setExperienceYears] = useState("0");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activities, setActivities] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [detail, setDetail] = useState({ open: false, kind: "", data: null });

  async function load() {
    const [act, ap, doc, pat, ax] = await Promise.all([
      api.get("/admin/activities"),
      api.get("/admin/appointments"),
      api.get("/admin/doctors"),
      api.get("/admin/patients"),
      api.get("/admin/analytics")
    ]);
    setActivities(act.data.activities || []);
    setAppointments(ap.data.appointments || []);
    setDoctors(doc.data.doctors || []);
    setPatients(pat.data.patients || []);
    setAnalytics(ax.data);
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
      await api.post("/admin/doctors", {
        name,
        specialization,
        email,
        password,
        experienceYears: Number(experienceYears || 0)
      });
      setSuccess("Doctor created");
      setName("");
      setSpecialization("");
      setExperienceYears("0");
      setEmail("");
      setPassword("");
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to create doctor");
    } finally {
      setBusy(false);
    }
  }

  async function openDoctorDetail(id) {
    const resp = await api.get(`/admin/doctors/${id}`);
    setDetail({ open: true, kind: "doctor", data: resp.data });
  }

  async function openPatientDetail(id) {
    const resp = await api.get(`/admin/patients/${id}`);
    setDetail({ open: true, kind: "patient", data: resp.data });
  }

  async function deleteDoctor(id, label) {
    if (!window.confirm(`Delete doctor ${label}? This cancels active appointments and removes their account.`)) return;
    try {
      await api.delete(`/admin/doctor/${id}`);
      await load();
    } catch (err) {
      alert(err?.response?.data?.error || "Delete failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-2xl font-semibold tracking-tight text-slate-900">Command Center</div>
          <div className="mt-1 text-sm text-slate-600">Clinical workforce, population health signals, and live operations.</div>
        </div>
        <Button variant="subtle" onClick={load}>
          Refresh
        </Button>
      </div>

      {analytics ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total appointments", value: analytics.totalAppointments, sub: "All time" },
            { label: "Active doctors (schedule)", value: analytics.activeDoctors, sub: "With pending / accepted" },
            { label: "Patient profiles", value: analytics.patientProfiles, sub: "Registered patients" },
            { label: "Doctor profiles", value: analytics.doctorProfiles, sub: "On medical staff" }
          ].map((k, idx) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
              <Card className="border-white/70 bg-gradient-to-br from-white/70 via-white/45 to-emerald-50/30">
                <CardContent className="p-5">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k.label}</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-900">{k.value}</div>
                  <div className="mt-1 text-xs text-slate-600">{k.sub}</div>
                  {analytics.appointmentsByStatus ? (
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-600">
                      <span>P {analytics.appointmentsByStatus.PENDING}</span>
                      <span>· A {analytics.appointmentsByStatus.ACCEPTED}</span>
                      <span>· R {analytics.appointmentsByStatus.REJECTED}</span>
                      <span>· C {analytics.appointmentsByStatus.COMPLETED}</span>
                      <span>· X {analytics.appointmentsByStatus.CANCELLED ?? 0}</span>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-white/70 bg-white/55 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Onboard physician</CardTitle>
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
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Experience (years)</Label>
                  <Input value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} type="number" min={0} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Email</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="doctor@hospital.local" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Temporary password</Label>
                <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Min 8 chars" required />
              </div>
              {error ? <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</div> : null}
              {success ? <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">{success}</div> : null}
              <Button disabled={busy} type="submit">
                {busy ? "Creating..." : "Create doctor"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/55 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Live activity stream</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {activities.length === 0 ? <div className="text-sm text-slate-600">No activity yet.</div> : null}
            {activities.slice(0, 12).map((a, i) => (
              <motion.div
                key={a._id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="rounded-2xl border border-white/60 bg-white/50 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900">{a.action}</div>
                  <Badge tone="neutral">{formatWhen(a.createdAt)}</Badge>
                </div>
                <div className="mt-2 text-xs text-slate-600">{a.actorUserId || "system"}</div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-white/70 bg-white/55 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Medical staff</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[360px] overflow-y-auto">
            {doctors.length === 0 ? <div className="text-sm text-slate-600">No doctors yet.</div> : null}
            {doctors.map((d) => (
              <div key={d.id} className="flex gap-2 items-stretch">
                <button
                  type="button"
                  onClick={() => openDoctorDetail(d.id)}
                  className="flex-1 text-left rounded-2xl border border-white/60 bg-gradient-to-r from-white/70 to-sky-50/40 p-4 hover:shadow-sm transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-900">{d.name}</div>
                    <Badge tone="info">{d.specialization}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-slate-600">{d.email}</div>
                </button>
                <Button variant="danger" className="self-center" onClick={() => deleteDoctor(d.id, d.name)}>
                  Delete
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/55 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Patients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[360px] overflow-y-auto">
            {patients.length === 0 ? <div className="text-sm text-slate-600">No patients yet.</div> : null}
            {patients.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => openPatientDetail(p.id)}
                className="w-full text-left rounded-2xl border border-white/60 bg-gradient-to-r from-white/70 to-emerald-50/40 p-4 hover:shadow-sm transition"
              >
                <div className="text-sm font-semibold text-slate-900">{p.name}</div>
                <div className="mt-1 text-xs text-slate-600">{p.email}</div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/70 bg-white/55 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Recent appointments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 max-h-[420px] overflow-y-auto">
          {appointments.length === 0 ? <div className="text-sm text-slate-600">No appointments yet.</div> : null}
          {appointments.slice(0, 14).map((a) => (
            <div key={a._id} className="rounded-2xl border border-white/60 bg-white/50 p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-sm font-semibold text-slate-900">{a.doctorEmail || a.doctorId}</div>
                <Badge tone={toneForStatus(a.status)}>{a.status}</Badge>
              </div>
              <div className="mt-1 text-sm text-slate-700">{formatWhen(a.startTime)}</div>
              <div className="mt-2 text-xs text-slate-600">Patient: {a.patientEmail || a.patientId}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Modal
        open={detail.open}
        title={detail.kind === "doctor" ? "Doctor intelligence" : "Patient intelligence"}
        onClose={() => setDetail({ open: false, kind: "", data: null })}
      >
        {!detail.data ? (
          <div className="text-sm text-slate-600">Loading…</div>
        ) : detail.kind === "doctor" ? (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <div className="text-lg font-semibold text-slate-900">{detail.data.doctor.name}</div>
              <div className="text-sm text-slate-600">{detail.data.doctor.email}</div>
              <div className="mt-2 text-xs text-slate-600">
                {detail.data.doctor.specialization}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Appointments</div>
              <div className="mt-2 space-y-2">
                {(detail.data.appointments || []).slice(0, 12).map((a) => (
                  <div key={a._id} className="rounded-xl border border-white/60 bg-white/60 p-3 text-xs">
                    <div className="flex justify-between gap-2">
                      <span>{formatWhen(a.startTime)}</span>
                      <Badge tone={toneForStatus(a.status)}>{a.status}</Badge>
                    </div>
                    <div className="mt-1 text-slate-600">Patient {a.patientId}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Prescription history</div>
              <div className="mt-2 space-y-2">
                {(detail.data.prescriptions || []).map((p) => (
                  <div key={String(p.appointmentId)} className="rounded-xl border border-white/60 bg-white/60 p-3 text-xs">
                    <div className="font-medium text-slate-800">{formatWhen(p.startTime)}</div>
                    <ul className="mt-2 space-y-1 text-slate-700">
                      {(p.prescription?.medicines || []).map((m, idx) => (
                        <li key={idx}>
                          {m.name}: {(m.schedule || []).join(", ") || "—"} — {m.instructions}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <div className="text-lg font-semibold text-slate-900">{detail.data.patient.name}</div>
              <div className="text-sm text-slate-600">{detail.data.patient.email}</div>
              {/* medical history removed by scope */}
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Appointments</div>
              <div className="mt-2 space-y-2">
                {(detail.data.appointments || []).slice(0, 12).map((a) => (
                  <div key={a._id} className="rounded-xl border border-white/60 bg-white/60 p-3 text-xs">
                    <div className="flex justify-between gap-2">
                      <span>{formatWhen(a.startTime)}</span>
                      <Badge tone={toneForStatus(a.status)}>{a.status}</Badge>
                    </div>
                    <div className="mt-1 text-slate-600">Doctor {a.doctorId}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Prescriptions</div>
              <div className="mt-2 space-y-2">
                {(detail.data.prescriptions || []).map((p) => (
                  <div key={String(p.appointmentId)} className="rounded-xl border border-white/60 bg-white/60 p-3 text-xs">
                    <div className="font-medium text-slate-800">{formatWhen(p.startTime)}</div>
                    <ul className="mt-2 space-y-1 text-slate-700">
                      {(p.prescription?.medicines || []).map((m, idx) => (
                        <li key={idx}>
                          {m.name}: {(m.schedule || []).join(", ") || "—"}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
