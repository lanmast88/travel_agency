import { Alert, Button, TextField } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Aside from "../features/components/Aside";
import {
  clearProfileError,
  logout,
  updateCurrentUser,
} from "../features/auth/authSlice";

function formatRole(role) {
  if (role === "admin") {
    return "Администратор";
  }

  if (role === "employee") {
    return "Сотрудник";
  }

  return "Менеджер";
}

function formatDate(value) {
  if (!value) {
    return "Не указано";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ProfilePage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentUser, profileUpdateError, profileUpdateStatus } = useSelector(
    (state) => state.auth,
  );
  const [draft, setDraft] = useState(null);
  const [touched, setTouched] = useState({});

  useEffect(() => {
    return () => {
      dispatch(clearProfileError());
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

  const errors = useMemo(() => {
    const nextErrors = {};

    if (!form.first_name.trim()) {
      nextErrors.first_name = "Введите имя";
    }

    return nextErrors;
  }, [form]);

  const isSaving = profileUpdateStatus === "loading";

  function handleChange(event) {
    const { name, value } = event.target;

    setDraft((currentDraft) => ({
      ...(currentDraft ?? form),
      [name]: value,
    }));
  }

  function handleBlur(event) {
    const { name } = event.target;

    setTouched((current) => ({
      ...current,
      [name]: true,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setTouched({
      first_name: true,
      last_name: true,
    });
    dispatch(clearProfileError());

    if (Object.keys(errors).length > 0) {
      return;
    }

    const resultAction = await dispatch(
      updateCurrentUser({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || null,
      }),
    );

    if (updateCurrentUser.fulfilled.match(resultAction)) {
      setDraft(null);
    }
  }

  function handleLogout() {
    dispatch(logout());
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
                      {formatDate(currentUser?.created_at)}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                      Последний вход
                    </div>
                    <div className="mt-2 text-base font-semibold text-slate-800">
                      {formatDate(currentUser?.last_login_at)}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
