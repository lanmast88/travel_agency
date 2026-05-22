import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { http } from "../../shared/api/http";

const AVATAR_PALETTE = [
  "bg-brand-500", "bg-emerald-500", "bg-violet-500",
  "bg-amber-500", "bg-rose-500", "bg-sky-600", "bg-teal-500", "bg-purple-500",
];

function avatarColor(id) {
  const n = id ? parseInt(id.replace(/-/g, "").slice(0, 8), 16) : 0;
  return AVATAR_PALETTE[n % AVATAR_PALETTE.length];
}

function initials(first, last) {
  return ((first?.[0] ?? "") + (last?.[0] ?? "")).toUpperCase() || "?";
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = String(dateStr).split("-");
  return `${d}.${m}.${y}`;
}

const STATUS_LABELS = { confirmed: "Подтверждена", cancelled: "Отменена" };

export const fetchDashboardData = createAsyncThunk(
  "dashboard/fetchDashboardData",
  async (_, { rejectWithValue }) => {
    try {
      const [salesRes, clientsRes, toursRes, usersRes, citiesRes] = await Promise.allSettled([
        http.get("/v1/sales", { params: { page: 1, page_size: 6 } }),
        http.get("/v1/clients", { params: { page: 1, page_size: 1 } }),
        http.get("/v1/tours", { params: { page: 1, page_size: 100 } }),
        http.get("/v1/users", { params: { limit: 200 } }),
        http.get("/v1/cities", { params: { page: 1, page_size: 100 } }),
      ]);

      function ok(res) { return res.status === "fulfilled"; }

      const sales = ok(salesRes) ? salesRes.value.data.items : [];
      const tours = ok(toursRes) ? toursRes.value.data.items : [];
      const users = ok(usersRes) ? usersRes.value.data : [];
      const cities = ok(citiesRes) ? citiesRes.value.data.items : [];

      function cityName(id) { return cities.find((c) => c.id === id)?.name ?? "—"; }
      function tourName(id) { return tours.find((t) => t.id === id)?.name ?? "—"; }
      function userName(id) {
        const u = users.find((u) => u.id === id);
        return u ? `${u.first_name} ${u.last_name ?? ""}`.trim() : "—";
      }
      function userInitials(id) {
        const u = users.find((u) => u.id === id);
        return u ? initials(u.first_name, u.last_name) : "?";
      }

      return {
        salesTotal: ok(salesRes) ? salesRes.value.data.total : 0,
        clientsTotal: ok(clientsRes) ? clientsRes.value.data.total : 0,
        revenue: sales.reduce((s, sale) => s + Number(sale.final_price), 0),
        discountLoss: sales.reduce((s, sale) => s + Number(sale.discount_amount), 0),
        recentSales: sales.map((sale) => ({
          id: sale.id,
          employee: userName(sale.employee_id),
          initials: userInitials(sale.employee_id),
          destination: tourName(sale.tour_id),
          date: formatDate(sale.sale_date),
          status: STATUS_LABELS[sale.status] ?? sale.status,
          color: avatarColor(sale.employee_id),
        })),
        popularTrips: tours
          .filter((t) => t.is_hot)
          .slice(0, 4)
          .map((tour, i) => ({
            id: tour.id,
            title: tour.name,
            location: cityName(tour.city_id),
            nights:
              tour.start_date && tour.end_date
                ? Math.max(1, Math.round((new Date(tour.end_date) - new Date(tour.start_date)) / 86400000))
                : 1,
            price: Number(tour.price),
            color: ["bg-brand-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500"][i],
          })),
      };
    } catch {
      return rejectWithValue("Не удалось загрузить данные дашборда.");
    }
  },
);

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState: {
    status: "idle",
    salesTotal: 0,
    clientsTotal: 0,
    revenue: 0,
    discountLoss: 0,
    recentSales: [],
    popularTrips: [],
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardData.pending, (state) => { state.status = "loading"; })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.status = "succeeded";
        Object.assign(state, action.payload);
      })
      .addCase(fetchDashboardData.rejected, (state) => { state.status = "failed"; });
  },
});

export const dashboardReducer = dashboardSlice.reducer;
