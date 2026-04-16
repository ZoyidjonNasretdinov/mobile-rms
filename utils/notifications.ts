import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from "expo-audio";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const DING_SOUND_URI =
  "https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3";
const ALARM_SOUND_URI =
  "https://assets.mixkit.co/active_storage/sfx/2569/2569-preview.mp3";
const KITCHEN_SOUND_URI =
  "https://assets.mixkit.co/active_storage/sfx/2857/2857-preview.mp3";

class NotificationService {
  private dingPlayer: AudioPlayer | null = null;
  private alarmPlayer: AudioPlayer | null = null;
  private kitchenPlayer: AudioPlayer | null = null;
  private isReady: boolean = false;

  constructor() {
    this.prepareAudio();
  }

  private async prepareAudio() {
    // Avoid running on server-side during web static generation
    if (Platform.OS === "web" && typeof window === "undefined") {
      return;
    }

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: "mixWithOthers",
      });

      // Pre-load sounds using expo-audio players
      this.dingPlayer = createAudioPlayer(DING_SOUND_URI);
      this.alarmPlayer = createAudioPlayer(ALARM_SOUND_URI);
      this.kitchenPlayer = createAudioPlayer(KITCHEN_SOUND_URI);

      this.isReady = true;
      console.log("Notification players initialized");
    } catch (e) {
      console.log("Audio prepare error:", e);
    }
  }

  async playDing() {
    try {
      if (this.dingPlayer) {
        // In expo-audio, seekTo is in seconds
        await (this.dingPlayer as any).seekTo(0);
        (this.dingPlayer as any).play();
      } else if (!this.isReady) {
        // Lazy initialization if not ready
        await this.prepareAudio();
        if (this.dingPlayer) {
          (this.dingPlayer as any).play();
        }
      }
    } catch (error) {
      console.log("Error playing ding:", error);
    }
  }

  async playAlarm() {
    try {
      if (this.alarmPlayer) {
        await (this.alarmPlayer as any).seekTo(0);
        (this.alarmPlayer as any).play();
      } else if (!this.isReady) {
        // Lazy initialization if not ready
        await this.prepareAudio();
        if (this.alarmPlayer) {
          (this.alarmPlayer as any).play();
        }
      }
    } catch (error) {
      console.log("Error playing alarm:", error);
    }
  }

  async playKitchen() {
    try {
      if (this.kitchenPlayer) {
        await (this.kitchenPlayer as any).seekTo(0);
        (this.kitchenPlayer as any).play();
      } else if (!this.isReady) {
        await this.prepareAudio();
        if (this.kitchenPlayer) {
          (this.kitchenPlayer as any).play();
        }
      }
    } catch (error) {
      console.log("Error playing kitchen sound:", error);
    }
  }

  async notify(
    message: string,
    hapticType: Haptics.NotificationFeedbackType = Haptics
      .NotificationFeedbackType.Success,
    soundType: "ding" | "alarm" | "kitchen" = "ding",
  ) {
    // 1. Haptics
    try {
      await Haptics.notificationAsync(hapticType);
    } catch (e) {}

    // 2. Sound
    if (soundType === "alarm") {
      await this.playAlarm();
    } else if (soundType === "kitchen") {
      await this.playKitchen();
    } else {
      await this.playDing();
    }

    // 3. Speech
    setTimeout(() => {
      Speech.speak(message, {
        language: "uz-UZ",
        pitch: 1.0,
        rate: 0.9,
      });
    }, 600);
  }
}

export const notificationService = new NotificationService();
