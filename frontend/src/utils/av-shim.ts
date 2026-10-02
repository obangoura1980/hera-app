// expo-av style `Audio` API implemented on top of expo-audio (expo-av is deprecated).
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

class Sound {
  constructor(private player: AudioPlayer) {}
  async playAsync() {
    this.player.play();
  }
  async pauseAsync() {
    this.player.pause();
  }
  async stopAsync() {
    this.player.pause();
    await this.player.seekTo(0);
  }
  async setVolumeAsync(v: number) {
    this.player.volume = v;
  }
  async setIsLoopingAsync(v: boolean) {
    this.player.loop = v;
  }
  async getStatusAsync() {
    return { isLoaded: true, isPlaying: this.player.playing };
  }
  async unloadAsync() {
    this.player.remove();
  }

  static async createAsync(source: { uri: string } | number, status: { shouldPlay?: boolean; isLooping?: boolean; volume?: number } = {}) {
    const player = createAudioPlayer(source as any);
    player.loop = !!status.isLooping;
    if (status.volume !== undefined) player.volume = status.volume;
    if (status.shouldPlay) player.play();
    return { sound: new Sound(player), status: { isLoaded: true } };
  }
}

export const Audio = {
  Sound,
  async setAudioModeAsync(_opts: Record<string, unknown>) {
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
  },
};
