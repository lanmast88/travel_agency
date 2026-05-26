import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Aside from "../features/components/Aside";
import {
  clearCreateState,
  clearDeleteState,
  clearUpdateState,
  createClient,
  deleteClient,
  fetchClients,
  fetchClientsSummary,
  setPage,
  updateClient,
} from "../features/clients/clientsSlice";
import { http } from "../shared/api/http";
import { getAvatarColor, getInitials } from "../shared/lib/avatar";
import { chain, pattern, required, validate } from "../shared/lib/validate";
import { EditIcon, PlusIcon, SearchIcon, TrashIcon } from "../shared/ui/Icons";
import { Pagination } from "../shared/ui/Pagination";

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

const LOYALTY_TABS = [
  { id: "", label: "Все" },
  { id: "standard", label: "Стандарт" },
  { id: "bronze", label: "Бронза" },
  { id: "silver", label: "Серебро" },
  { id: "gold", label: "Золото" },
];

function calcAge(birthDateStr) {
  if (!birthDateStr) return 0;
  const today = new Date();
  const birth = new Date(birthDateStr);
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  )
    age--;
  return age;
}

function todayMinus(years) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().split("T")[0];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clientSchema = {
  full_name: (val) => {
    const v = String(val ?? "").trim();
    if (!v || v.length < 2) return "Введите ФИО (минимум 2 символа)";
    return null;
  },
  phone: (val) => {
    const clean = String(val ?? "").replace(/[\s\-().]/g, "");
    if (!clean) return "Введите телефон";
    if (!/^\+?\d{10,15}$/.test(clean)) return "Формат: +79001234567 (10–15 цифр)";
    return null;
  },
  passport: (val) => {
    const clean = String(val ?? "").replace(/\s/g, "");
    if (!clean) return "Введите паспортные данные";
    if (!/^\d{10}$/.test(clean)) return "10 цифр: серия (4) + номер (6)";
    return null;
  },
  email: chain(required("Введите email"), pattern(EMAIL_RE, "Некорректный email")),
  birth_date: (val) => {
    if (!val) return "Укажите дату рождения";
    const age = calcAge(val);
    if (age < 18) return "Клиент должен быть совершеннолетним (18+)";
    if (age > 120) return "Некорректная дата рождения";
    return null;
  },
};

