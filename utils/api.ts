import axios from "axios";
import { CONFIG } from "@/constants/config";
import { Storage } from "@/utils/storage";

// Global axios instance with timeout and base URL
const api = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  timeout: 10000, // 10 soniya
});

// Avtomatik token qo'shish
api.interceptors.request.use(async (config) => {
  const token = await Storage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Xato xabarlarini o'zbek tilida ko'rsatish
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      error.userMessage =
        "So'rov vaqti o'tdi. Internet aloqangizni tekshiring.";
    } else if (!error.response) {
      error.userMessage =
        "Serverga ulanib bo'lmadi. Wi-Fi yoki IP manzilni tekshiring.";
    } else {
      const msg = error.response?.data?.message;
      error.userMessage = Array.isArray(msg)
        ? msg.join(", ")
        : msg || "Xatolik yuz berdi";
    }
    return Promise.reject(error);
  },
);

export default api;
