import {
  Alert,
  Autocomplete,
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
import { useNavigate } from "react-router-dom";
import Aside from "../features/components/Aside";
import {
  clearCreateTourState,
  clearDeleteTourState,
  clearUpdateTourState,
  createTour,
  deleteTour,
  fetchCities,
  fetchHotels,
  fetchTours,
  setTravelFilter,
  setTravelPage,
  updateTour,
} from "../features/travel/travelSlice";
import { CalendarIcon, EditIcon, PlusIcon, SearchIcon, TrashIcon } from "../shared/ui/Icons";
import { formatDate, formatMoney, formatSeatsLabel } from "../shared/lib/format";
import { Pagination } from "../shared/ui/Pagination";

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

function GlobeDot() {
  return (
    <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand-500" />
  );
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
  const navigate = useNavigate();
  const currentUser = useSelector((state) => state.auth.currentUser);
  const isStaff = currentUser?.role === "employee" || currentUser?.role === "admin";
  const isAdmin = currentUser?.role === "admin";

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [tourForm, setTourForm] = useState(initialTourForm);
  const [formTouched, setFormTouched] = useState({});

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTourId, setEditingTourId] = useState(null);
  const [editForm, setEditForm] = useState(initialTourForm);
  const [editFormTouched, setEditFormTouched] = useState({});

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTour, setDeletingTour] = useState(null);

  const travel = useSelector((state) => state.travel);
  const {
    cities,
    citiesError,
    createError,
    createStatus,
    updateStatus,
    updateError,
    deleteStatus,
    deleteError,
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
    if (!tourForm.city_id) return hotels;
    return hotels.filter((hotel) => hotel.city.id === tourForm.city_id);
  }, [hotels, tourForm.city_id]);

  const availableEditHotels = useMemo(() => {
    if (!editForm.city_id) return hotels;
    return hotels.filter((hotel) => hotel.city.id === editForm.city_id);
  }, [hotels, editForm.city_id]);

  const editFormErrors = useMemo(() => {
    const errors = {};
    if (!editForm.city_id) errors.city_id = "Выберите город";
    if (!editForm.hotel_id) errors.hotel_id = "Выберите отель";
    if (!editForm.name.trim()) errors.name = "Введите название";
    if (!editForm.start_date) errors.start_date = "Укажите дату начала";
    if (!editForm.end_date) errors.end_date = "Укажите дату окончания";
    if (editForm.start_date && editForm.end_date && editForm.end_date <= editForm.start_date) {
      errors.end_date = "Дата окончания должна быть позже даты начала";
    }
    if (!editForm.price || Number(editForm.price) <= 0) errors.price = "Цена должна быть больше 0";
    if (editForm.available === "" || Number(editForm.available) < 0) {
      errors.available = "Количество мест не может быть отрицательным";
    }
    return errors;
  }, [editForm]);

  const visibleTours = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return items
      .map((tour) => {
        const statusMeta = getStatusMeta(tour);
        const cityName = cityMap[tour.city_id] ?? "Город загружается";

        return {
          ...tour,
          cityName,
          displayPrice: formatMoney(tour.price),
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
    } else if (tourForm.start_date < new Date().toISOString().split("T")[0]) {
      errors.start_date = "Дата начала не может быть в прошлом";
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

  function handleOpenEditDialog(tour) {
    dispatch(clearUpdateTourState());
    setEditForm({
      city_id: tour.city_id,
      hotel_id: tour.hotel_id,
      name: tour.name,
      description: "",
      start_date: tour.start_date,
      end_date: tour.end_date,
      price: String(tour.price),
      available: String(tour.available),
      meal_type: tour.meal_type,
      status: tour.status,
    });
    setEditFormTouched({});
    setEditingTourId(tour.id);
    setEditDialogOpen(true);
  }

  function handleCloseEditDialog() {
    if (updateStatus === "loading") return;
    dispatch(clearUpdateTourState());
    setEditDialogOpen(false);
    setEditingTourId(null);
  }

  function handleEditFormChange(event) {
    const { name, value } = event.target;
    setEditForm((current) => {
      if (name === "city_id") return { ...current, city_id: value, hotel_id: "" };
      return { ...current, [name]: value };
    });
  }

  function handleEditFormBlur(event) {
    const { name } = event.target;
    setEditFormTouched((current) => ({ ...current, [name]: true }));
  }

  async function handleEditTour() {
    setEditFormTouched({
      city_id: true, hotel_id: true, name: true,
      start_date: true, end_date: true, price: true, available: true,
    });
    if (Object.keys(editFormErrors).length > 0) return;

    const resultAction = await dispatch(
      updateTour({
        id: editingTourId,
        city_id: editForm.city_id,
        hotel_id: editForm.hotel_id,
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        start_date: editForm.start_date,
        end_date: editForm.end_date,
        price: Number(editForm.price),
        available: Number(editForm.available),
        meal_type: editForm.meal_type,
        status: editForm.status,
      }),
    );

    if (updateTour.fulfilled.match(resultAction)) {
      handleCloseEditDialog();
    }
  }

  function handleOpenDeleteDialog(tour) {
    dispatch(clearDeleteTourState());
    setDeletingTour({ id: tour.id, name: tour.name });
    setDeleteDialogOpen(true);
  }

  function handleCloseDeleteDialog() {
    if (deleteStatus === "loading") return;
    dispatch(clearDeleteTourState());
    setDeleteDialogOpen(false);
    setDeletingTour(null);
  }

  async function handleDeleteTour() {
    if (!deletingTour) return;
    const resultAction = await dispatch(deleteTour(deletingTour.id));
    if (deleteTour.fulfilled.match(resultAction)) {
      handleCloseDeleteDialog();
    }
  }

  async function handleCreateTour() {
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
                  <SearchIcon className="text-slate-400" />
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
                      <CalendarIcon className="text-slate-500" />
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
                      <CalendarIcon className="text-slate-500" />
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
                      <col className="w-[18%]" />
                      <col className="w-[12%]" />
                      <col className="w-[10%]" />
                      <col className="w-[10%]" />
                      <col className="w-[10%]" />
                      <col className="w-[10%]" />
                      <col className="w-[12%]" />
                      <col className="w-[9%]" />
                      <col className="w-[9%]" />
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
                        <th className="px-5 py-4"></th>
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
                            <button
                              type="button"
                              onClick={() => navigate(`/travels/${tour.id}`)}
                              className="text-left hover:text-brand-600 hover:underline transition-colors"
                            >
                              {tour.name}
                            </button>
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
                          <td className="px-3 py-5">
                            <div className="flex items-center gap-1">
                              {isStaff && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditDialog(tour)}
                                  className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
                                  title="Редактировать"
                                >
                                  <EditIcon size={16} />
                                </button>
                              )}
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenDeleteDialog(tour)}
                                  className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                                  title="Удалить"
                                >
                                  <TrashIcon size={16} />
                                </button>
                              )}
                            </div>
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

                  <Pagination page={page} pages={pages} onPageChange={handlePageChange} />
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>

      {/* Диалог редактирования */}
      <Dialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        fullWidth
        maxWidth="md"
        PaperProps={{
          className:
            "!rounded-[32px] !bg-white/95 !shadow-2xl backdrop-blur supports-[backdrop-filter]:!bg-white/90",
        }}
      >
        <DialogTitle className="!px-6 !pt-6 !text-2xl !font-extrabold !tracking-tight !text-slate-950 sm:!px-8">
          Редактировать путёвку
        </DialogTitle>
        <DialogContent className="!px-6 !pb-7 !pt-4 sm:!px-8">
          <div className="space-y-4">
            {updateError ? <Alert severity="error">{updateError}</Alert> : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Autocomplete
                options={cities}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={cities.find((c) => c.id === editForm.city_id) || null}
                onChange={(e, newValue) => {
                  setEditForm((prev) => ({
                    ...prev,
                    city_id: newValue ? newValue.id : "",
                    hotel_id: "",
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Город"
                    error={Boolean(editFormTouched.city_id && editFormErrors.city_id)}
                    helperText={editFormTouched.city_id && editFormErrors.city_id ? editFormErrors.city_id : " "}
                  />
                )}
              />
              <Autocomplete
                options={availableEditHotels}
                getOptionLabel={(option) => `${option.name} • ${option.stars}★`}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={availableEditHotels.find((h) => h.id === editForm.hotel_id) || null}
                onChange={(e, newValue) => {
                  setEditForm((prev) => ({ ...prev, hotel_id: newValue ? newValue.id : "" }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Отель"
                    error={Boolean(editFormTouched.hotel_id && editFormErrors.hotel_id)}
                    helperText={editFormTouched.hotel_id && editFormErrors.hotel_id ? editFormErrors.hotel_id : " "}
                  />
                )}
              />
            </div>

            <TextField
              fullWidth
              label="Название тура"
              name="name"
              value={editForm.name}
              onChange={handleEditFormChange}
              onBlur={handleEditFormBlur}
              error={Boolean(editFormTouched.name && editFormErrors.name)}
              helperText={editFormTouched.name && editFormErrors.name ? editFormErrors.name : " "}
            />

            <TextField
              fullWidth
              multiline
              minRows={3}
              label={<span>Описание <span style={{ fontSize: '0.82em', fontWeight: 400, opacity: 0.7 }}>· Необязательно</span></span>}
              name="description"
              value={editForm.description}
              onChange={handleEditFormChange}
              slotProps={{ inputLabel: { shrink: true } }}
              helperText=" "
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                fullWidth
                type="date"
                label="Дата начала"
                name="start_date"
                value={editForm.start_date}
                onChange={handleEditFormChange}
                onBlur={handleEditFormBlur}
                error={Boolean(editFormTouched.start_date && editFormErrors.start_date)}
                helperText={editFormTouched.start_date && editFormErrors.start_date ? editFormErrors.start_date : " "}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                fullWidth
                type="date"
                label="Дата окончания"
                name="end_date"
                value={editForm.end_date}
                onChange={handleEditFormChange}
                onBlur={handleEditFormBlur}
                error={Boolean(editFormTouched.end_date && editFormErrors.end_date)}
                helperText={editFormTouched.end_date && editFormErrors.end_date ? editFormErrors.end_date : " "}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <TextField
                fullWidth
                type="number"
                label="Цена"
                name="price"
                value={editForm.price}
                onChange={handleEditFormChange}
                onBlur={handleEditFormBlur}
                error={Boolean(editFormTouched.price && editFormErrors.price)}
                helperText={editFormTouched.price && editFormErrors.price ? editFormErrors.price : " "}
              />
              <TextField
                fullWidth
                type="number"
                label="Мест"
                name="available"
                value={editForm.available}
                onChange={handleEditFormChange}
                onBlur={handleEditFormBlur}
                error={Boolean(editFormTouched.available && editFormErrors.available)}
                helperText={editFormTouched.available && editFormErrors.available ? editFormErrors.available : " "}
              />
              <TextField
                select
                fullWidth
                label="Питание"
                name="meal_type"
                value={editForm.meal_type}
                onChange={handleEditFormChange}
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
                value={editForm.status}
                onChange={handleEditFormChange}
              >
                <MenuItem value="draft">Черновик</MenuItem>
                <MenuItem value="active">Активна</MenuItem>
                <MenuItem value="archived">Архив</MenuItem>
              </TextField>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <Button
                variant="outlined"
                onClick={handleCloseEditDialog}
                disabled={updateStatus === "loading"}
                className="!rounded-2xl !border-slate-200 !px-6 !py-3 !text-sm !font-bold !normal-case !text-slate-700"
              >
                Отмена
              </Button>
              <Button
                variant="contained"
                onClick={handleEditTour}
                disabled={updateStatus === "loading"}
                className="!rounded-2xl !bg-brand-500 !px-6 !py-3 !text-sm !font-bold !normal-case !shadow-none hover:!bg-brand-600"
              >
                {updateStatus === "loading" ? "Сохраняем..." : "Сохранить"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог подтверждения удаления */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          className: "!rounded-[28px] !bg-white !shadow-2xl",
        }}
      >
        <DialogTitle className="!px-6 !pt-6 !text-xl !font-extrabold !tracking-tight !text-slate-950">
          Удалить путёвку?
        </DialogTitle>
        <DialogContent className="!px-6 !pb-6 !pt-2">
          <div className="space-y-5">
            {deleteError ? <Alert severity="error">{deleteError}</Alert> : null}
            <p className="text-sm font-medium text-slate-600">
              Путёвка{" "}
              <span className="font-bold text-slate-900">«{deletingTour?.name}»</span>{" "}
              будет удалена безвозвратно.
            </p>
            <div className="flex gap-3 sm:justify-end">
              <Button
                variant="outlined"
                onClick={handleCloseDeleteDialog}
                disabled={deleteStatus === "loading"}
                className="!rounded-2xl !border-slate-200 !px-5 !py-2.5 !text-sm !font-bold !normal-case !text-slate-700"
              >
                Отмена
              </Button>
              <Button
                variant="contained"
                onClick={handleDeleteTour}
                disabled={deleteStatus === "loading"}
                className="!rounded-2xl !bg-rose-500 !px-5 !py-2.5 !text-sm !font-bold !normal-case !shadow-none hover:!bg-rose-600"
              >
                {deleteStatus === "loading" ? "Удаляем..." : "Удалить"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
          <div className="space-y-4">
            {createError ? <Alert severity="error">{createError}</Alert> : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Autocomplete
                options={cities}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={cities.find((c) => c.id === tourForm.city_id) || null}
                onChange={(e, newValue) => {
                  setTourForm((prev) => ({
                    ...prev,
                    city_id: newValue ? newValue.id : "",
                    hotel_id: "",
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Город"
                    error={Boolean(formTouched.city_id && formErrors.city_id)}
                    helperText={
                      formTouched.city_id && formErrors.city_id
                        ? formErrors.city_id
                        : " "
                    }
                  />
                )}
              />

              <Autocomplete
                options={availableHotels}
                getOptionLabel={(option) => `${option.name} • ${option.stars}★`}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={
                  availableHotels.find((h) => h.id === tourForm.hotel_id) ||
                  null
                }
                onChange={(e, newValue) => {
                  setTourForm((prev) => ({
                    ...prev,
                    hotel_id: newValue ? newValue.id : "",
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Отель"
                    error={Boolean(formTouched.hotel_id && formErrors.hotel_id)}
                    helperText={
                      formTouched.hotel_id && formErrors.hotel_id
                        ? formErrors.hotel_id
                        : " "
                    }
                  />
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
              label={<span>Описание <span style={{ fontSize: '0.82em', fontWeight: 400, opacity: 0.7 }}>· Необязательно</span></span>}
              name="description"
              value={tourForm.description}
              onChange={handleFormChange}
              slotProps={{ inputLabel: { shrink: true } }}
              helperText=" "
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                fullWidth
                type="date"
                label="Дата начала"
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
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: new Date().toISOString().split("T")[0] } }}
              />

              <TextField
                fullWidth
                type="date"
                label="Дата окончания"
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
                slotProps={{ inputLabel: { shrink: true } }}
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
                type="button"
                variant="contained"
                onClick={handleCreateTour}
                disabled={createStatus === "loading"}
                className="!rounded-2xl !bg-brand-500 !px-6 !py-3 !text-sm !font-bold !normal-case !shadow-none hover:!bg-brand-600"
              >
                {createStatus === "loading" ? "Создаём..." : "Создать путёвку"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TravelsPage;