function DeleteDialog({ open, name, status, error, onConfirm, onClose }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ className: "!rounded-[28px] !bg-white !shadow-2xl" }}
    >
      <DialogTitle className="!px-6 !pt-6 !text-xl !font-extrabold !tracking-tight !text-slate-950">
        Удалить клиента?
      </DialogTitle>
      <DialogContent className="!px-6 !pb-6 !pt-2">
        <div className="space-y-5">
          {error ? <Alert severity="error">{error}</Alert> : null}
          <p className="text-sm font-medium text-slate-600">
            Клиент <span className="font-bold text-slate-900">«{name}»</span>{" "}
            будет удалён безвозвратно.
          </p>
          <div className="flex gap-3 sm:justify-end">
            <Button
              variant="outlined"
              onClick={onClose}
              disabled={status === "loading"}
              className="!rounded-2xl !border-slate-200 !px-5 !py-2.5 !text-sm !font-bold !normal-case !text-slate-700"
            >
              Отмена
            </Button>
            <Button
              variant="contained"
              onClick={onConfirm}
              disabled={status === "loading"}
              className="!rounded-2xl !bg-rose-500 !px-5 !py-2.5 !text-sm !font-bold !normal-case !shadow-none hover:!bg-rose-600"
            >
              {status === "loading" ? "Удаляем..." : "Удалить"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({ label, value, colorClass, loading }) {
  return (
    <article className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-sm shadow-slate-200/60">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${colorClass}`}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
            <path
              d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          {loading ? (
            <CircularProgress size={28} />
          ) : (
            <div className="text-4xl font-black tracking-tight text-slate-950">{value}</div>
          )}
          <div className="mt-1 text-lg font-semibold text-slate-500">{label}</div>
        </div>
      </div>
    </article>
  );
}

const initialForm = {
  full_name: "",
  phone: "",
  passport: "",
  email: "",
  birth_date: "",
};

function ClientFormFields({ form, touched, errors, onChange, onBlur, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <CircularProgress size={32} />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <TextField
        fullWidth
        label="ФИО"
        name="full_name"
        value={form.full_name}
        onChange={onChange}
        onBlur={onBlur}
        error={Boolean(touched.full_name && errors.full_name)}
        helperText={touched.full_name && errors.full_name ? errors.full_name : " "}
        placeholder="Иванов Иван Иванович"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          fullWidth
          label="Телефон"
          name="phone"
          value={form.phone}
          onChange={onChange}
          onBlur={onBlur}
          error={Boolean(touched.phone && errors.phone)}
          helperText={touched.phone && errors.phone ? errors.phone : " "}
          placeholder="+79001234567"
        />
        <TextField
          fullWidth
          label="Email"
          name="email"
          value={form.email}
          type="email"
          onChange={onChange}
          onBlur={onBlur}
          error={Boolean(touched.email && errors.email)}
          helperText={touched.email && errors.email ? errors.email : " "}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          fullWidth
          label="Паспорт"
          name="passport"
          value={form.passport}
          onChange={onChange}
          onBlur={onBlur}
          error={Boolean(touched.passport && errors.passport)}
          helperText={
            touched.passport && errors.passport ? errors.passport : "Серия и номер, 10 цифр"
          }
          placeholder="1234 567890"
        />
        <TextField
          fullWidth
          label="Дата рождения"
          name="birth_date"
          value={form.birth_date}
          type="date"
          onChange={onChange}
          onBlur={onBlur}
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { max: todayMinus(18), min: todayMinus(120) },
          }}
          error={Boolean(touched.birth_date && errors.birth_date)}
          helperText={
            touched.birth_date && errors.birth_date
              ? errors.birth_date
              : "Клиент должен быть 18+"
          }
        />
      </div>
    </div>
  );
}

