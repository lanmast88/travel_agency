import { CircularProgress } from "@mui/material";
import { useEffect, useReducer } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Aside from "../features/components/Aside";
import { http } from "../shared/api/http";
import { getAvatarColor, getInitials } from "../shared/lib/avatar";
import { formatDate, formatDateTime } from "../shared/lib/format";

const LOYALTY_LABELS = {
  standard: "Стандарт",
  bronze: "Бронза",
  silver: "Серебро",
  gold: "Золото ★",
};

const LOYALTY_CLASSES = {
  standard: "bg-slate-100 text-slate-500",
  bronze: "bg-amber-100 text-amber-700",
  silver: "bg-slate-200 text-slate-600",
  gold: "bg-yellow-100 text-yellow-700",
};

function calcAge(birthDateStr) {
  if (!birthDateStr) return null;
  const today = new Date();
  const birth = new Date(birthDateStr);
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  return age;
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

export function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [{ client, loyalty, loading, error }, dispatch] = useReducer(
    (_, next) => next,
    { client: null, loyalty: null, loading: true, error: null },
  );

  useEffect(() => {
    dispatch({ client: null, loyalty: null, loading: true, error: null });
    Promise.all([
      http.get(`/v1/clients/${id}`),
      http.get(`/v1/clients/${id}/loyalty`),
    ])
      .then(([clientRes, loyaltyRes]) =>
        dispatch({ client: clientRes.data, loyalty: loyaltyRes.data, loading: false, error: null }),
      )
      .catch(() =>
        dispatch({ client: null, loyalty: null, loading: false, error: "Не удалось загрузить клиента." }),
      );
  }, [id]);

  const age = client ? calcAge(client.birth_date) : null;

  return (
    <div className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
        <div className="flex min-h-[calc(100vh-2rem)] overflow-hidden rounded-[32px] border border-white/70 bg-white/75 shadow-panel backdrop-blur sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)]">
          <Aside />

          <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 lg:px-8">
            <header className="flex items-center gap-4 border-b border-slate-200/80 px-6 py-6 lg:px-10">
              <button
                type="button"
                onClick={() => navigate("/clients")}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                title="Назад к клиентам"
              >
                <BackIcon />
              </button>
              <h1 className="truncate text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                {loading ? "Загрузка..." : (client?.full_name ?? "Клиент")}
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

              {client && !loading && (
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* ── Left: contacts + passport ── */}
                  <div className="flex flex-col gap-6 lg:col-span-2">
                    {/* Avatar + name header */}
                    <section className="flex items-center gap-5 rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm shadow-slate-200/60">
                      <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-lg font-black text-white ${getAvatarColor(client.id)}`}>
                        {getInitials(client.full_name)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xl font-extrabold text-slate-950">{client.full_name}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${LOYALTY_CLASSES[client.loyalty_level]}`}>
                            {LOYALTY_LABELS[client.loyalty_level]}
                          </span>
                          {client.is_vip && (
                            <span className="inline-flex rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700">
                              VIP
                            </span>
                          )}
                          {client.discount_pct > 0 && (
                            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                              Скидка {client.discount_pct}%
                            </span>
                          )}
                        </div>
                      </div>
                    </section>

                    {/* Contacts */}
                    <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm shadow-slate-200/60">
                      <div className="mb-4 text-base font-extrabold tracking-tight text-slate-950">
                        Контакты
                      </div>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <InfoRow label="Телефон" value={client.phone} />
                        <InfoRow label="Email" value={client.email} />
                        <InfoRow
                          label="Дата рождения"
                          value={age !== null ? `${formatDate(client.birth_date)} (${age} лет)` : formatDate(client.birth_date)}
                        />
                      </div>
                    </section>

                    {/* Passport */}
                    <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm shadow-slate-200/60">
                      <div className="mb-4 text-base font-extrabold tracking-tight text-slate-950">
                        Документ
                      </div>
                      <InfoRow label="Серия и номер паспорта" value={client.passport} />
                    </section>
                  </div>

                  {/* ── Right: loyalty stats + meta ── */}
                  <div className="flex flex-col gap-6">
                    <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm shadow-slate-200/60">
                      <div className="mb-4 text-base font-extrabold tracking-tight text-slate-950">
                        Лояльность
                      </div>
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-600">Уровень</span>
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${LOYALTY_CLASSES[client.loyalty_level]}`}>
                            {LOYALTY_LABELS[client.loyalty_level]}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-600">Покупок</span>
                          <span className="text-2xl font-black text-slate-950">{client.sales_count}</span>
                        </div>
                        {client.discount_pct > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-600">Скидка</span>
                            <span className="text-lg font-black text-emerald-600">{client.discount_pct}%</span>
                          </div>
                        )}
                        {loyalty?.next_level && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-600">Следующий уровень</span>
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${LOYALTY_CLASSES[loyalty.next_level]}`}>
                              {LOYALTY_LABELS[loyalty.next_level]}
                            </span>
                          </div>
                        )}
                        {loyalty?.sales_to_next_level != null && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-600">До следующего уровня</span>
                            <span className="text-base font-black text-slate-700">
                              {loyalty.sales_to_next_level} покупок
                            </span>
                          </div>
                        )}
                      </div>
                    </section>

                    <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm shadow-slate-200/60">
                      <div className="mb-4 text-base font-extrabold tracking-tight text-slate-950">
                        Метаданные
                      </div>
                      <div className="flex flex-col gap-4">
                        <InfoRow label="Добавлен" value={formatDateTime(client.created_at)} />
                        <InfoRow label="Обновлён" value={formatDateTime(client.updated_at)} />
                        <InfoRow label="ID" value={<span className="font-mono text-xs text-slate-500">{client.id}</span>} />
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
