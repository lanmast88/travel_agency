import { Button } from "@mui/material";
import { useSelector } from "react-redux";
import Aside from "../features/components/Aside";

export function SalesPage() {
  const sales = useSelector((state) => state.sales);

  return (
    <div className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
        <div className="flex min-h-[calc(100vh-2rem)] overflow-hidden rounded-[32px] border border-white/70 bg-white/75 shadow-panel backdrop-blur sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)]">
          <Aside />

          <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 lg:px-8">
            <header className="flex flex-col gap-4 border-b border-slate-200/80 px-6 py-6 lg:px-10">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
                Журнал продаж
              </h1>
            </header>

            <div className="space-y-6 px-6 py-7 lg:px-10 lg:py-8">
              <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm shadow-slate-200/60">
                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(360px,1.2fr)_minmax(300px,1fr)_minmax(280px,1fr)_170px]">
                  <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                    <span className="shrink-0 whitespace-nowrap text-sm font-bold text-slate-500">
                      Период:
                    </span>
                    <label className="flex h-12 min-w-0 items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4">
                      <span className="text-base font-semibold text-slate-700">
                        {sales.filters.dateFrom}
                      </span>
                    </label>
                    <span className="text-center text-lg font-bold leading-none text-slate-400">
                      —
                    </span>
                    <label className="flex h-12 min-w-0 items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4">
                      <span className="text-base font-semibold text-slate-700">
                        {sales.filters.dateTo}
                      </span>
                    </label>
                  </div>

                  <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                    <span className="text-sm font-bold text-slate-500">
                      Сотрудник:
                    </span>
                    <select className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-700 outline-none">
                      <option>{sales.filters.employee}</option>
                    </select>
                  </div>

                  <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                    <span className="text-sm font-bold text-slate-500">
                      Статус:
                    </span>
                    <select className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-700 outline-none">
                      <option>{sales.filters.status}</option>
                    </select>
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
                <div className="border-b border-slate-200 px-6 py-5">
                  <div className="text-2xl font-extrabold tracking-tight">
                    {sales.title}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-[1200px] border-collapse">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-sm uppercase tracking-[0.12em] text-slate-400">
                        <th className="px-6 py-4">Дата</th>
                        <th className="px-6 py-4">Сотрудник</th>
                        <th className="px-6 py-4">Клиент</th>
                        <th className="px-6 py-4">Путёвка</th>
                        <th className="px-6 py-4 text-center">Кол-во</th>
                        <th className="px-6 py-4 text-right">
                          Цена без скидки
                        </th>
                        <th className="px-6 py-4 text-right">Скидка</th>
                        <th className="px-6 py-4 text-right">Итого</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.sales.map((item) => (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="px-6 py-5 text-xl font-bold text-slate-800">
                            {item.date}
                          </td>
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
                          <td className="px-6 py-5 text-xl font-bold text-slate-800">
                            {item.client}
                          </td>
                          <td className="px-6 py-5 text-xl font-bold text-slate-800">
                            {item.trip}
                          </td>
                          <td className="px-6 py-5 text-center text-xl font-black text-slate-800">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-5 text-right text-xl font-black text-slate-800">
                            {item.basePrice}
                          </td>
                          <td className="px-6 py-5 text-right text-xl font-black text-rose-500">
                            {item.discount}
                          </td>
                          <td className="px-6 py-5 text-right text-xl font-black text-slate-950">
                            {item.total}
                          </td>
                        </tr>
                      ))}

                      <tr className="border-t border-slate-200 bg-slate-50/80">
                        <td
                          className="px-6 py-5 text-2xl font-extrabold text-slate-950"
                          colSpan="4"
                        >
                          Итого за период:
                        </td>
                        <td className="px-6 py-5 text-center text-2xl font-black text-slate-950">
                          {sales.summary.quantity}
                        </td>
                        <td className="px-6 py-5 text-right text-2xl font-black text-slate-950">
                          {sales.summary.basePrice}
                        </td>
                        <td className="px-6 py-5 text-right text-2xl font-black text-rose-500">
                          {sales.summary.discount}
                        </td>
                        <td className="px-6 py-5 text-right text-2xl font-black text-slate-950">
                          {sales.summary.total}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-slate-200 px-6 py-5 text-lg font-semibold text-slate-500">
                  {sales.resultLabel}
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
