import { CircularProgress } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Aside from "../features/components/Aside";
import { http } from "../shared/api/http";
import { fetchSalesLookups } from "../features/sales/salesSlice";

const STATUS_LABELS = { confirmed: "Подтверждена", cancelled: "Отменена" };
const STATUS_CLASSES = {
  confirmed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-600",
};

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = String(dateStr).split("-");
  return `${d}.${m}.${y}`;
}

function formatDateTime(isoStr) {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatMoney(value) {
  if (value === undefined || value === null) return "—";
  return `${Number(value).toLocaleString("ru-RU")} ₽`;
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

export function SaleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { clientsList, toursList, usersList, lookupsStatus } = useSelector((s) => s.sales);

  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (lookupsStatus === "idle") dispatch(fetchSalesLookups());
  }, [dispatch, lookupsStatus]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    http
      .get(`/v1/sales/${id}`)
      .then(({ data }) => setSale(data))
      .catch(() => setError("Не удалось загрузить продажу."))
      .finally(() => setLoading(false));
  }, [id]);

  function clientName(cid) {
    return clientsList.find((c) => c.id === cid)?.full_name ?? cid?.slice(0, 8) ?? "—";
  }
  function tourName(tid) {
    return toursList.find((t) => t.id === tid)?.name ?? tid?.slice(0, 8) ?? "—";
  }
  function employeeName(uid) {
    const u = usersList.find((u) => u.id === uid);
    return u ? `${u.first_name} ${u.last_name ?? ""}`.trim() : uid?.slice(0, 8) ?? "—";
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
        <div className="flex min-h-[calc(100vh-2rem)] overflow-hidden rounded-[32px] border border-white/70 bg-white/75 shadow-panel backdrop-blur sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)]">
          <Aside />

          <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 lg:px-8">
            <header className="flex items-center gap-4 border-b border-slate-200/80 px-6 py-6 lg:px-10">
              <button
                type="button"
                onClick={() => navigate("/sales")}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                title="Назад к продажам"
              >
                <BackIcon />
              </button>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                {loading ? "Загрузка..." : `Продажа от ${formatDate(sale?.sale_date)}`}
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

              {sale && !loading && (
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* ── Left: main info ── */}
                  <div className="flex flex-col gap-6 lg:col-span-2">
                    {/* Participants */}
                    <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm shadow-slate-200/60">
                      <div className="mb-4 text-base font-extrabold tracking-tight text-slate-950">
                        Участники
                      </div>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <InfoRow label="Клиент" value={clientName(sale.client_id)} />
                        <InfoRow label="Путёвка" value={tourName(sale.tour_id)} />
                        <InfoRow label="Сотрудник" value={employeeName(sale.employee_id)} />
                        <InfoRow label="Дата продажи" value={formatDate(sale.sale_date)} />
                      </div>
                    </section>

                    {/* Financials */}
                    <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm shadow-slate-200/60">
                      <div className="mb-4 text-base font-extrabold tracking-tight text-slate-950">
                        Финансы
                      </div>
                      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        <InfoRow label="Количество мест" value={sale.quantity} />
                        <InfoRow label="Стоимость без скидки" value={formatMoney(sale.original_price)} />
                        <InfoRow
                          label="Скидка"
                          value={
                            Number(sale.discount_amount) > 0
                              ? `−${formatMoney(sale.discount_amount)} (${Number(sale.discount_pct)}%)`
                              : "—"
                          }
                        />
                        <InfoRow label="Итоговая сумма" value={formatMoney(sale.final_price)} />
                      </div>
                    </section>
                  </div>

                  {/* ── Right: status + meta ── */}
                  <div className="flex flex-col gap-6">
                    <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm shadow-slate-200/60">
                      <div className="mb-4 text-base font-extrabold tracking-tight text-slate-950">
                        Статус
                      </div>
                      <span className={`inline-flex rounded-full px-4 py-1.5 text-sm font-bold ${STATUS_CLASSES[sale.status] ?? "bg-slate-100 text-slate-500"}`}>
                        {STATUS_LABELS[sale.status] ?? sale.status}
                      </span>
                    </section>

                    <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm shadow-slate-200/60">
                      <div className="mb-4 text-base font-extrabold tracking-tight text-slate-950">
                        Метаданные
                      </div>
                      <div className="flex flex-col gap-4">
                        <InfoRow label="Создана" value={formatDateTime(sale.created_at)} />
                        <InfoRow label="Обновлена" value={formatDateTime(sale.updated_at)} />
                        <InfoRow label="ID" value={<span className="font-mono text-xs text-slate-500">{sale.id}</span>} />
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
