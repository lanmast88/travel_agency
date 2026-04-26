import { Button } from "@mui/material";
import { useSelector } from "react-redux";
import Aside from "../features/components/Aside";
import { formatMoneyCompact } from "../shared/lib/formatMoneyCompact";

export function ReportsPage() {
  const reports = useSelector((state) => state.reports);

  return (
    <div className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
        <div className="flex min-h-[calc(100vh-2rem)] overflow-hidden rounded-[32px] border border-white/70 bg-white/75 shadow-panel backdrop-blur sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)]">
          <Aside />

          <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 lg:px-8">
            <header className="flex flex-col gap-4 border-b border-slate-200/80 px-6 py-6 lg:px-10">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
                Отчёты
              </h1>
            </header>

            <div className="space-y-6 px-6 py-7 lg:px-10 lg:py-8">
              <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm shadow-slate-200/60">
                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(360px,1.2fr)_minmax(220px,1fr)_minmax(220px,1fr)_minmax(220px,1fr)_170px]">
                  <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                    <span className="shrink-0 whitespace-nowrap text-sm font-bold text-slate-500">
                      Период:
                    </span>
                    <label className="flex h-12 min-w-0 items-center rounded-2xl border border-slate-200 bg-slate-50 px-4">
                      <span className="text-base font-semibold text-slate-700">
                        {reports.filters.dateFrom}
                      </span>
                    </label>
                    <span className="text-center text-lg font-bold leading-none text-slate-400">
                      —
                    </span>
                    <label className="flex h-12 min-w-0 items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4">
                      <span className="text-base font-semibold text-slate-700">
                        {reports.filters.dateTo}
                      </span>
                    </label>
                  </div>

                  <select className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-700 outline-none">
                    <option>{reports.filters.employee}</option>
                  </select>

                  <select className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-700 outline-none">
                    <option>{reports.filters.destination}</option>
                  </select>

                  <select className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-700 outline-none">
                    <option>{reports.filters.reportType}</option>
                  </select>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {reports.summary.map((item) => {
                  const StatIcon = item.icon;

                  return (
                    <article
                      key={item.id}
                      className={`rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 ${item.tone} border-t-4`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400 whitespace-nowrap">
                            {item.label}
                          </div>
                          <div className="mt-3 text-5xl font-black tracking-tight text-slate-950 whitespace-nowrap">
                            {formatMoneyCompact(item.value)}
                          </div>
                          <div className="mt-3 text-sm font-bold text-slate-500">
                            {item.trend}
                          </div>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                          <StatIcon size={24} />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>

              <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
                <article className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
                  <div className="border-b border-slate-200 px-6 py-5">
                    <div className="text-2xl font-extrabold tracking-tight">
                      {reports.employeeReportTitle}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-sm uppercase tracking-[0.12em] text-slate-400">
                          <th className="px-6 py-4">Сотрудник</th>
                          <th className="px-6 py-4 text-center">Продаж</th>
                          <th className="px-6 py-4 text-right">Выручка</th>
                          <th className="px-6 py-4 text-right">Средний чек</th>
                          <th className="px-6 py-4 text-right">Скидки</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.employeeReport.map((item) => (
                          <tr
                            key={item.id}
                            className="border-t border-slate-100"
                          >
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-black text-white ${item.avatarTone}`}
                                >
                                  {item.initials}
                                </div>
                                <div className="text-xl font-bold text-slate-800">
                                  {item.employee}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-center text-xl font-black text-slate-800">
                              {item.sales}
                            </td>
                            <td className="px-6 py-5 text-right text-xl font-black text-slate-800">
                              {item.revenue}
                            </td>
                            <td className="px-6 py-5 text-right text-xl font-black text-slate-800">
                              {item.average}
                            </td>
                            <td className="px-6 py-5 text-right text-xl font-black text-rose-500">
                              {item.discount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>

                <article className="rounded-[30px] border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
                  <div className="border-b border-slate-200 px-6 py-5">
                    <div className="text-2xl font-extrabold tracking-tight">
                      {reports.topEmployeesTitle}
                    </div>
                  </div>

                  <div className="space-y-6 px-6 py-6">
                    {reports.topEmployees.map((item) => (
                      <div key={item.id} className="space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="text-xl font-extrabold text-slate-900">
                            {item.name}
                          </div>
                          <div className="text-lg font-black text-brand-600">
                            {formatMoneyCompact(item.value)}
                          </div>
                        </div>

                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${item.color}`}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              </section>

              <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
                <article className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
                  <div className="border-b border-slate-200 px-6 py-5">
                    <div className="text-2xl font-extrabold tracking-tight">
                      {reports.destinationReportTitle}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-sm uppercase tracking-[0.12em] text-slate-400">
                          <th className="px-6 py-4">Направление</th>
                          <th className="px-6 py-4 text-center">Продано</th>
                          <th className="px-6 py-4 text-center">Клиентов</th>
                          <th className="px-6 py-4 text-right">Выручка</th>
                          <th className="px-6 py-4 text-right">Доля</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.destinationReport.map((item) => (
                          <tr
                            key={item.id}
                            className="border-t border-slate-100"
                          >
                            <td className="px-6 py-5">
                              <div className="space-y-3">
                                <div className="text-xl font-bold text-slate-800">
                                  {item.destination}
                                </div>
                                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    className={`h-full rounded-full ${item.progressTone}`}
                                    style={{ width: `${item.progress}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-center text-xl font-black text-slate-800">
                              {item.sold}
                            </td>
                            <td className="px-6 py-5 text-center text-xl font-black text-slate-800">
                              {item.clients}
                            </td>
                            <td className="px-6 py-5 text-right text-xl font-black text-slate-800">
                              {item.revenue}
                            </td>
                            <td className="px-6 py-5 text-right text-xl font-black text-brand-600">
                              {item.share}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>

                <article className="rounded-[30px] border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
                  <div className="border-b border-slate-200 px-6 py-5">
                    <div className="text-2xl font-extrabold tracking-tight">
                      {reports.topTripsTitle}
                    </div>
                  </div>

                  <div className="space-y-6 px-6 py-6">
                    {reports.topTrips.map((item) => (
                      <div key={item.id} className="space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="text-xl font-extrabold text-slate-900">
                            {item.name}
                          </div>
                          <div className="text-lg font-black text-brand-600">
                            {item.value}
                          </div>
                        </div>

                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${item.color}`}
                            style={{ width: `${item.progress}%` }}
                          />
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