export function ClientsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentUser = useSelector((s) => s.auth.currentUser);
  const {
    clients,
    total,
    page,
    pages,
    listStatus,
    listError,
    summaryTotal,
    summaryWithDiscount,
    summaryVip,
    summaryStatus,
    createStatus,
    createError,
    updateStatus,
    updateError,
    deleteStatus,
    deleteError,
  } = useSelector((s) => s.clients);

  const isStaff = currentUser?.role === "employee" || currentUser?.role === "admin";
  const isAdmin = currentUser?.role === "admin";

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loyaltyFilter, setLoyaltyFilter] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(initialForm);
  const [createTouched, setCreateTouched] = useState({});

  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(initialForm);
  const [editTouched, setEditTouched] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingClient, setDeletingClient] = useState(null);

  const createErrors = useMemo(() => validate(createForm, clientSchema), [createForm]);
  const editErrors = useMemo(() => validate(editForm, clientSchema), [editForm]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    dispatch(setPage(1));
  }, [dispatch, loyaltyFilter, debouncedSearch]);

  useEffect(() => {
    dispatch(
      fetchClients({
        page,
        loyaltyLevel: loyaltyFilter || null,
        search: debouncedSearch,
      }),
    );
  }, [dispatch, page, loyaltyFilter, debouncedSearch]);

  useEffect(() => {
    dispatch(fetchClientsSummary());
  }, [dispatch]);

  function handlePageChange(p) {
    if (p < 1 || p > pages || p === page) return;
    dispatch(setPage(p));
  }

  function handleLoyaltyFilter(id) {
    setLoyaltyFilter(id);
  }

  // Create
  function openCreate() {
    dispatch(clearCreateState());
    setCreateForm(initialForm);
    setCreateTouched({});
    setCreateOpen(true);
  }
  function closeCreate() {
    if (createStatus === "loading") return;
    dispatch(clearCreateState());
    setCreateOpen(false);
  }
  async function handleCreate() {
    setCreateTouched({
      full_name: true, phone: true, passport: true, email: true, birth_date: true,
    });
    if (Object.keys(createErrors).length > 0) return;
    const result = await dispatch(
      createClient({
        full_name: createForm.full_name.trim(),
        phone: createForm.phone.trim(),
        passport: createForm.passport.replace(/\s/g, ""),
        email: createForm.email.trim(),
        birth_date: createForm.birth_date,
      }),
    );
    if (createClient.fulfilled.match(result)) {
      dispatch(fetchClientsSummary());
      closeCreate();
    }
  }

  // Edit
  async function openEdit(client) {
    dispatch(clearUpdateState());
    setEditTouched({});
    setEditingId(client.id);
    setEditForm(initialForm);
    setEditLoading(true);
    setEditOpen(true);
    try {
      const { data } = await http.get(`/v1/clients/${client.id}`);
      setEditForm({
        full_name: data.full_name,
        phone: data.phone,
        passport: data.passport.replace(/\s/g, ""),
        email: data.email,
        birth_date: data.birth_date,
      });
    } catch {
      // error is shown by the form loading state
    } finally {
      setEditLoading(false);
    }
  }
  function closeEdit() {
    if (updateStatus === "loading") return;
    dispatch(clearUpdateState());
    setEditOpen(false);
  }
  async function handleEdit() {
    setEditTouched({
      full_name: true, phone: true, passport: true, email: true, birth_date: true,
    });
    if (Object.keys(editErrors).length > 0) return;
    const result = await dispatch(
      updateClient({
        id: editingId,
        full_name: editForm.full_name.trim(),
        phone: editForm.phone.trim(),
        passport: editForm.passport.replace(/\s/g, ""),
        email: editForm.email.trim(),
        birth_date: editForm.birth_date,
      }),
    );
    if (updateClient.fulfilled.match(result)) closeEdit();
  }

  // Delete
  function openDelete(client) {
    dispatch(clearDeleteState());
    setDeletingClient({ id: client.id, name: client.full_name });
    setDeleteOpen(true);
  }
  function closeDelete() {
    if (deleteStatus === "loading") return;
    dispatch(clearDeleteState());
    setDeleteOpen(false);
  }
  async function handleDelete() {
    if (!deletingClient) return;
    const result = await dispatch(deleteClient(deletingClient.id));
    if (deleteClient.fulfilled.match(result)) {
      dispatch(fetchClientsSummary());
      closeDelete();
    }
  }

  const summaryLoading = summaryStatus !== "succeeded";

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-transparent text-slate-900">
        <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
          <div className="flex min-h-[calc(100vh-2rem)] overflow-hidden rounded-[32px] border border-white/70 bg-white/75 shadow-panel backdrop-blur">
            <Aside />
            <main className="flex flex-1 items-center justify-center px-8 py-12">
              <div className="text-center">
                <div className="text-2xl font-extrabold text-slate-900">Нет доступа</div>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  Этот раздел доступен только сотрудникам и администраторам.
                </p>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
        <div className="flex min-h-[calc(100vh-2rem)] overflow-hidden rounded-[32px] border border-white/70 bg-white/75 shadow-panel backdrop-blur sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)]">
          <Aside />

          <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 lg:px-8">
            <header className="flex flex-col gap-4 border-b border-slate-200/80 px-6 py-6 xl:flex-row xl:items-center xl:justify-between lg:px-10">
              <div className="flex min-w-0 flex-col gap-4 xl:flex-1 xl:flex-row xl:items-center">
                <h1 className="shrink-0 text-3xl font-extrabold tracking-tight text-slate-950">
                  Клиенты
                </h1>
                <label className="flex w-full max-w-[420px] min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm shadow-slate-200/40 xl:flex-1">
                  <SearchIcon className="h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Поиск по имени, телефону, email..."
                    className="w-full bg-transparent text-base font-medium text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </label>
              </div>
              <Button
                variant="contained"
                onClick={openCreate}
                className="!min-w-[200px] shrink-0 !rounded-2xl !bg-brand-500 !px-5 !py-3 !text-sm !font-bold !normal-case !shadow-none hover:!bg-brand-600"
              >
                <span className="mr-2 inline-flex">
                  <PlusIcon className="h-5 w-5" />
                </span>
                Добавить клиента
              </Button>
            </header>

            <div className="space-y-6 px-6 py-7 lg:px-10 lg:py-8">
              <section className="grid gap-4 md:grid-cols-3">
                <SummaryCard
                  label="Всего клиентов"
                  value={summaryTotal}
                  colorClass="bg-brand-50 text-brand-500"
                  loading={summaryLoading}
                />
                <SummaryCard
                  label="Со скидкой"
                  value={summaryWithDiscount}
                  colorClass="bg-emerald-50 text-emerald-500"
                  loading={summaryLoading}
                />
                <SummaryCard
                  label="VIP (Золото)"
                  value={summaryVip}
                  colorClass="bg-yellow-50 text-yellow-600"
                  loading={summaryLoading}
                />
              </section>

              <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
                <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                    <div className="text-2xl font-extrabold tracking-tight">Список клиентов</div>
                    <div className="flex flex-wrap items-center gap-2">
                      {LOYALTY_TABS.map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => handleLoyaltyFilter(tab.id)}
                          className={`rounded-2xl border px-4 py-2 text-sm font-bold transition ${
                            loyaltyFilter === tab.id
                              ? "border-brand-200 bg-brand-50 text-brand-600"
                              : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-slate-500">
                    {listStatus === "loading" ? (
                      <span className="inline-flex items-center gap-2">
                        <CircularProgress size={14} />
                        Загружаем...
                      </span>
                    ) : (
                      `${total} клиент${total === 1 ? "" : total >= 2 && total <= 4 ? "а" : "ов"}`
                    )}
                  </div>
                </div>

                {listError && (
                  <div className="px-6 py-4">
                    <Alert severity="error">{listError}</Alert>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[780px] border-collapse">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs uppercase tracking-[0.1em] text-slate-400">
                        <th className="px-6 py-4">Клиент</th>
                        <th className="px-6 py-4">Телефон</th>
                        <th className="px-6 py-4">Лояльность</th>
                        <th className="px-6 py-4">Скидка</th>
                        <th className="px-6 py-4">Покупок</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((client) => (
                        <tr key={client.id} className="border-t border-slate-100 align-middle">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${getAvatarColor(client.id)}`}
                              >
                                {getInitials(client.full_name)}
                              </div>
                              <button
                                type="button"
                                onClick={() => navigate(`/clients/${client.id}`)}
                                className="text-left"
                              >
                                <div className="text-sm font-bold text-slate-900 hover:text-brand-600 hover:underline transition-colors">
                                  {client.full_name}
                                </div>
                                <div className="text-xs font-medium text-slate-400">
                                  {client.email}
                                </div>
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                            {client.phone}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${LOYALTY_CLASSES[client.loyalty_level]}`}
                            >
                              {LOYALTY_LABELS[client.loyalty_level]}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {client.discount_pct > 0 ? (
                              <span className="text-sm font-black text-emerald-600">
                                -{client.discount_pct}%
                              </span>
                            ) : (
                              <span className="text-sm text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm font-black text-slate-800">
                            {client.sales_count}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEdit(client)}
                                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
                                title="Редактировать"
                              >
                                <EditIcon className="h-4 w-4" />
                              </button>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => openDelete(client)}
                                  className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                                  title="Удалить"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {clients.length === 0 && listStatus !== "loading" && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-6 py-10 text-center text-sm font-semibold text-slate-500"
                          >
                            {search || loyaltyFilter
                              ? "Клиенты не найдены. Попробуйте изменить фильтры."
                              : "Клиентов пока нет."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
                  <div className="text-sm font-medium text-slate-500">
                    {listStatus === "loading" ? (
                      <span className="inline-flex items-center gap-2">
                        <CircularProgress size={16} />
                        Загружаем...
                      </span>
                    ) : total > 0 ? (
                      `Показано ${clients.length} из ${total}`
                    ) : (
                      ""
                    )}
                  </div>
                  <Pagination page={page} pages={pages} onPageChange={handlePageChange} />
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onClose={closeCreate}
        fullWidth
        maxWidth="sm"
        PaperProps={{ className: "!rounded-[32px] !bg-white/95 !shadow-2xl" }}
      >
        <DialogTitle className="!px-6 !pt-6 !text-2xl !font-extrabold !tracking-tight !text-slate-950">
          Добавить клиента
        </DialogTitle>
        <DialogContent className="!px-6 !pb-7 !pt-4">
          <div className="space-y-4">
            {createError && <Alert severity="error">{createError}</Alert>}
            <ClientFormFields
              form={createForm}
              touched={createTouched}
              errors={createErrors}
              onChange={(e) =>
                setCreateForm((p) => ({ ...p, [e.target.name]: e.target.value }))
              }
              onBlur={(e) =>
                setCreateTouched((p) => ({ ...p, [e.target.name]: true }))
              }
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outlined"
                onClick={closeCreate}
                disabled={createStatus === "loading"}
                className="!rounded-2xl !border-slate-200 !px-6 !py-3 !text-sm !font-bold !normal-case !text-slate-700"
              >
                Отмена
              </Button>
              <Button
                variant="contained"
                onClick={handleCreate}
                disabled={createStatus === "loading"}
                className="!rounded-2xl !bg-brand-500 !px-6 !py-3 !text-sm !font-bold !normal-case !shadow-none hover:!bg-brand-600"
              >
                {createStatus === "loading" ? "Создаём..." : "Создать"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={editOpen}
        onClose={closeEdit}
        fullWidth
        maxWidth="sm"
        PaperProps={{ className: "!rounded-[32px] !bg-white/95 !shadow-2xl" }}
      >
        <DialogTitle className="!px-6 !pt-6 !text-2xl !font-extrabold !tracking-tight !text-slate-950">
          Редактировать клиента
        </DialogTitle>
        <DialogContent className="!px-6 !pb-7 !pt-4">
          <div className="space-y-4">
            {updateError && <Alert severity="error">{updateError}</Alert>}
            <ClientFormFields
              form={editForm}
              touched={editTouched}
              errors={editErrors}
              loading={editLoading}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, [e.target.name]: e.target.value }))
              }
              onBlur={(e) =>
                setEditTouched((p) => ({ ...p, [e.target.name]: true }))
              }
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outlined"
                onClick={closeEdit}
                disabled={updateStatus === "loading" || editLoading}
                className="!rounded-2xl !border-slate-200 !px-6 !py-3 !text-sm !font-bold !normal-case !text-slate-700"
              >
                Отмена
              </Button>
              <Button
                variant="contained"
                onClick={handleEdit}
                disabled={updateStatus === "loading" || editLoading}
                className="!rounded-2xl !bg-brand-500 !px-6 !py-3 !text-sm !font-bold !normal-case !shadow-none hover:!bg-brand-600"
              >
                {updateStatus === "loading" ? "Сохраняем..." : "Сохранить"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={deleteOpen}
        name={deletingClient?.name}
        status={deleteStatus}
        error={deleteError}
        onConfirm={handleDelete}
        onClose={closeDelete}
      />
    </div>
  );
}
