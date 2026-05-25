import {
  Alert,
  Autocomplete,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  MenuItem,
  Tab,
  Tabs,
  TextField,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Aside from "../features/components/Aside";
import { http } from "../shared/api/http";
import {
  clearCreateCityState,
  clearCreateHotelState,
  clearDeleteCityState,
  clearDeleteHotelState,
  clearUpdateCityState,
  clearUpdateHotelState,
  createCity,
  createHotel,
  deleteCity,
  deleteHotel,
  fetchCatalogCities,
  fetchCatalogHotels,
  setCitiesPage,
  setHotelsFilterCityId,
  setHotelsPage,
  updateCity,
  updateHotel,
} from "../features/catalog/catalogSlice";
import { fetchCities } from "../features/travel/travelSlice";
import { EditIcon, PlusIcon, TrashIcon, ViewIcon } from "../shared/ui/Icons";
import { Pagination } from "../shared/ui/Pagination";

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <span className="text-sm font-semibold text-slate-800">
        {value ?? "—"}
      </span>
    </div>
  );
}

function Stars({ count }) {
  return (
    <span className="text-amber-400">
      {"★".repeat(count)}
      <span className="text-slate-200">{"★".repeat(5 - count)}</span>
    </span>
  );
}

function DeleteDialog({
  open,
  name,
  entity,
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
        Удалить {entity}?
      </DialogTitle>
      <DialogContent className="!px-6 !pb-6 !pt-2">
        <div className="space-y-5">
          {error ? <Alert severity="error">{error}</Alert> : null}
          <p className="text-sm font-medium text-slate-600">
            {entity === "город" ? "Город" : "Отель"}{" "}
            <span className="font-bold text-slate-900">«{name}»</span> будет
            удалён безвозвратно.
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
function CityFormFields({ form, touched, errors, onChange, onBlur }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          fullWidth
          label="Название"
          name="name"
          value={form.name}
          onChange={onChange}
          onBlur={onBlur}
          error={Boolean(touched.name && errors.name)}
          helperText={touched.name && errors.name ? errors.name : " "}
        />
        <TextField
          fullWidth
          label="Страна"
          name="country"
          value={form.country}
          onChange={onChange}
          onBlur={onBlur}
          error={Boolean(touched.country && errors.country)}
          helperText={touched.country && errors.country ? errors.country : " "}
        />
      </div>
      <TextField
        fullWidth
        label="Климат"
        name="climate"
        value={form.climate}
        onChange={onChange}
        helperText="Необязательно"
      />
      <TextField
        fullWidth
        multiline
        minRows={3}
        label={<span>Описание <span style={{ fontSize: '0.82em', fontWeight: 400, opacity: 0.7 }}>· Необязательно</span></span>}
        name="description"
        value={form.description}
        onChange={onChange}
        slotProps={{ inputLabel: { shrink: true } }}
        helperText=" "
      />
    </div>
  );
}

const initialCityForm = { name: "", country: "", climate: "", description: "" };

function validateCityForm(f) {
  const e = {};
  if (!f.name.trim()) e.name = "Введите название";
  if (!f.country.trim()) e.country = "Введите страну";
  return e;
}

function CitiesTab({ isStaff, isAdmin }) {
  const dispatch = useDispatch();
  const {
    cities,
    citiesTotal,
    citiesPage,
    citiesPages,
    citiesStatus,
    citiesError,
    createCityStatus,
    createCityError,
    updateCityStatus,
    updateCityError,
    deleteCityStatus,
    deleteCityError,
  } = useSelector((s) => s.catalog);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewCity, setViewCity] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(initialCityForm);
  const [createTouched, setCreateTouched] = useState({});

  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(initialCityForm);
  const [editTouched, setEditTouched] = useState({});

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingCity, setDeletingCity] = useState(null);

  useEffect(() => {
    dispatch(fetchCatalogCities(citiesPage));
  }, [dispatch, citiesPage]);

  function openView(city) {
    setViewCity(null);
    setViewError(null);
    setViewOpen(true);
    setViewLoading(true);
    http
      .get(`/v1/cities/${city.id}`)
      .then(({ data }) => setViewCity(data))
      .catch(() => setViewError("Не удалось загрузить данные города."))
      .finally(() => setViewLoading(false));
  }
  function closeView() {
    setViewOpen(false);
  }

  const createErrors = useMemo(
    () => validateCityForm(createForm),
    [createForm],
  );
  const editErrors = useMemo(() => validateCityForm(editForm), [editForm]);

  function handlePageChange(p) {
    if (p < 1 || p > citiesPages || p === citiesPage) return;
    dispatch(setCitiesPage(p));
  }

  // Create
  function openCreate() {
    dispatch(clearCreateCityState());
    setCreateForm(initialCityForm);
    setCreateTouched({});
    setCreateOpen(true);
  }
  function closeCreate() {
    if (createCityStatus === "loading") return;
    dispatch(clearCreateCityState());
    setCreateOpen(false);
  }
  async function handleCreate() {
    setCreateTouched({ name: true, country: true });
    if (Object.keys(createErrors).length > 0) return;
    const result = await dispatch(
      createCity({
        name: createForm.name.trim(),
        country: createForm.country.trim(),
        climate: createForm.climate.trim() || null,
        description: createForm.description.trim() || null,
      }),
    );
    if (createCity.fulfilled.match(result)) closeCreate();
  }

  // Edit
  function openEdit(city) {
    dispatch(clearUpdateCityState());
    setEditForm({
      name: city.name,
      country: city.country,
      climate: city.climate ?? "",
      description: city.description ?? "",
    });
    setEditTouched({});
    setEditingId(city.id);
    setEditOpen(true);
  }
  function closeEdit() {
    if (updateCityStatus === "loading") return;
    dispatch(clearUpdateCityState());
    setEditOpen(false);
  }
  async function handleEdit() {
    setEditTouched({ name: true, country: true });
    if (Object.keys(editErrors).length > 0) return;
    const result = await dispatch(
      updateCity({
        id: editingId,
        name: editForm.name.trim(),
        country: editForm.country.trim(),
        climate: editForm.climate.trim() || null,
        description: editForm.description.trim() || null,
      }),
    );
    if (updateCity.fulfilled.match(result)) closeEdit();
  }

  // Delete
  function openDelete(city) {
    dispatch(clearDeleteCityState());
    setDeletingCity({ id: city.id, name: city.name });
    setDeleteOpen(true);
  }
  function closeDelete() {
    if (deleteCityStatus === "loading") return;
    dispatch(clearDeleteCityState());
    setDeleteOpen(false);
  }
  async function handleDelete() {
    if (!deletingCity) return;
    const result = await dispatch(deleteCity(deletingCity.id));
    if (deleteCity.fulfilled.match(result)) closeDelete();
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div className="text-2xl font-extrabold tracking-tight">Города</div>
        {isStaff && (
          <Button
            variant="contained"
            onClick={openCreate}
            className="!rounded-2xl !bg-brand-500 !px-5 !py-2.5 !text-sm !font-bold !normal-case !shadow-none hover:!bg-brand-600"
          >
            <span className="mr-2 inline-flex">
              <PlusIcon />
            </span>
            Добавить
          </Button>
        )}
      </div>

      {citiesError && (
        <div className="px-6 py-4">
          <Alert severity="error">{citiesError}</Alert>
        </div>
      )}

      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-[22%]" />
          <col className="w-[18%]" />
          <col className="w-[15%]" />
          <col className="w-[30%]" />
          <col className="w-[15%]" />
        </colgroup>
        <thead className="bg-slate-50">
          <tr className="text-left text-xs uppercase tracking-[0.1em] text-slate-400">
            <th className="px-5 py-4">Название</th>
            <th className="px-5 py-4">Страна</th>
            <th className="px-5 py-4">Климат</th>
            <th className="px-5 py-4">Описание</th>
            <th className="px-5 py-4"></th>
          </tr>
        </thead>
        <tbody>
          {cities.map((city) => (
            <tr
              key={city.id}
              className="border-t border-slate-100 align-middle"
            >
              <td className="px-5 py-4 text-sm font-bold text-slate-900">
                {city.name}
              </td>
              <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                {city.country}
              </td>
              <td className="px-5 py-4 text-sm text-slate-600">
                {city.climate ?? "—"}
              </td>
              <td className="px-5 py-4 text-sm text-slate-500">
                <span className="line-clamp-2">{city.description ?? "—"}</span>
              </td>
              <td className="px-3 py-4">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openView(city)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-sky-50 hover:text-sky-600"
                    title="Просмотреть"
                  >
                    <ViewIcon size={16} />
                  </button>
                  {isStaff && (
                    <button
                      type="button"
                      onClick={() => openEdit(city)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
                      title="Редактировать"
                    >
                      <EditIcon size={16} />
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => openDelete(city)}
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
          {cities.length === 0 && citiesStatus !== "loading" && (
            <tr>
              <td
                colSpan={5}
                className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
              >
                Города не найдены.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
        <div className="text-sm font-medium text-slate-500">
          {citiesStatus === "loading" ? (
            <span className="inline-flex items-center gap-2">
              <CircularProgress size={16} />
              Загружаем...
            </span>
          ) : (
            `Всего: ${citiesTotal}`
          )}
        </div>
        <Pagination
          page={citiesPage}
          pages={citiesPages}
          onPageChange={handlePageChange}
        />
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
          Добавить город
        </DialogTitle>
        <DialogContent className="!px-6 !pb-7 !pt-4">
          <div className="space-y-4">
            {createCityError && (
              <Alert severity="error">{createCityError}</Alert>
            )}
            <CityFormFields
              form={createForm}
              touched={createTouched}
              errors={createErrors}
              onChange={(e) =>
                setCreateForm((p) => ({
                  ...p,
                  [e.target.name]: e.target.value,
                }))
              }
              onBlur={(e) =>
                setCreateTouched((p) => ({ ...p, [e.target.name]: true }))
              }
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outlined"
                onClick={closeCreate}
                disabled={createCityStatus === "loading"}
                className="!rounded-2xl !border-slate-200 !px-6 !py-3 !text-sm !font-bold !normal-case !text-slate-700"
              >
                Отмена
              </Button>
              <Button
                variant="contained"
                onClick={handleCreate}
                disabled={createCityStatus === "loading"}
                className="!rounded-2xl !bg-brand-500 !px-6 !py-3 !text-sm !font-bold !normal-case !shadow-none hover:!bg-brand-600"
              >
                {createCityStatus === "loading" ? "Создаём..." : "Создать"}
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
          Редактировать город
        </DialogTitle>
        <DialogContent className="!px-6 !pb-7 !pt-4">
          <div className="space-y-4">
            {updateCityError && (
              <Alert severity="error">{updateCityError}</Alert>
            )}
            <CityFormFields
              form={editForm}
              touched={editTouched}
              errors={editErrors}
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
                disabled={updateCityStatus === "loading"}
                className="!rounded-2xl !border-slate-200 !px-6 !py-3 !text-sm !font-bold !normal-case !text-slate-700"
              >
                Отмена
              </Button>
              <Button
                variant="contained"
                onClick={handleEdit}
                disabled={updateCityStatus === "loading"}
                className="!rounded-2xl !bg-brand-500 !px-6 !py-3 !text-sm !font-bold !normal-case !shadow-none hover:!bg-brand-600"
              >
                {updateCityStatus === "loading" ? "Сохраняем..." : "Сохранить"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={deleteOpen}
        name={deletingCity?.name}
        entity="город"
        status={deleteCityStatus}
        error={deleteCityError}
        onConfirm={handleDelete}
        onClose={closeDelete}
      />

      {/* View dialog */}
      <Dialog
        open={viewOpen}
        onClose={closeView}
        fullWidth
        maxWidth="sm"
        PaperProps={{ className: "!rounded-[28px] !bg-white !shadow-2xl" }}
      >
        <DialogTitle className="!px-6 !pt-6 !text-xl !font-extrabold !tracking-tight !text-slate-950">
          {viewLoading ? "Загрузка..." : (viewCity?.name ?? "Город")}
        </DialogTitle>
        <DialogContent className="!px-6 !pb-6 !pt-2">
          {viewLoading && (
            <div className="flex justify-center py-8">
              <CircularProgress />
            </div>
          )}
          {viewError && <Alert severity="error">{viewError}</Alert>}
          {viewCity && !viewLoading && (
            <div className="space-y-4 pt-1">
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow label="Название" value={viewCity.name} />
                <InfoRow label="Страна" value={viewCity.country} />
                {viewCity.climate && (
                  <InfoRow label="Климат" value={viewCity.climate} />
                )}
              </div>
              {viewCity.description && (
                <InfoRow label="Описание" value={viewCity.description} />
              )}
              <InfoRow
                label="ID"
                value={
                  <span className="font-mono text-xs text-slate-500">
                    {viewCity.id}
                  </span>
                }
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function HotelFormFields({
  form,
  touched,
  errors,
  onChange,
  onCityChange,
  cities,
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Autocomplete
          options={cities}
          getOptionLabel={(o) => o.name}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          value={cities.find((c) => c.id === form.city_id) || null}
          onChange={(_, v) => onCityChange(v ? v.id : "")}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Город"
              error={Boolean(touched.city_id && errors.city_id)}
              helperText={
                touched.city_id && errors.city_id ? errors.city_id : " "
              }
            />
          )}
        />
        <TextField
          select
          fullWidth
          label="Звёздность"
          name="stars"
          value={form.stars}
          onChange={onChange}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <MenuItem key={n} value={String(n)}>
              {"★".repeat(n)} {n}
            </MenuItem>
          ))}
        </TextField>
      </div>
      <TextField
        fullWidth
        label="Название"
        name="name"
        value={form.name}
        onChange={onChange}
        error={Boolean(touched.name && errors.name)}
        helperText={touched.name && errors.name ? errors.name : " "}
      />
      <TextField
        fullWidth
        label="Адрес"
        name="address"
        value={form.address}
        onChange={onChange}
        error={Boolean(touched.address && errors.address)}
        helperText={touched.address && errors.address ? errors.address : " "}
      />
      <TextField
        fullWidth
        label="Удобства"
        name="amenities"
        value={form.amenities}
        onChange={onChange}
        helperText="Необязательно — через запятую: Бассейн, Wi-Fi, Спа"
      />
      <TextField
        fullWidth
        multiline
        minRows={2}
        label={<span>Описание <span style={{ fontSize: '0.82em', fontWeight: 400, opacity: 0.7 }}>· Необязательно</span></span>}
        name="description"
        value={form.description}
        onChange={onChange}
        slotProps={{ inputLabel: { shrink: true } }}
        helperText=" "
      />
    </div>
  );
}

const initialHotelForm = {
  city_id: "",
  name: "",
  stars: "3",
  address: "",
  amenities: "",
  description: "",
};

function validateHotelForm(f) {
  const e = {};
  if (!f.city_id) e.city_id = "Выберите город";
  if (!f.name.trim()) e.name = "Введите название";
  if (!f.stars) e.stars = "Укажите звёздность";
  if (!f.address.trim()) e.address = "Введите адрес";
  return e;
}

function HotelsTab({ isStaff, isAdmin }) {
  const dispatch = useDispatch();
  const {
    hotels,
    hotelsTotal,
    hotelsPage,
    hotelsPages,
    hotelsFilterCityId,
    hotelsStatus,
    hotelsError,
    createHotelStatus,
    createHotelError,
    updateHotelStatus,
    updateHotelError,
    deleteHotelStatus,
    deleteHotelError,
  } = useSelector((s) => s.catalog);
  const cities = useSelector((s) => s.travel.cities);

  useEffect(() => {
    dispatch(
      fetchCatalogHotels({
        page: hotelsPage,
        cityId: hotelsFilterCityId || null,
      }),
    );
  }, [dispatch, hotelsPage, hotelsFilterCityId]);

  useEffect(() => {
    dispatch(fetchCities());
  }, [dispatch]);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewHotel, setViewHotel] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(initialHotelForm);
  const [createTouched, setCreateTouched] = useState({});

  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(initialHotelForm);
  const [editTouched, setEditTouched] = useState({});

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingHotel, setDeletingHotel] = useState(null);

  function openView(hotel) {
    setViewHotel(null);
    setViewError(null);
    setViewOpen(true);
    setViewLoading(true);
    http
      .get(`/v1/hotels/${hotel.id}`)
      .then(({ data }) => setViewHotel(data))
      .catch(() => setViewError("Не удалось загрузить данные отеля."))
      .finally(() => setViewLoading(false));
  }
  function closeView() {
    setViewOpen(false);
  }

  const createErrors = useMemo(
    () => validateHotelForm(createForm),
    [createForm],
  );
  const editErrors = useMemo(() => validateHotelForm(editForm), [editForm]);

  function handlePageChange(p) {
    if (p < 1 || p > hotelsPages || p === hotelsPage) return;
    dispatch(setHotelsPage(p));
  }

  function buildHotelPayload(form) {
    return {
      city_id: form.city_id,
      name: form.name.trim(),
      stars: Number(form.stars),
      address: form.address.trim(),
      amenities: form.amenities
        ? form.amenities
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      description: form.description.trim() || null,
    };
  }

  // Create
  function openCreate() {
    dispatch(clearCreateHotelState());
    setCreateForm(initialHotelForm);
    setCreateTouched({});
    setCreateOpen(true);
  }
  function closeCreate() {
    if (createHotelStatus === "loading") return;
    dispatch(clearCreateHotelState());
    setCreateOpen(false);
  }
  async function handleCreate() {
    setCreateTouched({ city_id: true, name: true, stars: true, address: true });
    if (Object.keys(createErrors).length > 0) return;
    const result = await dispatch(createHotel(buildHotelPayload(createForm)));
    if (createHotel.fulfilled.match(result)) closeCreate();
  }

  // Edit
  function openEdit(hotel) {
    dispatch(clearUpdateHotelState());
    setEditForm({
      city_id: hotel.city.id,
      name: hotel.name,
      stars: String(hotel.stars),
      address: hotel.address,
      amenities: hotel.amenities.join(", "),
      description: hotel.description ?? "",
    });
    setEditTouched({});
    setEditingId(hotel.id);
    setEditOpen(true);
  }
  function closeEdit() {
    if (updateHotelStatus === "loading") return;
    dispatch(clearUpdateHotelState());
    setEditOpen(false);
  }
  async function handleEdit() {
    setEditTouched({ city_id: true, name: true, stars: true, address: true });
    if (Object.keys(editErrors).length > 0) return;
    const result = await dispatch(
      updateHotel({ id: editingId, ...buildHotelPayload(editForm) }),
    );
    if (updateHotel.fulfilled.match(result)) closeEdit();
  }

  // Delete
  function openDelete(hotel) {
    dispatch(clearDeleteHotelState());
    setDeletingHotel({ id: hotel.id, name: hotel.name });
    setDeleteOpen(true);
  }
  function closeDelete() {
    if (deleteHotelStatus === "loading") return;
    dispatch(clearDeleteHotelState());
    setDeleteOpen(false);
  }
  async function handleDelete() {
    if (!deletingHotel) return;
    const result = await dispatch(deleteHotel(deletingHotel.id));
    if (deleteHotel.fulfilled.match(result)) closeDelete();
  }

  return (
    <>
      <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="text-2xl font-extrabold tracking-tight">Отели</div>
          <select
            value={hotelsFilterCityId}
            onChange={(e) => dispatch(setHotelsFilterCityId(e.target.value))}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none"
          >
            <option value="">Все города</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {isStaff && (
          <Button
            variant="contained"
            onClick={openCreate}
            className="!rounded-2xl !bg-brand-500 !px-5 !py-2.5 !text-sm !font-bold !normal-case !shadow-none hover:!bg-brand-600"
          >
            <span className="mr-2 inline-flex">
              <PlusIcon />
            </span>
            Добавить
          </Button>
        )}
      </div>

      {hotelsError && (
        <div className="px-6 py-4">
          <Alert severity="error">{hotelsError}</Alert>
        </div>
      )}

      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-[20%]" />
          <col className="w-[15%]" />
          <col className="w-[9%]" />
          <col className="w-[22%]" />
          <col className="w-[14%]" />
          <col className="w-[20%]" />
        </colgroup>
        <thead className="bg-slate-50">
          <tr className="text-left text-xs uppercase tracking-[0.1em] text-slate-400">
            <th className="px-5 py-4">Название</th>
            <th className="px-5 py-4">Город</th>
            <th className="px-5 py-4">Звёзды</th>
            <th className="px-5 py-4">Адрес</th>
            <th className="px-5 py-4">Удобства</th>
            <th className="px-5 py-4"></th>
          </tr>
        </thead>
        <tbody>
          {hotels.map((hotel) => (
            <tr
              key={hotel.id}
              className="border-t border-slate-100 align-middle"
            >
              <td className="px-5 py-4 text-sm font-bold text-slate-900">
                {hotel.name}
              </td>
              <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                {hotel.city.name}
              </td>
              <td className="px-5 py-4 text-sm">
                <Stars count={hotel.stars} />
              </td>
              <td className="px-5 py-4 text-sm text-slate-600">
                <span className="line-clamp-2">{hotel.address}</span>
              </td>
              <td className="px-5 py-4">
                {hotel.amenities.length > 0 ? (
                  <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">
                    {hotel.amenities.length} удобств
                  </span>
                ) : (
                  <span className="text-sm text-slate-400">—</span>
                )}
              </td>
              <td className="px-3 py-4">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openView(hotel)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-sky-50 hover:text-sky-600"
                    title="Просмотреть"
                  >
                    <ViewIcon size={16} />
                  </button>
                  {isStaff && (
                    <button
                      type="button"
                      onClick={() => openEdit(hotel)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
                      title="Редактировать"
                    >
                      <EditIcon size={16} />
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => openDelete(hotel)}
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
          {hotels.length === 0 && hotelsStatus !== "loading" && (
            <tr>
              <td
                colSpan={6}
                className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
              >
                Отели не найдены.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
        <div className="text-sm font-medium text-slate-500">
          {hotelsStatus === "loading" ? (
            <span className="inline-flex items-center gap-2">
              <CircularProgress size={16} />
              Загружаем...
            </span>
          ) : (
            `Всего: ${hotelsTotal}`
          )}
        </div>
        <Pagination
          page={hotelsPage}
          pages={hotelsPages}
          onPageChange={handlePageChange}
        />
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
          Добавить отель
        </DialogTitle>
        <DialogContent className="!px-6 !pb-7 !pt-4">
          <div className="space-y-4">
            {createHotelError && (
              <Alert severity="error">{createHotelError}</Alert>
            )}
            <HotelFormFields
              form={createForm}
              touched={createTouched}
              errors={createErrors}
              cities={cities}
              onChange={(e) =>
                setCreateForm((p) => ({
                  ...p,
                  [e.target.name]: e.target.value,
                }))
              }
              onCityChange={(id) =>
                setCreateForm((p) => ({ ...p, city_id: id }))
              }
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outlined"
                onClick={closeCreate}
                disabled={createHotelStatus === "loading"}
                className="!rounded-2xl !border-slate-200 !px-6 !py-3 !text-sm !font-bold !normal-case !text-slate-700"
              >
                Отмена
              </Button>
              <Button
                variant="contained"
                onClick={handleCreate}
                disabled={createHotelStatus === "loading"}
                className="!rounded-2xl !bg-brand-500 !px-6 !py-3 !text-sm !font-bold !normal-case !shadow-none hover:!bg-brand-600"
              >
                {createHotelStatus === "loading" ? "Создаём..." : "Создать"}
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
          Редактировать отель
        </DialogTitle>
        <DialogContent className="!px-6 !pb-7 !pt-4">
          <div className="space-y-4">
            {updateHotelError && (
              <Alert severity="error">{updateHotelError}</Alert>
            )}
            <HotelFormFields
              form={editForm}
              touched={editTouched}
              errors={editErrors}
              cities={cities}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, [e.target.name]: e.target.value }))
              }
              onCityChange={(id) => setEditForm((p) => ({ ...p, city_id: id }))}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outlined"
                onClick={closeEdit}
                disabled={updateHotelStatus === "loading"}
                className="!rounded-2xl !border-slate-200 !px-6 !py-3 !text-sm !font-bold !normal-case !text-slate-700"
              >
                Отмена
              </Button>
              <Button
                variant="contained"
                onClick={handleEdit}
                disabled={updateHotelStatus === "loading"}
                className="!rounded-2xl !bg-brand-500 !px-6 !py-3 !text-sm !font-bold !normal-case !shadow-none hover:!bg-brand-600"
              >
                {updateHotelStatus === "loading" ? "Сохраняем..." : "Сохранить"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={deleteOpen}
        name={deletingHotel?.name}
        entity="отель"
        status={deleteHotelStatus}
        error={deleteHotelError}
        onConfirm={handleDelete}
        onClose={closeDelete}
      />

      {/* View dialog */}
      <Dialog
        open={viewOpen}
        onClose={closeView}
        fullWidth
        maxWidth="sm"
        PaperProps={{ className: "!rounded-[28px] !bg-white !shadow-2xl" }}
      >
        <DialogTitle className="!px-6 !pt-6 !text-xl !font-extrabold !tracking-tight !text-slate-950">
          {viewLoading ? "Загрузка..." : (viewHotel?.name ?? "Отель")}
        </DialogTitle>
        <DialogContent className="!px-6 !pb-6 !pt-2">
          {viewLoading && (
            <div className="flex justify-center py-8">
              <CircularProgress />
            </div>
          )}
          {viewError && <Alert severity="error">{viewError}</Alert>}
          {viewHotel && !viewLoading && (
            <div className="space-y-4 pt-1">
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow label="Название" value={viewHotel.name} />
                <InfoRow
                  label="Город"
                  value={`${viewHotel.city.name}, ${viewHotel.city.country}`}
                />
                <InfoRow
                  label="Звёздность"
                  value={
                    <span className="text-amber-400">
                      {"★".repeat(viewHotel.stars)}
                      <span className="text-slate-200">
                        {"★".repeat(5 - viewHotel.stars)}
                      </span>
                    </span>
                  }
                />
                <InfoRow label="Адрес" value={viewHotel.address} />
              </div>
              {viewHotel.amenities.length > 0 && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Удобства
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {viewHotel.amenities.map((a) => (
                      <span
                        key={a}
                        className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {viewHotel.description && (
                <InfoRow label="Описание" value={viewHotel.description} />
              )}
              <InfoRow
                label="ID"
                value={
                  <span className="font-mono text-xs text-slate-500">
                    {viewHotel.id}
                  </span>
                }
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CatalogsPage() {
  const [tab, setTab] = useState(0);
  const currentUser = useSelector((s) => s.auth.currentUser);
  const isStaff =
    currentUser?.role === "employee" || currentUser?.role === "admin";
  const isAdmin = currentUser?.role === "admin";

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-transparent text-slate-900">
        <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
          <div className="flex min-h-[calc(100vh-2rem)] overflow-hidden rounded-[32px] border border-white/70 bg-white/75 shadow-panel backdrop-blur">
            <Aside />
            <main className="flex flex-1 items-center justify-center px-8 py-12">
              <div className="text-center">
                <div className="text-2xl font-extrabold text-slate-900">
                  Нет доступа
                </div>
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
            <header className="border-b border-slate-200/80 px-6 py-6 lg:px-10">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
                Справочники
              </h1>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Управление городами и отелями.
              </p>
            </header>

            <div className="px-6 py-6 lg:px-10">
              <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
                <Tabs
                  value={tab}
                  onChange={(_, v) => setTab(v)}
                  sx={{
                    borderBottom: 1,
                    borderColor: "divider",
                    px: 3,
                    "& .MuiTab-root": {
                      fontWeight: 700,
                      textTransform: "none",
                      fontSize: "0.9rem",
                    },
                  }}
                >
                  <Tab label="Города" />
                  <Tab label="Отели" />
                </Tabs>

                {tab === 0 && <CitiesTab isStaff={isStaff} isAdmin={isAdmin} />}
                {tab === 1 && <HotelsTab isStaff={isStaff} isAdmin={isAdmin} />}
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
