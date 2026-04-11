import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const Storage = {
  setItem: async (key: string, value: string) => {
    if (Platform.OS === "web") {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.error("LocalStorage set error", e);
      }
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },

  getItem: async (key: string) => {
    if (Platform.OS === "web") {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        console.error("LocalStorage get error", e);
        return null;
      }
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },

  removeItem: async (key: string) => {
    if (Platform.OS === "web") {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.error("LocalStorage remove error", e);
      }
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};
