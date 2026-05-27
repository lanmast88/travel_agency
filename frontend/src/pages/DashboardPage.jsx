import { Button, Chip, CircularProgress } from "@mui/material";
import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchDashboardData } from "../features/dashboard/dashboardSlice";
import {
  AnalyticsIcon,
  ClientsIcon,
  LossIcon,
  RevenueIcon,
  SoldIcon,
} from "../shared/ui/Icons";
import { formatMoneyCompact } from "../shared/lib/formatMoneyCompact";
import Aside from "../features/components/Aside";

const STATUS_TONE = {
  Подтверждена: { bg: "#dcfae6", color: "#159947" },
  Отменена: { bg: "#ffe1e1", color: "#d92d20" },
};

const statIcons = {
  sold: SoldIcon,
  clients: ClientsIcon,
  revenue: RevenueIcon,
  loss: LossIcon,
};

function DashboardContent() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    status,
    salesTotal,
    clientsTotal,
    revenue,
    discountLoss,
    recentSales,
    popularTrips,
  } = useSelector((state) => state.dashboard);

  useEffect(() => {
    if (status === "idle") dispatch(fetchDashboardData());
  }, [dispatch, status]);

  const formattedDate = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const stats = useMemo(
    () => [
      {
        id: "sales",
        label: "Путёвок продано",
        value: String(salesTotal),
        tone: "border-t-brand-500",
        iconKey: "sold",
      },
      {
        id: "clients",
        label: "Клиентов",
        value: String(clientsTotal),
        tone: "border-t-emerald-500",
        iconKey: "clients",
      },
      {
        id: "revenue",
        label: "Выручка",
        value: `${Math.round(revenue).toLocaleString("ru-RU")} ₽`,
        tone: "border-t-violet-500",
        iconKey: "revenue",
      },
      {
        id: "discount-loss",
        label: "Потери на скидках",
        value: `${Math.round(discountLoss).toLocaleString("ru-RU")} ₽`,
        tone: "border-t-rose-500",
        iconKey: "loss",
      },
    ],
    [salesTotal, clientsTotal, revenue, discountLoss],
  );

  return (
    <div className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
        <div className="flex min-h-[calc(100vh-2rem)] overflow-hidden rounded-[32px] border border-white/70 bg-white/75 shadow-panel backdrop-blur sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)]">
          <Aside />

          <main className="flex-1 px-4 py-4 sm:px-6 lg:px-8">
            <header className="flex flex-col gap-5 border-b border-slate-200/80 px-6 py-6 lg:flex-row lg:items-center lg:justify-between lg:px-10">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
                  Дашборд
                </h1>
                <p className="mt-1 text-sm font-medium capitalize text-slate-500">
                  {formattedDate}
                </p>
              </div>

              <span className="flex !rounded-2xl !border-slate-200 !px-5 !py-2.5 !text-sm !font-bold !normal-case !text-slate-700 gap-2 hover:!bg-slate-100 lg:justiy-between border border-solid items-center">
                <AnalyticsIcon size={25} className="shrink-0" />
                Аналитика
              </span>
            </header>

            {status === "loading" && (
              <div className="flex justify-center py-24">
                <CircularProgress />
              </div>
            )}

            {status !== "loading" && (
              <div className="space-y-7 px-6 py-7 lg:px-10 lg:py-8">
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {stats.map((stat) => {
                    const StatIcon = statIcons[stat.iconKey];
                    return (
                      <article
                        key={stat.id}
                        className={`rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 ${stat.tone} border-t-4`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400 whitespace-nowrap">
                              {stat.label}
                            </div>
                            <div className="mt-3 text-5xl font-black tracking-tight text-slate-950 whitespace-nowrap">
                              {formatMoneyCompact(stat.value)}
                            </div>
                          </div>
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                            <StatIcon size={22} />
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </section>

                <section className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    variant="contained"
                    className="!rounded-2xl !bg-brand-500 !px-6 !py-3 !text-sm !font-bold !normal-case !shadow-none hover:!bg-brand-600"
                    onClick={() => navigate("/sales?open=create")}
                  >
                    + Новая продажа
                  </Button>
                  <Button
                    variant="outlined"
                    className="!rounded-2xl !border-slate-200 !px-6 !py-3 !text-sm !font-bold !normal-case !text-slate-800"
                    onClick={() => navigate("/travels?open=create")}
                  >
                    + Добавить путёвку
                  </Button>
                </section>

                <section className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
                  <article className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                      <div className="text-2xl font-extrabold tracking-tight">
                        Последние продажи
                      </div>
                    </div>

                    {recentSales.length === 0 ? (
                      <div className="px-6 py-10 text-center text-sm font-medium text-slate-400">
                        Продаж пока нет
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                          <thead className="bg-slate-50">
                            <tr className="text-left text-sm uppercase tracking-[0.14em] text-slate-400">
                              <th className="px-6 py-4">Сотрудник</th>
                              <th className="px-6 py-4">Путёвка</th>
                              <th className="px-6 py-4">Дата</th>
                              <th className="px-6 py-4">Статус</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentSales.map((sale) => {
                              const tone = STATUS_TONE[sale.status] ?? {
                                bg: "#f1f5f9",
                                color: "#475569",
                              };
                              return (
                                <tr
                                  key={sale.id}
                                  className="border-t border-slate-100"
                                >
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-black text-white ${sale.color}`}
                                      >
                                        {sale.initials}
                                      </div>
                                      <div className="text-base font-bold text-slate-800">
                                        {sale.employee}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-base font-semibold text-slate-600">
                                    {sale.destination}
                                  </td>
                                  <td className="px-6 py-4 text-base font-semibold text-slate-500">
                                    {sale.date}
                                  </td>
                                  <td className="px-6 py-4">
                                    <Chip
                                      label={sale.status}
                                      sx={{
                                        backgroundColor: tone.bg,
                                        color: tone.color,
                                        fontWeight: 800,
                                        borderRadius: "999px",
                                      }}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </article>

                  <article className="rounded-[30px] border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                      <div className="text-2xl font-extrabold tracking-tight">
                        Горящие путёвки
                      </div>
                    </div>

                    <div className="space-y-6 px-6 py-6">
                      {popularTrips.length === 0 ? (
                        <div className="py-4 text-center text-sm font-medium text-slate-400">
                          Горящих путёвок нет
                        </div>
                      ) : (
                        popularTrips.map((trip) => (
                          <div
                            key={trip.id}
                            className="flex items-start justify-between gap-4"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${trip.color}`}
                                />
                                <div className="truncate text-base font-extrabold leading-tight text-slate-900">
                                  {trip.title}
                                </div>
                              </div>
                              <div className="mt-1 text-sm font-semibold text-slate-500">
                                {trip.location} · {trip.nights} ночей
                              </div>
                            </div>
                            <div className="shrink-0 text-lg font-black text-brand-600">
                              {formatMoneyCompact(
                                `₽${Math.round(trip.price).toLocaleString("ru-RU")}`,
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </article>
                </section>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  return <DashboardContent />;
}
