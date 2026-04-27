import { Alert, Button, TextField } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  clearLoginError,
  clearRegisterError,
  loginUser,
  registerUser,
} from "./authSlice";

const initialRegisterForm = {
  email: "",
  first_name: "",
  last_name: "",
  password: "",
  password_confirm: "",
};

const initialLoginForm = {
  email: "",
  password: "",
};

function validateRegisterForm(values) {
  const errors = {};

  if (!values.email.trim()) {
    errors.email = "Введите email";
  }

  if (!values.first_name.trim()) {
    errors.first_name = "Введите имя";
  }

  if (!values.password) {
    errors.password = "Введите пароль";
  } else if (values.password.length < 8) {
    errors.password = "Минимум 8 символов";
  }

  if (!values.password_confirm) {
    errors.password_confirm = "Подтвердите пароль";
  } else if (values.password !== values.password_confirm) {
    errors.password_confirm = "Пароли не совпадают";
  }

  return errors;
}

function validateLoginForm(values) {
  const errors = {};

  if (!values.email.trim()) {
    errors.email = "Введите email";
  }

  if (!values.password) {
    errors.password = "Введите пароль";
  }

  return errors;
}

export function AuthPanel({
  initialMode = "register",
  onSuccess,
  bannerMessage = null,
  showHomeLink = false,
  compact = false,
}) {
  const dispatch = useDispatch();
  const {
    loginError,
    loginStatus,
    registerError,
    registerStatus,
  } = useSelector((state) => state.auth);
  const [mode, setMode] = useState(initialMode);
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [touched, setTouched] = useState({});

  useEffect(() => {
    setMode(initialMode);
    setTouched({});
  }, [initialMode]);

  useEffect(() => {
    return () => {
      dispatch(clearRegisterError());
      dispatch(clearLoginError());
    };
  }, [dispatch]);

  const registerErrors = useMemo(
    () => validateRegisterForm(registerForm),
    [registerForm],
  );
  const loginErrors = useMemo(() => validateLoginForm(loginForm), [loginForm]);
  const isRegisterMode = mode === "register";
  const activeErrors = isRegisterMode ? registerErrors : loginErrors;
  const isSubmitting =
    isRegisterMode ? registerStatus === "loading" : loginStatus === "loading";
  const submitError = isRegisterMode ? registerError : loginError;

  function switchMode(nextMode) {
    setMode(nextMode);
    setTouched({});
    dispatch(clearRegisterError());
    dispatch(clearLoginError());
  }

  function handleRegisterChange(event) {
    const { name, value } = event.target;

    setRegisterForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleLoginChange(event) {
    const { name, value } = event.target;

    setLoginForm((current) => ({
      ...current,
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

  async function handleRegisterSubmit(event) {
    event.preventDefault();

    const nextTouched = Object.keys(registerForm).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});

    setTouched(nextTouched);
    dispatch(clearRegisterError());

    if (Object.keys(registerErrors).length > 0) {
      return;
    }

    const payload = {
      email: registerForm.email.trim(),
      first_name: registerForm.first_name.trim(),
      last_name: registerForm.last_name.trim() || null,
      password: registerForm.password,
      password_confirm: registerForm.password_confirm,
    };

    const resultAction = await dispatch(registerUser(payload));

    if (registerUser.fulfilled.match(resultAction)) {
      onSuccess?.();
    }
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();

    setTouched({
      email: true,
      password: true,
    });
    dispatch(clearLoginError());

    if (Object.keys(loginErrors).length > 0) {
      return;
    }

    const resultAction = await dispatch(
      loginUser({
        email: loginForm.email,
        password: loginForm.password,
      }),
    );

    if (loginUser.fulfilled.match(resultAction)) {
      onSuccess?.();
    }
  }

  return (
    <div className="w-full max-w-[420px]">
      <div className="text-sm font-bold uppercase tracking-[0.2em] text-brand-500">
        {isRegisterMode ? "Регистрация" : "Вход"}
      </div>
      <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
        {isRegisterMode ? "Создать аккаунт" : "Войти в систему"}
      </h2>
      <p className="mt-3 text-base font-medium text-slate-500">
        {isRegisterMode
          ? "Заполните форму, и мы сразу создадим для вас учётную запись."
          : "Введите email и пароль, чтобы вернуться к рабочему столу."}
      </p>

      <div className="mt-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => switchMode("register")}
          className={`rounded-[14px] px-4 py-3 text-sm font-bold transition ${
            isRegisterMode
              ? "bg-white text-slate-950 shadow-sm"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Регистрация
        </button>
        <button
          type="button"
          onClick={() => switchMode("login")}
          className={`rounded-[14px] px-4 py-3 text-sm font-bold transition ${
            !isRegisterMode
              ? "bg-white text-slate-950 shadow-sm"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Вход
        </button>
      </div>

      <form
        className="mt-8 space-y-4"
        onSubmit={isRegisterMode ? handleRegisterSubmit : handleLoginSubmit}
      >
        {bannerMessage ? <Alert severity="warning">{bannerMessage}</Alert> : null}
        {submitError ? <Alert severity="error">{submitError}</Alert> : null}

        <TextField
          fullWidth
          label="Email"
          name="email"
          type="email"
          value={isRegisterMode ? registerForm.email : loginForm.email}
          onChange={isRegisterMode ? handleRegisterChange : handleLoginChange}
          onBlur={handleBlur}
          error={Boolean(touched.email && activeErrors.email)}
          helperText={touched.email && activeErrors.email ? activeErrors.email : " "}
        />

        {isRegisterMode ? (
          <>
            <TextField
              fullWidth
              label="Имя"
              name="first_name"
              value={registerForm.first_name}
              onChange={handleRegisterChange}
              onBlur={handleBlur}
              error={Boolean(touched.first_name && activeErrors.first_name)}
              helperText={
                touched.first_name && activeErrors.first_name
                  ? activeErrors.first_name
                  : " "
              }
            />

            <TextField
              fullWidth
              label="Фамилия"
              name="last_name"
              value={registerForm.last_name}
              onChange={handleRegisterChange}
              onBlur={handleBlur}
              helperText="Необязательно"
            />
          </>
        ) : null}

        <TextField
          fullWidth
          label="Пароль"
          name="password"
          type="password"
          value={isRegisterMode ? registerForm.password : loginForm.password}
          onChange={isRegisterMode ? handleRegisterChange : handleLoginChange}
          onBlur={handleBlur}
          error={Boolean(touched.password && activeErrors.password)}
          helperText={
            touched.password && activeErrors.password
              ? activeErrors.password
              : isRegisterMode
                ? "Минимум 8 символов, цифра и спецсимвол"
                : " "
          }
        />

        {isRegisterMode ? (
          <TextField
            fullWidth
            label="Подтверждение пароля"
            name="password_confirm"
            type="password"
            value={registerForm.password_confirm}
            onChange={handleRegisterChange}
            onBlur={handleBlur}
            error={Boolean(touched.password_confirm && activeErrors.password_confirm)}
            helperText={
              touched.password_confirm && activeErrors.password_confirm
                ? activeErrors.password_confirm
                : " "
            }
          />
        ) : null}

        <Button
          type="submit"
          variant="contained"
          disabled={isSubmitting}
          className="!mt-2 !h-13 !w-full !rounded-2xl !bg-brand-500 !text-sm !font-bold !normal-case !shadow-none hover:!bg-brand-600 disabled:!bg-slate-300"
        >
          {isRegisterMode
            ? isSubmitting
              ? "Создаём аккаунт..."
              : "Зарегистрироваться"
            : isSubmitting
              ? "Входим..."
              : "Войти"}
        </Button>
      </form>

      <div className="mt-6 text-sm font-medium text-slate-500">
        {isRegisterMode
          ? "После успешной регистрации вы сразу попадёте в приложение."
          : "Если сессия завершилась, можно быстро войти и продолжить работу."}
      </div>

      {showHomeLink ? (
        <div className={`text-sm font-semibold text-slate-600 ${compact ? "mt-3" : "mt-3"}`}>
          <Link to="/" className="text-brand-500 no-underline">
            Вернуться на главную
          </Link>
        </div>
      ) : null}
    </div>
  );
}
