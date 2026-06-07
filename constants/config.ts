import { Platform } from "react-native";

export const CONFIG = {
  // ✅ Haqiqiy telefon qurilmasi uchun kompyuterning IP manzilini ishlatish kerak
  // localhost faqat emulatorda ishlaydi, haqiqiy telefonda ishlamaydi!
  API_BASE_URL:
    process.env.EXPO_PUBLIC_API_URL || 
    (Platform.OS === 'web' ? "http://localhost:3001/api" : "http://192.168.43.138:3001/api"),
};
