import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import Aside from "../features/components/Aside";
import {
  cancelSale,
  clearCancelSaleState,
  clearCreateSaleState,
  createSale,
  fetchSales,
  fetchSalesLookups,
  setSalesFilter,
  setSalesPage,
} from "../features/sales/salesSlice";
import { getAvatarColor, getInitials } from "../shared/lib/avatar";
import { formatDate, formatMoney } from "../shared/lib/format";
import { PlusIcon } from "../shared/ui/Icons";
import { Pagination } from "../shared/ui/Pagination";

const STATUS_TABS = [
  { id: "", label: "Все" },
  { id: "confirmed", label: "Подтверждены" },
  { id: "cancelled", label: "Отменены" },
];

const STATUS_LABELS = { confirmed: "Подтверждена", cancelled: "Отменена" };
const STATUS_CLASSES = {
  confirmed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-600",
};

function sumField(sales, field) {
  return sales.reduce((acc, s) => acc + Number(s[field] ?? 0), 0);
}

// ─── Cancel dialog ────────────────────────────────────────────────────────────

function CancelDialog({
  open,
  sale,
  clientName,
  tourName,
  status,
  error,
  onConfirm,
  onClose,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ className: "!rounded-[28px] !bg-white !shadow-2xl" }}
    >
      <DialogTitle className="!px-6 !pt-6 !text-xl !font-extrabold !tracking-tight !text-slate-950">
        Отменить продажу?
      </DialogTitle>
      <DialogContent className="!px-6 !pb-6 !pt-2">
        <div className="space-y-4">
          {error && <Alert severity="error">{error}</Alert>}
          {sale && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 space-y-1">
              <div>
                <span className="font-semibold">Клиент:</span> {clientName}
              </div>
              <div>
                <span className="font-semibold">Путёвка:</span> {tourName}
              </div>
              <div>
                <span className="font-semibold">Итого:</span>{" "}
                {formatMoney(sale.final_price)}
              </div>
            </div>
          )}
          <p className="text-sm font-medium text-slate-600">
            Действие необратимо. Продажа будет переведена в статус «Отменена».
          </p>
          <div className="flex gap-3 sm:justify-end">
            <Button
              variant="outlined"
              onClick={onClose}
              disabled={status === "loading"}
              className="!rounded-2xl !border-slate-200 !px-5 !py-2.5 !text-sm !font-bold !normal-case !text-slate-700"
            >
              Назад
            </Button>
            <Button
              variant="contained"
              onClick={onConfirm}
              disabled={status === "loading"}
              className="!rounded-2xl !bg-rose-500 !px-5 !py-2.5 !text-sm !font-bold !normal-case !shadow-none hover:!bg-rose-600"
            >
              {status === "loading" ? "Отменяем..." : "Отменить продажу"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create dialog ────────────────────────────────────────────────────────────

const todayIso = () => new Date().toISOString().split("T")[0];

const initialCreateForm = {
  client_id: "",
  tour_id: "",
  quantity: 1,
  sale_date: todayIso(),
  original_price: "",
};

function CreateDialog({
  open,
  onClose,
  clientsList,
  toursList,
  lookupsStatus,
  lookupsError,
  status,
  error,
  onSubmit,
}) {
  const [form, setForm] = useState(initialCreateForm);
  const [touched, setTouched] = useState({});

  const errors = useMemo(() => {
    const e = {};
    if (!form.client_id) e.client_id = "Выберите клиента";
    if (!form.tour_id) e.tour_id = "Выберите путёвку";
    if (!form.quantity || form.quantity < 1 || form.quantity > 50)
      e.quantity = "От 1 до 50";
    if (!form.sale_date) e.sale_date = "Укажите дату";
    if (!form.original_price || Number(form.original_price) <= 0)
      e.original_price = "Укажите сумму";
    return e;
  }, [form]);

  function change(key, value) {
    setForm((p) => {
      const next = { ...p, [key]: value };
      if (key === "tour_id" || key === "quantity") {
        const tour = toursList.find((t) => t.id === next.tour_id);
        if (tour && Number(next.quantity) >= 1) {
          next.original_price = (
            Number(tour.price) * Number(next.quantity)
          ).toFixed(2);
        }
      }
      return next;
    });
  }

  function blur(key) {
    setTouched((p) => ({ ...p, [key]: true }));
  }

  function handleSubmit() {
    setTouched({
      client_id: true,
      tour_id: true,
      quantity: true,
      sale_date: true,
      original_price: true,
    });
    if (Object.keys(errors).length > 0) return;
    onSubmit({
      client_id: form.client_id,
      tour_id: form.tour_id,
      quantity: Number(form.quantity),
      sale_date: form.sale_date,
      original_price: form.original_price,
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ className: "!rounded-[32px] !bg-white/95 !shadow-2xl" }}
    >
      <DialogTitle className="!px-6 !pt-6 !text-2xl !font-extrabold !tracking-tight !text-slate-950">
        Новая продажа
      </DialogTitle>
      <DialogContent className="!px-6 !pb-7 !pt-4">
        <div className="flex flex-col gap-6">
          {error && <Alert severity="error">{error}</Alert>}
          {lookupsStatus === "loading" && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CircularProgress size={16} />
              Загружаем клиентов и путёвки...
            </div>
          )}
          {lookupsStatus === "failed" && (
            <Alert severity="warning">
              {lookupsError ?? "Не удалось загрузить справочники."} Списки могут
              быть неполными.
            </Alert>
          )}

          <FormControl
            fullWidth
            error={Boolean(touched.client_id && errors.client_id)}
          >
            <InputLabel>Клиент</InputLabel>
            <Select
              value={form.client_id}
              label="Клиент"
              onChange={(e) => change("client_id", e.target.value)}
              onBlur={() => blur("client_id")}
            >
              {clientsList.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.full_name}
                </MenuItem>
              ))}
            </Select>
            {touched.client_id && errors.client_id && (
              <p className="mx-3 mt-1 text-xs text-red-500">
                {errors.client_id}
              </p>
            )}
          </FormControl>

          <FormControl
            fullWidth
            error={Boolean(touched.tour_id && errors.tour_id)}
          >
            <InputLabel>Путёвка</InputLabel>
            <Select
              value={form.tour_id}
              label="Путёвка"
              onChange={(e) => change("tour_id", e.target.value)}
              onBlur={() => blur("tour_id")}
            >
              {toursList.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name} — {formatDate(t.start_date)} ({formatMoney(t.price)}
                  /чел.)
                </MenuItem>
              ))}
            </Select>
            {touched.tour_id && errors.tour_id && (
              <p className="mx-3 mt-1 text-xs text-red-500">{errors.tour_id}</p>
            )}
          </FormControl>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              fullWidth
              label="Количество мест"
              type="number"
              value={form.quantity}
              onChange={(e) => change("quantity", e.target.value)}
              onBlur={() => blur("quantity")}
              slotProps={{ htmlInput: { min: 1, max: 50 } }}
              error={Boolean(touched.quantity && errors.quantity)}
              helperText={
                touched.quantity && errors.quantity
                  ? errors.quantity
                  : "От 1 до 50"
              }
            />
            <TextField
              fullWidth
              label="Дата продажи"
              type="date"
              value={form.sale_date}
              onChange={(e) => change("sale_date", e.target.value)}
              onBlur={() => blur("sale_date")}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: todayIso() } }}
              error={Boolean(touched.sale_date && errors.sale_date)}
              helperText={
                touched.sale_date && errors.sale_date ? errors.sale_date : " "
              }
            />
          </div>

          <TextField
            fullWidth
            label="Сумма без скидки, ₽"
            type="number"
            value={form.original_price}
            onChange={(e) => change("original_price", e.target.value)}
            onBlur={() => blur("original_price")}
            error={Boolean(touched.original_price && errors.original_price)}
            helperText={
              touched.original_price && errors.original_price
                ? errors.original_price
                : "Рассчитывается автоматически: цена тура × количество мест"
            }
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outlined"
              onClick={onClose}
              disabled={status === "loading"}
              className="!rounded-2xl !border-slate-200 !px-6 !py-3 !text-sm !font-bold !normal-case !text-slate-700"
            >
              Отмена
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={status === "loading"}
              className="!rounded-2xl !bg-brand-500 !px-6 !py-3 !text-sm !font-bold !normal-case !shadow-none hover:!bg-brand-600"
            >
              {status === "loading" ? "Создаём..." : "Создать"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SalesPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentUser = useSelector((s) => s.auth.currentUser);
  const {
    sales,
    total,
    page,
    pages,
    listStatus,
    listError,
    filters,
    clientsList,
    toursList,
    usersList,
    lookupsStatus,
    lookupsError,
    createStatus,
    createError,
    cancelStatus,
    cancelError,
  } = useSelector((s) => s.sales);

  const isStaff =
    currentUser?.role === "employee" || currentUser?.role === "admin";

  const [localDateFrom, setLocalDateFrom] = useState(filters.dateFrom);
  const [localDateTo, setLocalDateTo] = useState(filters.dateTo);

  const [createOpen, setCreateOpen] = useState(false);
  const [createKey, setCreateKey] = useState(0);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancellingSale, setCancellingSale] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (lookupsStatus === "idle") dispatch(fetchSalesLookups());
  }, [dispatch, lookupsStatus]);

  useEffect(() => {
    if (searchParams.get("open") === "create" && lookupsStatus === "succeeded") {
      setCreateOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, lookupsStatus, setSearchParams]);

  useEffect(() => {
    dispatch(fetchSales());
  }, [dispatch, page, filters]);

  function clientName(id) {
    return clientsList.find((c) => c.id === id)?.full_name ?? "—";
  }
  function tourName(id) {
    return toursList.find((t) => t.id === id)?.name ?? "—";
  }
  function employeeName(id) {
    const u = usersList.find((u) => u.id === id);
    return u ? `${u.first_name} ${u.last_name ?? ""}`.trim() : "—";
  }

  function applyDateFilter() {
    dispatch(setSalesFilter({ key: "dateFrom", value: localDateFrom }));
    dispatch(setSalesFilter({ key: "dateTo", value: localDateTo }));
  }

  function setStatus(value) {
    dispatch(setSalesFilter({ key: "status", value }));
  }

  function handlePageChange(p) {
    if (p < 1 || p > pages || p === page) return;
    dispatch(setSalesPage(p));
  }

  // Create
  function openCreate() {
    dispatch(clearCreateSaleState());
    setCreateKey((k) => k + 1);
    setCreateOpen(true);
  }
  function closeCreate() {
    if (createStatus === "loading") return;
    dispatch(clearCreateSaleState());
    setCreateOpen(false);
  }
  async function handleCreate(payload) {
    const result = await dispatch(createSale(payload));
    if (createSale.fulfilled.match(result)) closeCreate();
  }

  // Cancel
  function openCancel(sale) {
    dispatch(clearCancelSaleState());
    setCancellingSale(sale);
    setCancelOpen(true);
  }
  function closeCancel() {
    if (cancelStatus === "loading") return;
    dispatch(clearCancelSaleState());
    setCancelOpen(false);
  }
  async function handleCancel() {
    if (!cancellingSale) return;
    const result = await dispatch(cancelSale(cancellingSale.id));
    if (cancelSale.fulfilled.match(result)) closeCancel();
  }

  // Summary totals for current page
  const summaryQty = sales.reduce((a, s) => a + s.quantity, 0);
  const summaryOriginal = sumField(sales, "original_price");
  const summaryDiscount = sumField(sales, "discount_amount");
  const summaryFinal = sumField(sales, "final_price");

  return (
    <div className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
        <div className="flex min-h-[calc(100vh-2rem)] overflow-hidden rounded-[32px] border border-white/70 bg-white/75 shadow-panel backdrop-blur sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)]">
          <Aside />

          <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 lg:px-8">
            {/* Header */}
            <header className="flex flex-col gap-4 border-b border-slate-200/80 px-6 py-6 xl:flex-row xl:items-center xl:justify-between lg:px-10">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
                Журнал продаж
              </h1>
              {isStaff && (
                <Button
                  variant="contained"
                  onClick={openCreate}
                  className="!min-w-[200px] shrink-0 !rounded-2xl !bg-brand-500 !px-5 !py-3 !text-sm !font-bold !normal-case !shadow-none hover:!bg-brand-600"
                >
                  <span className="mr-2 inline-flex">
                    <PlusIcon />
                  </span>
                  Новая продажа
                </Button>
              )}
            </header>

            <div className="space-y-6 px-6 py-7 lg:px-10 lg:py-8">
              {/* Filters */}
              <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-sm shadow-slate-200/60">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="flex items-center gap-3">
                      <span className="shrink-0 text-sm font-bold text-slate-500">
                        Период:
                      </span>
                      <input
                        type="date"
                        value={localDateFrom}
                        onChange={(e) => setLocalDateFrom(e.target.value)}
                        className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-400"
                      />
                      <span className="text-slate-400 font-bold">—</span>
                      <input
                        type="date"
                        value={localDateTo}
                        onChange={(e) => setLocalDateTo(e.target.value)}
                        className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-400"
                      />
                      <Button
                        variant="outlined"
                        onClick={applyDateFilter}
                        className="!h-10 !rounded-xl !border-slate-200 !px-4 !text-sm !font-bold !normal-case !text-slate-700"
                      >
                        Применить
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setStatus(tab.id)}
                        className={`rounded-2xl border px-4 py-2 text-sm font-bold transition ${
                          filters.status === tab.id
                            ? "border-brand-200 bg-brand-50 text-brand-600"
                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* Table */}
              <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                  <div className="text-2xl font-extrabold tracking-tight">
                    Продажи
                  </div>
                  <div className="text-sm font-bold text-slate-500">
                    {listStatus === "loading" ? (
                      <span className="inline-flex items-center gap-2">
                        <CircularProgress size={14} />
                        Загружаем...
                      </span>
                    ) : (
                      `${total} запис${total === 1 ? "ь" : total >= 2 && total <= 4 ? "и" : "ей"}`
                    )}
                  </div>
                </div>

                {listError && (
                  <div className="px-6 py-4">
                    <Alert severity="error">{listError}</Alert>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] border-collapse">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs uppercase tracking-[0.1em] text-slate-400">
                        <th className="px-6 py-4">Дата</th>
                        <th className="px-6 py-4">Сотрудник</th>
                        <th className="px-6 py-4">Клиент</th>
                        <th className="px-6 py-4">Путёвка</th>
                        <th className="px-6 py-4 text-center">Мест</th>
                        <th className="px-6 py-4 text-right">Цена</th>
                        <th className="px-6 py-4 text-right">Скидка</th>
                        <th className="px-6 py-4 text-right">Итого</th>
                        <th className="px-6 py-4">Статус</th>
                        {isStaff && <th className="px-4 py-4"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {sales.map((sale) => {
                        const empName = employeeName(sale.employee_id);
                        return (
                          <tr
                            key={sale.id}
                            className="border-t border-slate-100 align-middle"
                          >
                            <td className="px-6 py-4 text-sm font-bold text-slate-800">
                              <button
                                type="button"
                                onClick={() => navigate(`/sales/${sale.id}`)}
                                className="hover:text-brand-600 hover:underline transition-colors"
                              >
                                {formatDate(sale.sale_date)}
                              </button>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${getAvatarColor(sale.employee_id)}`}
                                >
                                  {getInitials(empName)}
                                </div>
                                <span className="text-sm font-semibold text-slate-800">
                                  {empName}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                              {clientName(sale.client_id)}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                              {tourName(sale.tour_id)}
                            </td>
                            <td className="px-6 py-4 text-center text-sm font-black text-slate-800">
                              {sale.quantity}
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-semibold text-slate-700">
                              {formatMoney(sale.original_price)}
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-black text-rose-500">
                              {Number(sale.discount_amount) > 0
                                ? `−${formatMoney(sale.discount_amount)}`
                                : "—"}
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-black text-slate-950">
                              {formatMoney(sale.final_price)}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${STATUS_CLASSES[sale.status]}`}
                              >
                                {STATUS_LABELS[sale.status]}
                              </span>
                            </td>
                            {isStaff && (
                              <td className="px-4 py-4">
                                {sale.status === "confirmed" && (
                                  <button
                                    type="button"
                                    onClick={() => openCancel(sale)}
                                    className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                                    title="Отменить продажу"
                                  >
                                    <svg
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      className="h-4 w-4"
                                      aria-hidden="true"
                                    >
                                      <circle
                                        cx="12"
                                        cy="12"
                                        r="9"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                      />
                                      <path
                                        d="M15 9l-6 6M9 9l6 6"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                      />
                                    </svg>
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}

                      {/* Summary row */}
                      {sales.length > 0 && (
                        <tr className="border-t-2 border-slate-200 bg-slate-50/80">
                          <td
                            colSpan={isStaff ? 4 : 4}
                            className="px-6 py-4 text-sm font-extrabold text-slate-950"
                          >
                            Итого на странице:
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-black text-slate-950">
                            {summaryQty}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-black text-slate-950">
                            {formatMoney(summaryOriginal)}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-black text-rose-500">
                            {summaryDiscount > 0
                              ? `−${formatMoney(summaryDiscount)}`
                              : "—"}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-black text-slate-950">
                            {formatMoney(summaryFinal)}
                          </td>
                          <td colSpan={isStaff ? 2 : 1} />
                        </tr>
                      )}

                      {sales.length === 0 && listStatus !== "loading" && (
                        <tr>
                          <td
                            colSpan={isStaff ? 10 : 9}
                            className="px-6 py-10 text-center text-sm font-semibold text-slate-500"
                          >
                            Продажи не найдены. Попробуйте изменить фильтры.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
                  <div className="text-sm font-medium text-slate-500">
                    {listStatus !== "loading" && total > 0
                      ? `Показано ${sales.length} из ${total}`
                      : ""}
                  </div>
                  <Pagination
                    page={page}
                    pages={pages}
                    onPageChange={handlePageChange}
                  />
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>

      <CreateDialog
        key={createKey}
        open={createOpen}
        onClose={closeCreate}
        clientsList={clientsList}
        toursList={toursList}
        lookupsStatus={lookupsStatus}
        lookupsError={lookupsError}
        status={createStatus}
        error={createError}
        onSubmit={handleCreate}
      />

      <CancelDialog
        open={cancelOpen}
        sale={cancellingSale}
        clientName={cancellingSale ? clientName(cancellingSale.client_id) : ""}
        tourName={cancellingSale ? tourName(cancellingSale.tour_id) : ""}
        status={cancelStatus}
        error={cancelError}
        onConfirm={handleCancel}
        onClose={closeCancel}
      />
    </div>
  );
}
