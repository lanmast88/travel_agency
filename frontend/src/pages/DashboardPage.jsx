import { Button, Chip } from "@mui/material";
import { useSelector } from "react-redux";
import {
  AnalyticsIcon,
  ClientsIcon,
  DashboardIcon,
  ReportsIcon,
  SalesIcon,
  TravelIcon,
} from "../shared/ui/Icons";

const navigationItems = [
  { label: "Дашборд", active: true, icon: DashboardIcon },
  { label: "Путёвки", active: false, icon: TravelIcon },
  { label: "Клиенты", active: false, icon: ClientsIcon },
  { label: "Продажи", active: false, badge: "10", icon: SalesIcon },
  { label: "Отчёты", active: false, icon: ReportsIcon },
];

const statusToneMap = {
  Оформлена: {
    bg: "#dcfae6",
    color: "#159947",
  },
  "В обработке": {
    bg: "#fff4c6",
    color: "#9a6700",
  },
  Отправлен: {
    bg: "#dbe8ff",
    color: "#1659b2",
  },
  Отменена: {
    bg: "#ffe1e1",
    color: "#d92d20",
  },
};

function DashboardContent() {
  const dashboard = useSelector((state) => state.dashboard);
  const formattedDate = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date("2026-04-10"));

  return (
    <div className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
        <div className="flex min-h-[calc(100vh-2rem)] overflow-hidden rounded-[32px] border border-white/70 bg-white/75 shadow-panel backdrop-blur sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)]">
          <aside className="hidden w-[280px] shrink-0 border-r border-slate-200/80 bg-white/80 px-6 py-7 xl:flex xl:flex-col">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-6">
              <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-50 ring-1 ring-brand-100">
                <img
                  src="/logo.png"
                  alt="StackTravel Logo"
                  className="h-50 w-50 object-contain"
                />
              </div>
              <div>
                <div className="text-xl font-extrabold tracking-tight">
                  StackTravel
                </div>
                <div className="text-sm text-slate-500">
                  Внутренняя турсистема
                </div>
              </div>
            </div>

            <nav className="mt-8 space-y-2">
              <div className="px-3 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
                Главное
              </div>
              {navigationItems.map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition  ${
                    item.active
                      ? "bg-brand-50 text-brand-600"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <item.icon size={18} className="shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {item.badge ? (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-600">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
              ))}
            </nav>

            <div className="mt-auto rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
                  Т
                </div>
                <div>
                  <div className="font-bold">Тест</div>
                  <div className="text-sm text-slate-500">Менеджер</div>
                </div>
              </div>
            </div>
          </aside>

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

            <div className="space-y-7 px-6 py-7 lg:px-10 lg:py-8">
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {dashboard.stats.map((stat) => {
                  const StatIcon = stat.icon;

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
                          <div className="mt-3 text-5xl font-black tracking-tight text-slate-950">
                            {stat.value}
                          </div>
                          <div className="mt-3 text-sm font-bold text-emerald-500">
                            {stat.trend}
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
                >
                  + Новая продажа
                </Button>
                <Button
                  variant="outlined"
                  className="!rounded-2xl !border-slate-200 !px-6 !py-3 !text-sm !font-bold !normal-case !text-slate-800"
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
                    <div className="text-sm font-bold text-brand-500">
                      Все продажи →
                    </div>
                  </div>

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
                        {dashboard.recentSales.map((sale) => (
                          <tr
                            key={`${sale.employee}-${sale.date}-${sale.destination}`}
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
                                  backgroundColor:
                                    statusToneMap[sale.status].bg,
                                  color: statusToneMap[sale.status].color,
                                  fontWeight: 800,
                                  borderRadius: "999px",
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>

                <article className="rounded-[30px] border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
                  <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                    <div className="text-2xl font-extrabold tracking-tight">
                      Популярные путёвки
                    </div>
                    <div className="text-sm font-bold text-brand-500">
                      Все →
                    </div>
                  </div>

                  <div className="space-y-6 px-6 py-6">
                    {dashboard.popularTrips.map((trip) => (
                      <div key={trip.title} className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-xl font-extrabold leading-tight text-slate-900">
                              {trip.title}
                            </div>
                            <div className="mt-1 text-sm font-semibold text-slate-500">
                              {trip.location} · {trip.nights} ночей
                            </div>
                          </div>
                          <div className="text-lg font-black text-brand-600">
                            {trip.price}
                          </div>
                        </div>

                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${trip.color}`}
                            style={{ width: `${trip.sold}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-sm font-bold text-slate-500">
                          <span>Продано {trip.sold}%</span>
                          <span>
                            {trip.current} из {trip.total}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  return <DashboardContent />;
}
