import { Alert, Button, TextField } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Aside from "../features/components/Aside";
import {
  changePassword,
  clearPasswordChangeState,
  clearProfileError,
  logoutUser,
  updateCurrentUser,
} from "../features/auth/authSlice";
import { formatDateTime } from "../shared/lib/format";
import { chain, match, minLength, pattern, required, validate } from "../shared/lib/validate";

const PASSWORD_DIGIT_RE = /\d/;
const PASSWORD_SPECIAL_RE = /[!@#$%^&*()\-_=+[\]{};:'",.<>?/\\|`~]/;

const profileSchema = {
  first_name: required("Введите имя"),
};

const passwordSchema = {
  current_password: required("Введите текущий пароль"),
  new_password: chain(
    required("Введите новый пароль"),
    minLength(8, "Минимум 8 символов"),
    pattern(PASSWORD_DIGIT_RE, "Пароль должен содержать хотя бы одну цифру"),
    pattern(PASSWORD_SPECIAL_RE, "Пароль должен содержать хотя бы один спецсимвол"),
  ),
  new_password_confirm: chain(
    required("Подтвердите новый пароль"),
    match("new_password", "Пароли не совпадают"),
  ),
};

const initialPasswordForm = {
  current_password: "",
  new_password: "",
  new_password_confirm: "",
};

const ROLE_LABELS = {
  admin: "Администратор",
  employee: "Сотрудник",
};

function formatRole(role) {
  return ROLE_LABELS[role] ?? "Менеджер";
}

export function ProfilePage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    currentUser,
    profileUpdateError,
    profileUpdateStatus,
    passwordChangeStatus,
    passwordChangeError,
  } = useSelector((state) => state.auth);
  const [draft, setDraft] = useState(null);
  const [touched, setTouched] = useState({});
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [passwordTouched, setPasswordTouched] = useState({});

  useEffect(() => {
    return () => {
      dispatch(clearProfileError());
      dispatch(clearPasswordChangeState());
    };
  }, [dispatch]);

  const form = useMemo(
    () =>
      draft ?? {
        first_name: currentUser?.first_name ?? "",
        last_name: currentUser?.last_name ?? "",
      },
    [currentUser, draft],
  );

  const errors = useMemo(() => validate(form, profileSchema), [form]);
  const passwordErrors = useMemo(() => validate(passwordForm, passwordSchema), [passwordForm]);
  const isSaving = profileUpdateStatus === "loading";
  const isChangingPassword = passwordChangeStatus === "loading";

  function handleChange(event) {
    const { name, value } = event.target;
    setDraft((currentDraft) => ({ ...(currentDraft ?? form), [name]: value }));
  }

  function handleBlur(event) {
    const { name } = event.target;
    setTouched((current) => ({ ...current, [name]: true }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setTouched({ first_name: true, last_name: true });
    dispatch(clearProfileError());
    if (Object.keys(errors).length > 0) return;
    const resultAction = await dispatch(
      updateCurrentUser({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || null,
      }),
    );
    if (updateCurrentUser.fulfilled.match(resultAction)) setDraft(null);
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
    if (passwordChangeStatus === "succeeded") dispatch(clearPasswordChangeState());
  }

  function handlePasswordBlur(event) {
    const { name } = event.target;
    setPasswordTouched((current) => ({ ...current, [name]: true }));
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setPasswordTouched({
      current_password: true,
      new_password: true,
      new_password_confirm: true,
    });
    if (Object.keys(passwordErrors).length > 0) return;
    const resultAction = await dispatch(changePassword(passwordForm));
    if (changePassword.fulfilled.match(resultAction)) {
      setPasswordForm(initialPasswordForm);
      setPasswordTouched({});
    }
  }

  async function handleLogout() {
    await dispatch(logoutUser());
    navigate("/register?mode=login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
        <div className="flex min-h-[calc(100vh-2rem)] overflow-hidden rounded-[32px] border border-white/70 bg-white/75 shadow-panel backdrop-blur sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)]">
          <Aside />

          <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 lg:px-8">
            <header className="flex flex-col gap-4 border-b border-slate-200/80 px-6 py-6 lg:px-10">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
                  Личный кабинет
                </h1>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  Здесь можно посмотреть данные аккаунта и обновить имя.
                </p>
              </div>
            </header>

            <div className="grid gap-6 px-6 py-7 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-8">
              <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
                <div className="mb-6">
                  <div className="text-sm font-bold uppercase tracking-[0.18em] text-brand-500">
                    Профиль
                  </div>
                  <div className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
                    Основные данные
                  </div>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                  {profileUpdateError ? (
                    <Alert severity="error">{profileUpdateError}</Alert>
                  ) : null}

                  <TextField
                    fullWidth
                    label="Имя"
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={Boolean(touched.first_name && errors.first_name)}
                    helperText={
                      touched.first_name && errors.first_name
                        ? errors.first_name
                        : " "
                    }
                  />

                  <TextField
                    fullWidth
                    label="Фамилия"
                    name="last_name"
                    value={form.last_name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    helperText="Необязательно"
                  />

                  <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={isSaving}
                      className="!rounded-2xl !bg-brand-500 !px-6 !py-3 !text-sm !font-bold !normal-case !shadow-none hover:!bg-brand-600"
                    >
                      {isSaving ? "Сохраняем..." : "Сохранить изменения"}
                    </Button>

                    <Button
                      type="button"
                      variant="outlined"
                      onClick={handleLogout}
                      className="!rounded-2xl !border-slate-200 !px-6 !py-3 !text-sm !font-bold !normal-case !text-slate-700"
                    >
                      Выйти из аккаунта
                    </Button>
                  </div>
                </form>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 text-xl font-black text-white">
                    {currentUser?.first_name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold tracking-tight text-slate-950">
                      {currentUser
                        ? `${currentUser.first_name} ${currentUser.last_name ?? ""}`.trim()
                        : "Профиль загружается"}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-500">
                      {formatRole(currentUser?.role)}
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                      Email
                    </div>
                    <div className="mt-2 text-base font-semibold text-slate-800">
                      {currentUser?.email ?? "Не загружен"}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                      Дата регистрации
                    </div>
                    <div className="mt-2 text-base font-semibold text-slate-800">
                      {formatDateTime(currentUser?.created_at)}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                      Последний вход
                    </div>
                    <div className="mt-2 text-base font-semibold text-slate-800">
                      {formatDateTime(currentUser?.last_login_at)}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60 lg:col-span-2">
                <div className="mb-6">
                  <div className="text-sm font-bold uppercase tracking-[0.18em] text-brand-500">
                    Безопасность
                  </div>
                  <div className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
                    Смена пароля
                  </div>
                </div>

                <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                  {passwordChangeError ? (
                    <Alert severity="error">{passwordChangeError}</Alert>
                  ) : null}
                  {passwordChangeStatus === "succeeded" ? (
                    <Alert severity="success">Пароль успешно изменён.</Alert>
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-3">
                    <TextField
                      fullWidth
                      type="password"
                      label="Текущий пароль"
                      name="current_password"
                      value={passwordForm.current_password}
                      onChange={handlePasswordChange}
                      onBlur={handlePasswordBlur}
                      error={Boolean(
                        passwordTouched.current_password && passwordErrors.current_password,
                      )}
                      helperText={
                        passwordTouched.current_password && passwordErrors.current_password
                          ? passwordErrors.current_password
                          : " "
                      }
                    />

                    <TextField
                      fullWidth
                      type="password"
                      label="Новый пароль"
                      name="new_password"
                      value={passwordForm.new_password}
                      onChange={handlePasswordChange}
                      onBlur={handlePasswordBlur}
                      error={Boolean(passwordTouched.new_password && passwordErrors.new_password)}
                      helperText={
                        passwordTouched.new_password && passwordErrors.new_password
                          ? passwordErrors.new_password
                          : "Мин. 8 символов, цифра и спецсимвол"
                      }
                    />

                    <TextField
                      fullWidth
                      type="password"
                      label="Подтверждение пароля"
                      name="new_password_confirm"
                      value={passwordForm.new_password_confirm}
                      onChange={handlePasswordChange}
                      onBlur={handlePasswordBlur}
                      error={Boolean(
                        passwordTouched.new_password_confirm &&
                          passwordErrors.new_password_confirm,
                      )}
                      helperText={
                        passwordTouched.new_password_confirm &&
                        passwordErrors.new_password_confirm
                          ? passwordErrors.new_password_confirm
                          : " "
                      }
                    />
                  </div>

                  <div className="flex pt-2">
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={isChangingPassword}
                      className="!rounded-2xl !bg-brand-500 !px-6 !py-3 !text-sm !font-bold !normal-case !shadow-none hover:!bg-brand-600"
                    >
                      {isChangingPassword ? "Сохраняем..." : "Изменить пароль"}
                    </Button>
                  </div>
                </form>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
