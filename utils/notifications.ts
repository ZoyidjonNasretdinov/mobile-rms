import { Audio } from "expo-av";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";

const NOTIFICATION_SOUND_URI =
  "https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3";

class NotificationService {
  private sound: Audio.Sound | null = null;
  private isReady: boolean = false;

  constructor() {
    this.prepareAudio();
  }

  private async prepareAudio() {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        playThroughEarpieceAndroid: false,
      });

      // Pre-load the sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: NOTIFICATION_SOUND_URI },
        { shouldPlay: false, volume: 1.0 },
      );
      this.sound = sound;
      this.isReady = true;
      console.log("Notification sound pre-loaded");
    } catch (e) {
      console.log("Audio prepare error:", e);
    }
  }

  async playDing() {
    try {
      if (this.sound && this.isReady) {
        await this.sound.stopAsync();
        await this.sound.playFromPositionAsync(0);
      } else {
        // Fallback or retry pre-load
        const { sound } = await Audio.Sound.createAsync(
          { uri: NOTIFICATION_SOUND_URI },
          { shouldPlay: true, volume: 1.0 },
        );
        this.sound = sound;
        this.isReady = true;
      }
    } catch (error) {
      console.log("Error playing ding:", error);
    }
  }

  async notify(
    message: string,
    hapticType: Haptics.NotificationFeedbackType = Haptics
      .NotificationFeedbackType.Success,
  ) {
    // 1. Haptics
    try {
      await Haptics.notificationAsync(hapticType);
    } catch (e) {}

    // 2. Sound
    await this.playDing();

    // 3. Speech
    // We wait slightly for the ding to finish or be clearly heard
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
