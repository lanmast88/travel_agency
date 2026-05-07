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
import Aside from "../features/components/Aside";
import {
  clearCreateState,
  clearDeactivateState,
  clearUpdateState,
  createUser,
  deactivateUser,
  fetchUsers,
  updateUser,
} from "../features/users/usersSlice";

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

const ROLE_TABS = [
  { id: "", label: "Все" },
  { id: "user", label: "Пользователи" },
  { id: "employee", label: "Сотрудники" },
  { id: "admin", label: "Администраторы" },
];

const AVATAR_PALETTE = [
  "bg-brand-500", "bg-emerald-500", "bg-violet-500",
  "bg-amber-500", "bg-rose-500", "bg-sky-600", "bg-teal-500", "bg-purple-500",
];

const PAGE_SIZE = 20;

function getInitials(user) {
  const first = user.first_name?.[0]?.toUpperCase() ?? "";
  const last = user.last_name?.[0]?.toUpperCase() ?? "";
  return first + last || "?";
}

function getAvatarColor(id) {
  const n = id ? parseInt(id.replace(/-/g, "").slice(0, 8), 16) : 0;
  return AVATAR_PALETTE[n % AVATAR_PALETTE.length];
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

const SPECIAL_CHARS = /[!@#$%^&*()\-_=+[\]{};:'",.<>?/\\|`~]/;

function validateCreateForm(f) {
  const e = {};
  if (!f.first_name.trim()) e.first_name = "Введите имя";
  if (!f.email.trim()) e.email = "Введите email";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "Некорректный email";
  if (!f.password) e.password = "Введите пароль";
  else if (f.password.length < 8) e.password = "Минимум 8 символов";
  else if (!/\d/.test(f.password)) e.password = "Пароль должен содержать цифру";
  else if (!SPECIAL_CHARS.test(f.password)) e.password = "Пароль должен содержать спец. символ";
  if (!f.password_confirm) e.password_confirm = "Подтвердите пароль";
  else if (f.password !== f.password_confirm) e.password_confirm = "Пароли не совпадают";
  return e;
}

function validateEditForm(f) {
  const e = {};
  if (f.first_name !== undefined && f.first_name.trim() === "") {
    e.first_name = "Имя не может быть пустым";
  }
  return e;
}

function Pagination({ page, pages, onPageChange }) {
  if (pages <= 1) return null;
  const nums = Array.from({ length: pages }, (_, i) => i + 1);
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-lg font-bold text-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
      >‹</button>
      {nums.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onPageChange(n)}
          className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${
            n === page ? "bg-brand-500 text-white" : "border border-slate-200 text-slate-700"
          }`}
        >{n}</button>
      ))}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pages}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-lg font-bold text-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
      >›</button>
    </div>
  );
}

function DeactivateDialog({ open, name, status, error, onConfirm, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ className: "!rounded-[28px] !bg-white !shadow-2xl" }}>
      <DialogTitle className="!px-6 !pt-6 !text-xl !font-extrabold !tracking-tight !text-slate-950">
        Деактивировать пользователя?
      </DialogTitle>
      <DialogContent className="!px-6 !pb-6 !pt-2">
        <div className="space-y-5">
          {error ? <Alert severity="error">{error}</Alert> : null}
          <p className="text-sm font-medium text-slate-600">
            Пользователь <span className="font-bold text-slate-900">«{name}»</span> будет
            деактивирован и потеряет доступ к системе.
          </p>
          <div className="flex gap-3 sm:justify-end">
            <Button variant="outlined" onClick={onClose} disabled={status === "loading"}
              className="!rounded-2xl !border-slate-200 !px-5 !py-2.5 !text-sm !font-bold !normal-case !text-slate-700">
              Отмена
            </Button>
            <Button variant="contained" onClick={onConfirm} disabled={status === "loading"}
              className="!rounded-2xl !bg-rose-500 !px-5 !py-2.5 !text-sm !font-bold !normal-case !shadow-none hover:!bg-rose-600">
              {status === "loading" ? "Деактивируем..." : "Деактивировать"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const initialCreateForm = {
  email: "", password: "", password_confirm: "",
  first_name: "", last_name: "", role: "user",
};

function CreateFormFields({ form, touched, errors, onChange, onBlur, onRoleChange }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          fullWidth label="Имя" name="first_name" value={form.first_name}
          onChange={onChange} onBlur={onBlur}
          error={Boolean(touched.first_name && errors.first_name)}
          helperText={touched.first_name && errors.first_name ? errors.first_name : " "}
          placeholder="Иван"
        />
        <TextField
          fullWidth label="Фамилия" name="last_name" value={form.last_name}
          onChange={onChange} onBlur={onBlur}
          helperText=" "
          placeholder="Иванов"
        />
      </div>
      <TextField
        fullWidth label="Email" name="email" value={form.email} type="email"
        onChange={onChange} onBlur={onBlur}
        error={Boolean(touched.email && errors.email)}
        helperText={touched.email && errors.email ? errors.email : " "}
      />
      <FormControl fullWidth>
        <InputLabel>Роль</InputLabel>
        <Select value={form.role} label="Роль" onChange={(e) => onRoleChange(e.target.value)}>
          <MenuItem value="user">Пользователь</MenuItem>
          <MenuItem value="employee">Сотрудник</MenuItem>
          <MenuItem value="admin">Администратор</MenuItem>
        </Select>
      </FormControl>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">
        <TextField
          fullWidth label="Пароль" name="password" value={form.password} type="password"
          onChange={onChange} onBlur={onBlur}
          error={Boolean(touched.password && errors.password)}
          helperText={touched.password && errors.password ? errors.password : "Мин. 8 символов, цифра, спец. символ"}
        />
        <TextField
          fullWidth label="Подтверждение пароля" name="password_confirm"
          value={form.password_confirm} type="password"
          onChange={onChange} onBlur={onBlur}
          error={Boolean(touched.password_confirm && errors.password_confirm)}
          helperText={touched.password_confirm && errors.password_confirm ? errors.password_confirm : " "}
        />
      </div>
    </div>
  );
}

const initialEditForm = { first_name: "", last_name: "", role: "user" };

function EditFormFields({ form, touched, errors, onChange, onBlur, onRoleChange }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          fullWidth label="Имя" name="first_name" value={form.first_name}
          onChange={onChange} onBlur={onBlur}
          error={Boolean(touched.first_name && errors.first_name)}
          helperText={touched.first_name && errors.first_name ? errors.first_name : " "}
        />
        <TextField
          fullWidth label="Фамилия" name="last_name" value={form.last_name}
          onChange={onChange} onBlur={onBlur}
          helperText=" "
        />
      </div>
      <FormControl fullWidth>
        <InputLabel>Роль</InputLabel>
        <Select value={form.role} label="Роль" onChange={(e) => onRoleChange(e.target.value)}>
          <MenuItem value="user">Пользователь</MenuItem>
          <MenuItem value="employee">Сотрудник</MenuItem>
          <MenuItem value="admin">Администратор</MenuItem>
        </Select>
      </FormControl>
    </div>
  );
}

export function UsersPage() {
  const dispatch = useDispatch();
  const currentUser = useSelector((s) => s.auth.currentUser);
  const { users, listStatus, listError, createStatus, createError, updateStatus, updateError, deactivateStatus, deactivateError } =
    useSelector((s) => s.users);

  const isStaff = currentUser?.role === "employee" || currentUser?.role === "admin";
  const isAdmin = currentUser?.role === "admin";

  const [roleFilter, setRoleFilter] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [createTouched, setCreateTouched] = useState({});

  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(initialEditForm);
  const [editTouched, setEditTouched] = useState({});

  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivatingUser, setDeactivatingUser] = useState(null);

  const createErrors = useMemo(() => validateCreateForm(createForm), [createForm]);
  const editErrors = useMemo(() => validateEditForm(editForm), [editForm]);

  useEffect(() => {
    dispatch(fetchUsers({ activeOnly }));
  }, [dispatch, activeOnly]);

  useEffect(() => {
    setPage(1);
  }, [roleFilter, activeOnly]);

  const filtered = useMemo(() => {
    if (!roleFilter) return users;
    return users.filter((u) => u.role === roleFilter);
  }, [users, roleFilter]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSlice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Create
  function openCreate() {
    dispatch(clearCreateState());
    setCreateForm(initialCreateForm);
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
      first_name: true, email: true, password: true, password_confirm: true,
    });
    if (Object.keys(createErrors).length > 0) return;
    const payload = {
      email: createForm.email.trim(),
      password: createForm.password,
      password_confirm: createForm.password_confirm,
      first_name: createForm.first_name.trim(),
      role: createForm.role,
    };
    if (createForm.last_name.trim()) payload.last_name = createForm.last_name.trim();
    const result = await dispatch(createUser(payload));
    if (createUser.fulfilled.match(result)) closeCreate();
  }

  // Edit
  function openEdit(user) {
    dispatch(clearUpdateState());
    setEditTouched({});
    setEditingId(user.id);
    setEditForm({
      first_name: user.first_name,
      last_name: user.last_name ?? "",
      role: user.role,
    });
    setEditOpen(true);
  }
  function closeEdit() {
    if (updateStatus === "loading") return;
    dispatch(clearUpdateState());
    setEditOpen(false);
  }
  async function handleEdit() {
    setEditTouched({ first_name: true });
    if (Object.keys(editErrors).length > 0) return;
    const payload = { id: editingId, role: editForm.role };
    if (editForm.first_name.trim()) payload.first_name = editForm.first_name.trim();
    if (editForm.last_name.trim()) payload.last_name = editForm.last_name.trim();
    const result = await dispatch(updateUser(payload));
    if (updateUser.fulfilled.match(result)) closeEdit();
  }

  // Deactivate
  function openDeactivate(user) {
    dispatch(clearDeactivateState());
    setDeactivatingUser({ id: user.id, name: `${user.first_name} ${user.last_name ?? ""}`.trim() });
    setDeactivateOpen(true);
  }
  function closeDeactivate() {
    if (deactivateStatus === "loading") return;
    dispatch(clearDeactivateState());
    setDeactivateOpen(false);
  }
  async function handleDeactivate() {
    if (!deactivatingUser) return;
    const result = await dispatch(deactivateUser(deactivatingUser.id));
    if (deactivateUser.fulfilled.match(result)) closeDeactivate();
  }

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
            {/* Header */}
            <header className="flex flex-col gap-4 border-b border-slate-200/80 px-6 py-6 xl:flex-row xl:items-center xl:justify-between lg:px-10">
              <h1 className="shrink-0 text-3xl font-extrabold tracking-tight text-slate-950">
                Пользователи
              </h1>
              {isAdmin && (
                <Button
                  variant="contained"
                  onClick={openCreate}
                  className="!min-w-[220px] shrink-0 !rounded-2xl !bg-brand-500 !px-5 !py-3 !text-sm !font-bold !normal-case !shadow-none hover:!bg-brand-600"
                >
                  <span className="mr-2 inline-flex">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                  Добавить пользователя
                </Button>
              )}
            </header>

            <div className="space-y-6 px-6 py-7 lg:px-10 lg:py-8">
              {/* Filters */}
              <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
                <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                    <div className="text-2xl font-extrabold tracking-tight">Список пользователей</div>
                    <div className="flex flex-wrap items-center gap-2">
                      {ROLE_TABS.map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setRoleFilter(tab.id)}
                          className={`rounded-2xl border px-4 py-2 text-sm font-bold transition ${
                            roleFilter === tab.id
                              ? "border-brand-200 bg-brand-50 text-brand-600"
                              : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        checked={activeOnly}
                        onChange={(e) => setActiveOnly(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 accent-brand-500"
                      />
                      Только активные
                    </label>
                    <div className="text-sm font-bold text-slate-500">
                      {listStatus === "loading"
                        ? <span className="inline-flex items-center gap-2"><CircularProgress size={14} />Загружаем...</span>
                        : `${filtered.length} пользовател${filtered.length === 1 ? "ь" : filtered.length >= 2 && filtered.length <= 4 ? "я" : "ей"}`
                      }
                    </div>
                  </div>
                </div>

                {listError && (
                  <div className="px-6 py-4"><Alert severity="error">{listError}</Alert></div>
                )}

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] border-collapse">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs uppercase tracking-[0.1em] text-slate-400">
                        <th className="px-6 py-4">Пользователь</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Роль</th>
                        <th className="px-6 py-4">Последний вход</th>
                        <th className="px-6 py-4">Дата создания</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageSlice.map((user) => (
                        <tr key={user.id} className="border-t border-slate-100 align-middle">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${getAvatarColor(user.id)}`}>
                                {getInitials(user)}
                              </div>
                              <div className="text-sm font-bold text-slate-900">
                                {user.first_name} {user.last_name ?? ""}
                                {currentUser?.id === user.id && (
                                  <span className="ml-2 text-xs font-semibold text-brand-500">(вы)</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-500">
                            {user.email}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${ROLE_CLASSES[user.role]}`}>
                              {ROLE_LABELS[user.role]}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-500">
                            {formatDate(user.last_login_at)}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-500">
                            {formatDate(user.created_at)}
                          </td>
                          <td className="px-4 py-4">
                            {isAdmin && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEdit(user)}
                                  className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
                                  title="Редактировать"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                                    <path d="m4 20 4.2-1 9.5-9.5a2.12 2.12 0 0 0-3-3L5.2 16 4 20ZM13.5 7.5l3 3"
                                      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </button>
                                {currentUser?.id !== user.id && (
                                  <button
                                    type="button"
                                    onClick={() => openDeactivate(user)}
                                    className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                                    title="Деактивировать"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                                      <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {pageSlice.length === 0 && listStatus !== "loading" && (
                        <tr>
                          <td colSpan={6} className="px-6 py-10 text-center text-sm font-semibold text-slate-500">
                            {roleFilter ? "Пользователи не найдены. Попробуйте изменить фильтр." : "Пользователей пока нет."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
                  <div className="text-sm font-medium text-slate-500">
                    {listStatus !== "loading" && filtered.length > 0
                      ? `Показано ${pageSlice.length} из ${filtered.length}`
                      : ""
                    }
                  </div>
                  <Pagination page={page} pages={pages} onPageChange={setPage} />
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={closeCreate} fullWidth maxWidth="sm"
        PaperProps={{ className: "!rounded-[32px] !bg-white/95 !shadow-2xl" }}>
        <DialogTitle className="!px-6 !pt-6 !text-2xl !font-extrabold !tracking-tight !text-slate-950">
          Добавить пользователя
        </DialogTitle>
        <DialogContent className="!px-6 !pb-7 !pt-4">
          <div className="space-y-4">
            {createError && <Alert severity="error">{createError}</Alert>}
            <CreateFormFields
              form={createForm} touched={createTouched} errors={createErrors}
              onChange={(e) => setCreateForm((p) => ({ ...p, [e.target.name]: e.target.value }))}
              onBlur={(e) => setCreateTouched((p) => ({ ...p, [e.target.name]: true }))}
              onRoleChange={(v) => setCreateForm((p) => ({ ...p, role: v }))}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outlined" onClick={closeCreate} disabled={createStatus === "loading"}
                className="!rounded-2xl !border-slate-200 !px-6 !py-3 !text-sm !font-bold !normal-case !text-slate-700">
                Отмена
              </Button>
              <Button variant="contained" onClick={handleCreate} disabled={createStatus === "loading"}
                className="!rounded-2xl !bg-brand-500 !px-6 !py-3 !text-sm !font-bold !normal-case !shadow-none hover:!bg-brand-600">
                {createStatus === "loading" ? "Создаём..." : "Создать"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onClose={closeEdit} fullWidth maxWidth="sm"
        PaperProps={{ className: "!rounded-[32px] !bg-white/95 !shadow-2xl" }}>
        <DialogTitle className="!px-6 !pt-6 !text-2xl !font-extrabold !tracking-tight !text-slate-950">
          Редактировать пользователя
        </DialogTitle>
        <DialogContent className="!px-6 !pb-7 !pt-4">
          <div className="space-y-4">
            {updateError && <Alert severity="error">{updateError}</Alert>}
            <EditFormFields
              form={editForm} touched={editTouched} errors={editErrors}
              onChange={(e) => setEditForm((p) => ({ ...p, [e.target.name]: e.target.value }))}
              onBlur={(e) => setEditTouched((p) => ({ ...p, [e.target.name]: true }))}
              onRoleChange={(v) => setEditForm((p) => ({ ...p, role: v }))}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outlined" onClick={closeEdit} disabled={updateStatus === "loading"}
                className="!rounded-2xl !border-slate-200 !px-6 !py-3 !text-sm !font-bold !normal-case !text-slate-700">
                Отмена
              </Button>
              <Button variant="contained" onClick={handleEdit} disabled={updateStatus === "loading"}
                className="!rounded-2xl !bg-brand-500 !px-6 !py-3 !text-sm !font-bold !normal-case !shadow-none hover:!bg-brand-600">
                {updateStatus === "loading" ? "Сохраняем..." : "Сохранить"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeactivateDialog
        open={deactivateOpen} name={deactivatingUser?.name}
        status={deactivateStatus} error={deactivateError}
        onConfirm={handleDeactivate} onClose={closeDeactivate}
      />
    </div>
  );
}
