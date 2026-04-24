import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Bell, LogOut, Stethoscope, Shield, CalendarDays, HeartPulse, UserRound } from "lucide-react";
import { useAuth } from "../state/auth.jsx";
import { Drawer } from "./Drawer.jsx";
import { Button } from "./Button.jsx";
import { api } from "../lib/api.js";
import { Badge } from "./Badge.jsx";
import { cn } from "../lib/cn.js";

function RoleIcon({ role }) {
  if (role === "ADMIN") return <Shield className="h-4 w-4" />;
  if (role === "DOCTOR") return <Stethoscope className="h-4 w-4" />;
  return <HeartPulse className="h-4 w-4" />;
}

function formatWhen(iso) {
  return new Date(iso).toLocaleString();
}

function bucketForType(type) {
  if (type.startsWith("APPOINTMENT") || type.includes("SLOT") || type.includes("CANCELLED")) return "care";
  if (type.includes("PRESCRIPTION")) return "rx";
  if (type.includes("REMINDER") || type.includes("FOLLOW")) return "rem";
  if (type.includes("PROFILE")) return "account";
  return "other";
}

const GROUP_META = {
  care: "Care & visits",
  rx: "Prescriptions",
  rem: "Reminders",
  account: "Account",
  other: "Operations"
};

export function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const unread = useMemo(() => notifications.filter((n) => !n.readStatus).length, [notifications]);

  const sections = useMemo(() => {
    const order = ["care", "rx", "rem", "account", "other"];
    const map = { care: [], rx: [], rem: [], account: [], other: [] };
    for (const n of notifications) {
      map[bucketForType(n.type)].push(n);
    }
    return order.map((id) => ({ id, label: GROUP_META[id], items: map[id] })).filter((s) => s.items.length > 0);
  }, [notifications]);

  async function loadNotifications() {
    try {
      const resp = await api.get("/notifications");
      setNotifications(resp.data.notifications || []);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadNotifications();
    const t = setInterval(loadNotifications, 8000);
    return () => clearInterval(t);
  }, []);

  async function markRead(id) {
    await api.post(`/notifications/${id}/read`, { read: true });
    await loadNotifications();
  }

  const nav = useMemo(() => {
    if (!user) return [];
    if (user.role === "ADMIN") {
      return [
        { to: "/admin", label: "Admin", icon: <Shield className="h-4 w-4" /> },
        { to: "/profile", label: "Profile", icon: <UserRound className="h-4 w-4" /> }
      ];
    }
    if (user.role === "DOCTOR") {
      return [
        { to: "/doctor", label: "Doctor", icon: <Stethoscope className="h-4 w-4" /> },
        { to: "/profile", label: "Profile", icon: <UserRound className="h-4 w-4" /> }
      ];
    }
    return [
      { to: "/patient", label: "Patient", icon: <CalendarDays className="h-4 w-4" /> },
      { to: "/profile", label: "Profile", icon: <UserRound className="h-4 w-4" /> }
    ];
  }, [user]);

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/70 border border-white/60 shadow-sm flex items-center justify-center">
              <HeartPulse className="h-5 w-5 text-brand-700" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Helix HMS</div>
              <div className="text-xs text-slate-500">Neuro-clinical operations cloud</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="subtle" onClick={() => setDrawerOpen(true)}>
              <Bell className="h-4 w-4" />
              Alerts
              {unread ? (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs text-white">
                  {unread}
                </span>
              ) : null}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="rounded-2xl border border-white/60 bg-white/50 backdrop-blur-xl p-3 shadow-sm">
            <div className="px-3 py-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <RoleIcon role={user?.role} />
                {user?.role}
              </div>
              <div className="mt-1 text-xs text-slate-500">{user?.email}</div>
            </div>
            <div className="mt-2 space-y-1">
              {nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-white/70",
                      isActive && "bg-white/80 text-slate-900 border border-white/70 shadow-sm"
                    )
                  }
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </div>
          </aside>

          <main>{children}</main>
        </div>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Intelligent alerts">
        <div className="space-y-6">
          {notifications.length === 0 ? <div className="text-sm text-slate-600">No notifications yet.</div> : null}
          {sections.map((section) => (
            <div key={section.id}>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{section.label}</div>
              <div className="mt-2 space-y-3">
                {section.items.map((n) => (
                  <button
                    key={n._id}
                    onClick={() => markRead(n._id)}
                    className={cn(
                      "w-full text-left rounded-2xl border p-4 transition",
                      n.readStatus ? "border-white/60 bg-white/50" : "border-brand-200 bg-brand-50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-900">{n.type.replace(/_/g, " ")}</div>
                      <Badge tone={n.readStatus ? "neutral" : "info"}>{n.readStatus ? "Read" : "New"}</Badge>
                    </div>
                    <div className="mt-1 text-sm text-slate-700">{n.message}</div>
                    <div className="mt-2 text-xs text-slate-500">{formatWhen(n.createdAt)}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Drawer>
    </div>
  );
}
