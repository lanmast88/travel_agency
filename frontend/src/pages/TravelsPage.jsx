import {
  Alert,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Aside from "../features/components/Aside";
import {
  clearCreateTourState,
  createTour,
  fetchCities,
  fetchHotels,
  fetchTours,
  setTravelFilter,
  setTravelPage,
} from "../features/travel/travelSlice";
import { Autocomplete } from "@mui/material";

const seatToneMap = {
  success: "bg-emerald-500",
  warning: "bg-amber-400",
  danger: "bg-rose-500",
};

const statusToneMap = {
  hot: "bg-rose-50 text-rose-500",
  success: "bg-emerald-50 text-emerald-500",
  soon: "bg-blue-50 text-blue-500",
  neutral: "bg-slate-100 text-slate-500",
};

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5 text-slate-400"
      aria-hidden="true"
    >
      <path
        d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15a7.5 7.5 0 0 1 0 15z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5 text-slate-500"
      aria-hidden="true"
    >
      <path
        d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GlobeDot() {
  return (
    <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand-500" />
  );
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ru-RU").format(new Date(value));
}

function formatPrice(value) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatSeatsLabel(value) {
  const lastTwoDigits = value % 100;
  const lastDigit = value % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return `${value} мест`;
  }

  if (lastDigit === 1) {
    return `${value} место`;
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${value} места`;
  }

  return `${value} мест`;
}

function getSeatTone(value) {
  if (value <= 3) {
    return "danger";
  }

  if (value <= 10) {
    return "warning";
  }

  return "success";
}

function getStatusMeta(tour) {
  if (tour.is_hot) {
    return {
      label: "Горящая",
      tone: "hot",
      highlighted: true,
    };
  }

  if (tour.status === "active") {
    return {
      label: "Активна",
      tone: "success",
      highlighted: false,
    };
  }

  if (tour.status === "draft") {
    return {
      label: "Черновик",
      tone: "soon",
      highlighted: false,
    };
  }

  return {
    label: "Архив",
    tone: "neutral",
    highlighted: false,
  };
}

function getMealLabel(value) {
  if (value === "breakfast") {
    return "Завтраки";
  }

  if (value === "all") {
    return "Все включено";
  }

  return "Без питания";
}

const initialTourForm = {
  city_id: "",
  hotel_id: "",
  name: "",
  description: "",
  start_date: "",
  end_date: "",
  price: "",
  available: "",
  meal_type: "breakfast",
  status: "active",
};

function TravelsPage() {
  const dispatch = useDispatch();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [tourForm, setTourForm] = useState(initialTourForm);
  const [formTouched, setFormTouched] = useState({});
  const travel = useSelector((state) => state.travel);
  const [cityInput, setCityInput] = useState("");
  const [hotelInput, setHotelInput] = useState("");
  const {
    cities,
    citiesError,
    createError,
    createStatus,
    filters,
    hotels,
    hotelsError,
    items,
    page,
    pages,
    pageSize,
    total,
    toursError,
    toursStatus,
  } = travel;

  useEffect(() => {
    if (travel.citiesStatus === "idle") {
      dispatch(fetchCities());
    }
  }, [dispatch, travel.citiesStatus]);

  useEffect(() => {
    if (travel.hotelsStatus === "idle") {
      dispatch(fetchHotels());
    }
  }, [dispatch, travel.hotelsStatus]);

  useEffect(() => {
    dispatch(fetchTours());
  }, [
    dispatch,
    filters.cityId,
    filters.dateFrom,
    filters.dateTo,
    filters.priceFrom,
    filters.priceTo,
    filters.urgentOnly,
    page,
  ]);

  const cityMap = useMemo(
    () => Object.fromEntries(cities.map((city) => [city.id, city.name])),
    [cities],
  );

  const availableHotels = useMemo(() => {
    if (!tourForm.city_id) {
      return hotels;
    }

    return hotels.filter((hotel) => hotel.city.id === tourForm.city_id);
  }, [hotels, tourForm.city_id]);

  const visibleTours = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return items
      .map((tour) => {
        const statusMeta = getStatusMeta(tour);
        const cityName = cityMap[tour.city_id] ?? "Город загружается";

        return {
          ...tour,
          cityName,
          displayPrice: formatPrice(tour.price),
          displayStartDate: formatDate(tour.start_date),
          displayEndDate: formatDate(tour.end_date),
          seatsLabel: formatSeatsLabel(tour.available),
          seatsTone: getSeatTone(tour.available),
          services: [
            getMealLabel(tour.meal_type),
            `${tour.duration_nights} ноч.`,
          ],
          statusLabel: statusMeta.label,
          statusTone: statusMeta.tone,
          highlighted: statusMeta.highlighted,
        };
      })
      .filter((tour) => {
        if (!query) {
          return true;
        }

        return (
          tour.name.toLowerCase().includes(query) ||
          tour.cityName.toLowerCase().includes(query)
        );
      });
  }, [cityMap, filters.search, items]);

  const resultRange = useMemo(() => {
    if (total === 0 || visibleTours.length === 0) {
      return "Путёвки не найдены";
    }

    const start = (page - 1) * pageSize + 1;
    const end = start + visibleTours.length - 1;
    return `Показано ${start}-${end} из ${total} результатов`;
  }, [page, pageSize, total, visibleTours.length]);

  const pagination = useMemo(
    () => Array.from({ length: pages }, (_, index) => index + 1),
    [pages],
  );

  const formErrors = useMemo(() => {
    const errors = {};

    if (!tourForm.city_id) {
      errors.city_id = "Выберите город";
    }

    if (!tourForm.hotel_id) {
      errors.hotel_id = "Выберите отель";
    }

    if (!tourForm.name.trim()) {
      errors.name = "Введите название";
    }

    if (!tourForm.start_date) {
      errors.start_date = "Укажите дату начала";
    }

    if (!tourForm.end_date) {
      errors.end_date = "Укажите дату окончания";
    }

    if (
      tourForm.start_date &&
      tourForm.end_date &&
      tourForm.end_date <= tourForm.start_date
    ) {
      errors.end_date = "Дата окончания должна быть позже даты начала";
    }

    if (!tourForm.price || Number(tourForm.price) <= 0) {
      errors.price = "Цена должна быть больше 0";
    }

    if (tourForm.available === "" || Number(tourForm.available) < 0) {
      errors.available = "Количество мест не может быть отрицательным";
    }

    return errors;
  }, [tourForm]);

  function handleFilterChange(key, value) {
    dispatch(setTravelFilter({ key, value }));
  }

  function handlePageChange(nextPage) {
    if (nextPage < 1 || nextPage > pages || nextPage === page) {
      return;
    }

    dispatch(setTravelPage(nextPage));
  }

  function handleOpenCreateDialog() {
    dispatch(clearCreateTourState());
    setTourForm(initialTourForm);
    setFormTouched({});
    setCreateDialogOpen(true);
  }

  function handleCloseCreateDialog() {
    if (createStatus === "loading") {
      return;
    }

    dispatch(clearCreateTourState());
    setCreateDialogOpen(false);
    setTourForm(initialTourForm);
    setFormTouched({});
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    setTourForm((current) => {
      if (name === "city_id") {
        return {
          ...current,
          city_id: value,
          hotel_id: "",
        };
      }

      return {
        ...current,
        [name]: value,
      };
    });
  }

  function handleFormBlur(event) {
    const { name } = event.target;

    setFormTouched((current) => ({
      ...current,
      [name]: true,
    }));
  }

  async function handleCreateTour(event) {
    event.preventDefault();

    setFormTouched({
      city_id: true,
      hotel_id: true,
      name: true,
      start_date: true,
      end_date: true,
      price: true,
      available: true,
    });

    if (Object.keys(formErrors).length > 0) {
      return;
    }

    const resultAction = await dispatch(
      createTour({
        city_id: tourForm.city_id,
        hotel_id: tourForm.hotel_id,
        name: tourForm.name.trim(),
        description: tourForm.description.trim() || null,
        start_date: tourForm.start_date,
        end_date: tourForm.end_date,
        price: Number(tourForm.price),
        available: Number(tourForm.available),
        meal_type: tourForm.meal_type,
        status: tourForm.status,
      }),
    );

    if (createTour.fulfilled.match(resultAction)) {
      handleCloseCreateDialog();
      dispatch(fetchTours());
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
        <div className="flex min-h-[calc(100vh-2rem)] overflow-hidden rounded-[32px] border border-white/70 bg-white/75 shadow-panel backdrop-blur sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)]">
          <Aside />

          <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 lg:px-8">
            <header className="flex flex-col gap-4 border-b border-slate-200/80 px-6 py-6 xl:flex-row xl:items-center xl:justify-between lg:px-10">
              <div className="min-w-0 flex flex-col gap-4 xl:flex-row xl:items-center xl:flex-1">
                <h1 className="shrink-0 text-3xl font-extrabold tracking-tight text-slate-950">
                  Путёвки
                </h1>

                <label className="flex w-full max-w-[380px] min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm shadow-slate-200/40 xl:flex-1">
                  <SearchIcon />
                  <input
                    type="text"
                    placeholder="Поиск по названию, городу..."
                    value={filters.search}
                    onChange={(event) =>
                      handleFilterChange("search", event.target.value)
                    }
                    className="w-full bg-transparent text-base font-medium text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </label>
              </div>

              <Button
                variant="contained"
                onClick={handleOpenCreateDialog}
                className="!min-w-[168px] shrink-0 !rounded-2xl !bg-brand-500 !px-5 !py-3 !text-sm !font-bold !normal-case !shadow-none hover:!bg-brand-600"
              >
                <span className="mr-2 inline-flex">
                  <PlusIcon />
                </span>
                Добавить
              </Button>
            </header>

            <div className="space-y-6 px-6 py-7 lg:px-10 lg:py-8">
              <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm shadow-slate-200/60">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] md:grid-cols-2">
                  <div className="min-w-0 flex items-center gap-3">
                    <span className="shrink-0 text-sm font-bold text-slate-500">
                      Город
                    </span>
                    <select
                      value={filters.cityId}
                      onChange={(event) =>
                        handleFilterChange("cityId", event.target.value)
                      }
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-700 outline-none"
                    >
                      <option value="">Все города</option>
                      {cities.map((city) => (
                        <option key={city.id} value={city.id}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="min-w-0 flex items-center gap-3">
                    <span className="shrink-0 text-sm font-bold text-slate-500">
                      Дата c
                    </span>
                    <label className="flex h-12 w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4">
                      <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(event) =>
                          handleFilterChange("dateFrom", event.target.value)
                        }
                        className="w-full bg-transparent text-base font-semibold text-slate-700 outline-none"
                      />
                      <CalendarIcon />
                    </label>
                  </div>

                  <div className="min-w-0 flex items-center gap-3">
                    <span className="shrink-0 text-sm font-bold text-slate-500">
                      по
                    </span>
                    <label className="flex h-12 w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4">
                      <input
                        type="date"
                        value={filters.dateTo}
                        onChange={(event) =>
                          handleFilterChange("dateTo", event.target.value)
                        }
                        className="w-full bg-transparent text-base font-semibold text-slate-700 outline-none"
                      />
                      <CalendarIcon />
                    </label>
                  </div>

                  <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                    <span className="text-sm font-bold text-slate-500">
                      Цена от
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={filters.priceFrom}
                      onChange={(event) =>
                        handleFilterChange("priceFrom", event.target.value)
                      }
                      placeholder="0"
                      className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-700 outline-none"
                    />
                    <span className="text-sm font-bold text-slate-500">до</span>
                    <input
                      type="number"
                      min="0"
                      value={filters.priceTo}
                      onChange={(event) =>
                        handleFilterChange("priceTo", event.target.value)
                      }
                      placeholder="300000"
                      className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-700 outline-none"
                    />
                  </div>

                  <label className="flex items-center justify-start gap-2 border-l border-slate-200 pl-4 text-base font-bold text-slate-700">
                    <Checkbox
                      checked={filters.urgentOnly}
                      onChange={(event) =>
                        handleFilterChange("urgentOnly", event.target.checked)
                      }
                    />
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      Только горячие <span>🔥</span>
                    </span>
                  </label>
                </div>
              </section>

              <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
                <div className="border-b border-slate-200 px-6 py-5">
                  <div className="text-2xl font-extrabold tracking-tight">
                    Все путёвки
                  </div>
                </div>

                {toursError || citiesError || hotelsError ? (
                  <div className="px-6 py-5">
                    <Alert severity="error">
                      {toursError ?? citiesError ?? hotelsError}
                    </Alert>
                  </div>
                ) : null}

                <div className="overflow-hidden">
                  <table className="w-full table-fixed border-collapse">
                    <colgroup>
                      <col className="w-[20%]" />
                      <col className="w-[14%]" />
                      <col className="w-[12%]" />
                      <col className="w-[12%]" />
                      <col className="w-[10%]" />
                      <col className="w-[11%]" />
                      <col className="w-[13%]" />
                      <col className="w-[8%]" />
                    </colgroup>
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs uppercase tracking-[0.1em] text-slate-400">
                        <th className="px-5 py-4">Название</th>
                        <th className="px-5 py-4">Город</th>
                        <th className="px-5 py-4">Начало</th>
                        <th className="px-5 py-4">Конец</th>
                        <th className="px-5 py-4">Цена</th>
                        <th className="px-5 py-4">В наличии</th>
                        <th className="px-5 py-4">Услуги</th>
                        <th className="px-5 py-4">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleTours.map((tour) => (
                        <tr
                          key={tour.id}
                          className={`border-t border-slate-100 align-top transition ${
                            tour.highlighted ? "bg-amber-50/80" : "bg-white"
                          }`}
                        >
                          <td className="px-5 py-5 text-base font-extrabold leading-tight text-slate-900">
                            {tour.name}
                          </td>
                          <td className="px-5 py-5">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                              <GlobeDot />
                              <span>{tour.cityName}</span>
                            </div>
                          </td>
                          <td className="px-5 py-5 text-sm font-semibold text-slate-700">
                            {tour.displayStartDate}
                          </td>
                          <td className="px-5 py-5 text-sm font-semibold text-slate-700">
                            {tour.displayEndDate}
                          </td>
                          <td className="px-5 py-5 text-base font-black text-slate-900">
                            {tour.displayPrice}
                          </td>
                          <td className="px-5 py-5">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                              <span
                                className={`h-3 w-3 rounded-full ${seatToneMap[tour.seatsTone]}`}
                              />
                              <span>{tour.seatsLabel}</span>
                            </div>
                          </td>
                          <td className="px-5 py-5">
                            <div className="flex flex-wrap gap-1.5">
                              {tour.services.map((service) => (
                                <span
                                  key={service}
                                  className="rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700"
                                >
                                  {service}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-0 py-5">
                            <span
                              className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ${statusToneMap[tour.statusTone]}`}
                            >
                              {tour.statusTone === "hot" ? "🔥 " : ""}
                              {tour.statusTone === "success" ? "✓ " : ""}
                              {tour.statusTone === "soon" ? "◔ " : ""}
                              {tour.statusTone === "neutral" ? "◉ " : ""}
                              {tour.statusLabel}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {visibleTours.length === 0 &&
                      toursStatus !== "loading" ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-5 py-10 text-center text-base font-semibold text-slate-500"
                          >
                            По текущим фильтрам ничего не найдено.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-lg font-medium text-slate-500">
                    {toursStatus === "loading" ? (
                      <span className="inline-flex items-center gap-2">
                        <CircularProgress size={18} />
                        Загружаем путёвки...
                      </span>
                    ) : (
                      resultRange
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1}
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-xl font-bold text-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ‹
                    </button>
                    {pagination.map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => handlePageChange(pageNumber)}
                        className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold ${
                          pageNumber === page
                            ? "bg-brand-500 text-white"
                            : "border border-slate-200 text-slate-700"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= pages}
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-xl font-bold text-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ›
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>

      <Dialog
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        fullWidth
        maxWidth="md"
        PaperProps={{
          className:
            "!rounded-[32px] !bg-white/95 !shadow-2xl backdrop-blur supports-[backdrop-filter]:!bg-white/90",
        }}
      >
        <DialogTitle className="!px-6 !pt-6 !text-2xl !font-extrabold !tracking-tight !text-slate-950 sm:!px-8">
          Добавить путёвку
        </DialogTitle>
        <DialogContent className="!px-6 !pb-7 !pt-4 sm:!px-8">
          <form className="space-y-4" onSubmit={handleCreateTour}>
            {createError ? <Alert severity="error">{createError}</Alert> : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Autocomplete
                freeSolo
                options={cities}
                getOptionLabel={(option) =>
                  typeof option === "string" ? option : option.name
                }
                value={cities.find((c) => c.id === tourForm.city_id) || null}
                inputValue={cityInput}
                onInputChange={(e, newInput) => {
                  setCityInput(newInput);
                }}
                onChange={(e, newValue) => {
                  if (typeof newValue === "string") {
                    setCityInput(newValue);
                    setTourForm((prev) => ({
                      ...prev,
                      city_id: "",
                    }));
                  } else if (newValue) {
                    setCityInput(newValue.name);
                    setTourForm((prev) => ({
                      ...prev,
                      city_id: newValue.id,
                      hotel_id: "",
                    }));
                  } else {
                    setCityInput("");
                    setTourForm((prev) => ({
                      ...prev,
                      city_id: "",
                    }));
                  }
                }}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Город" />
                )}
              />

              <Autocomplete
                freeSolo
                options={availableHotels}
                getOptionLabel={(option) =>
                  typeof option === "string"
                    ? option
                    : `${option.name} • ${option.stars}★`
                }
                value={
                  availableHotels.find((h) => h.id === tourForm.hotel_id) ||
                  null
                }
                inputValue={hotelInput}
                onInputChange={(e, newInput) => {
                  setHotelInput(newInput);
                }}
                onChange={(e, newValue) => {
                  if (typeof newValue === "string") {
                    setHotelInput(newValue);
                    setTourForm((prev) => ({
                      ...prev,
                      hotel_id: "",
                    }));
                  } else if (newValue) {
                    setHotelInput(newValue.name);
                    setTourForm((prev) => ({
                      ...prev,
                      hotel_id: newValue.id,
                    }));
                  } else {
                    setHotelInput("");
                    setTourForm((prev) => ({
                      ...prev,
                      hotel_id: "",
                    }));
                  }
                }}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Отель" />
                )}
              />
            </div>

            <TextField
              fullWidth
              label="Название тура"
              name="name"
              value={tourForm.name}
              onChange={handleFormChange}
              onBlur={handleFormBlur}
              error={Boolean(formTouched.name && formErrors.name)}
              helperText={
                formTouched.name && formErrors.name ? formErrors.name : " "
              }
            />

            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Описание"
              name="description"
              value={tourForm.description}
              onChange={handleFormChange}
              helperText="Необязательно"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                fullWidth
                type="date"
                name="start_date"
                value={tourForm.start_date}
                onChange={handleFormChange}
                onBlur={handleFormBlur}
                error={Boolean(formTouched.start_date && formErrors.start_date)}
                helperText={
                  formTouched.start_date && formErrors.start_date
                    ? formErrors.start_date
                    : " "
                }
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                fullWidth
                type="date"
                name="end_date"
                value={tourForm.end_date}
                onChange={handleFormChange}
                onBlur={handleFormBlur}
                error={Boolean(formTouched.end_date && formErrors.end_date)}
                helperText={
                  formTouched.end_date && formErrors.end_date
                    ? formErrors.end_date
                    : " "
                }
                InputLabelProps={{ shrink: true }}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <TextField
                fullWidth
                type="number"
                label="Цена"
                name="price"
                value={tourForm.price}
                onChange={handleFormChange}
                onBlur={handleFormBlur}
                error={Boolean(formTouched.price && formErrors.price)}
                helperText={
                  formTouched.price && formErrors.price ? formErrors.price : " "
                }
              />

              <TextField
                fullWidth
                type="number"
                label="Мест"
                name="available"
                value={tourForm.available}
                onChange={handleFormChange}
                onBlur={handleFormBlur}
                error={Boolean(formTouched.available && formErrors.available)}
                helperText={
                  formTouched.available && formErrors.available
                    ? formErrors.available
                    : " "
                }
              />

              <TextField
                select
                fullWidth
                label="Питание"
                name="meal_type"
                value={tourForm.meal_type}
                onChange={handleFormChange}
              >
                <MenuItem value="none">Без питания</MenuItem>
                <MenuItem value="breakfast">Завтраки</MenuItem>
                <MenuItem value="all">Все включено</MenuItem>
              </TextField>

              <TextField
                select
                fullWidth
                label="Статус"
                name="status"
                value={tourForm.status}
                onChange={handleFormChange}
              >
                <MenuItem value="draft">Черновик</MenuItem>
                <MenuItem value="active">Активна</MenuItem>
                <MenuItem value="archived">Архив</MenuItem>
              </TextField>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outlined"
                onClick={handleCloseCreateDialog}
                disabled={createStatus === "loading"}
                className="!rounded-2xl !border-slate-200 !px-6 !py-3 !text-sm !font-bold !normal-case !text-slate-700"
              >
                Отмена
              </Button>

              <Button
                type="submit"
                variant="contained"
                disabled={createStatus === "loading"}
                className="!rounded-2xl !bg-brand-500 !px-6 !py-3 !text-sm !font-bold !normal-case !shadow-none hover:!bg-brand-600"
              >
                {createStatus === "loading" ? "Создаём..." : "Создать путёвку"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TravelsPage;
