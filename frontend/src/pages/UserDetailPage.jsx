import { CircularProgress } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Aside from "../features/components/Aside";
import { http } from "../shared/api/http";

const ROLE_LABELS = {
  user: "Пользователь",
  employee: "Сотрудник",
  admin: "Администратор",
};

const ROLE_CLASSES = {
  user: "bg-slate-100 text-slate-500",
  employee: "bg-brand-50 text-brand-600",
  admin: "bg-violet-100 text-violet-700",
};

const AVATAR_PALETTE = [
  "bg-brand-500", "bg-emerald-500", "bg-violet-500",
  "bg-amber-500", "bg-rose-500", "bg-sky-600", "bg-teal-500", "bg-purple-500",
];

function getAvatarColor(id) {
  const n = id ? parseInt(id.replace(/-/g, "").slice(0, 8), 16) : 0;
  return AVATAR_PALETTE[n % AVATAR_PALETTE.length];
}

function getInitials(user) {
  const first = user.first_name?.[0]?.toUpperCase() ?? "";
  const last = user.last_name?.[0]?.toUpperCase() ?? "";
  return first + last || "?";
}

function formatDateTime(isoStr) {
  if (!isoStr) return "—";
  return new Date(isoStr).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-800">{value ?? "—"}</span>
    </div>
  );
}

export function UserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    http
      .get(`/v1/users/${id}`)
      .then(({ data }) => setUser(data))
      .catch(() => setError("Не удалось загрузить пользователя."))
      .finally(() => setLoading(false));
  }, [id]);

  const fullName = user ? `${user.first_name} ${user.last_name ?? ""}`.trim() : "";

  return (
    <div className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
        <div className="flex min-h-[calc(100vh-2rem)] overflow-hidden rounded-[32px] border border-white/70 bg-white/75 shadow-panel backdrop-blur sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)]">
          <Aside />

          <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 lg:px-8">
            <header className="flex items-center gap-4 border-b border-slate-200/80 px-6 py-6 lg:px-10">
              <button
                type="button"
                onClick={() => navigate("/users")}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                title="Назад к пользователям"
              >
                <BackIcon />
              </button>
              <h1 className="truncate text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                {loading ? "Загрузка..." : (fullName || "Пользователь")}
              </h1>
            </header>

            <div className="px-6 py-7 lg:px-10 lg:py-8">
              {loading && (
                <div className="flex justify-center py-24">
                  <CircularProgress />
                </div>
              )}

              {error && (
                <div className="rounded-2xl bg-rose-50 px-6 py-5 text-sm font-semibold text-rose-600">
                  {error}
                </div>
              )}

              {user && !loading && (
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="flex flex-col gap-6 lg:col-span-2">
                    <section className="flex items-center gap-5 rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm shadow-slate-200/60">
                      <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-lg font-black text-white ${getAvatarColor(user.id)}`}>
                        {getInitials(user)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xl font-extrabold text-slate-950">{fullName}</div>
                        <div className="mt-1">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${ROLE_CLASSES[user.role]}`}>
                            {ROLE_LABELS[user.role]}
                          </span>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm shadow-slate-200/60">
                      <div className="mb-4 text-base font-extrabold tracking-tight text-slate-950">
                        Контакты
                      </div>
                      <InfoRow label="Email" value={user.email} />
                    </section>
                  </div>

                  <div className="flex flex-col gap-6">
                    <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm shadow-slate-200/60">
                      <div className="mb-4 text-base font-extrabold tracking-tight text-slate-950">
                        Метаданные
                      </div>
                      <div className="flex flex-col gap-4">
                        <InfoRow label="Зарегистрирован" value={formatDateTime(user.created_at)} />
                        <InfoRow label="Последний вход" value={formatDateTime(user.last_login_at)} />
                        <InfoRow
                          label="ID"
                          value={<span className="font-mono text-xs text-slate-500">{user.id}</span>}
                        />
                      </div>
                    </section>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
