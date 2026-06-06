"use client";

import { RHYTHM_DURATION_MS } from "@/hooks/useSynchronizedRhythm";

export type BgmTrack =
  | "animalCrossing"
  | "animalFarm"
  | "bossStage"
  | "brainAcademy"
  | "cookieRun"
  | "fail"
  | "gameOver"
  | "geometryDash"
  | "halliGalli"
  | "hancom"
  | "intermission"
  | "kartrider"
  | "layton"
  | "leagueOfLegend"
  | "maplestory"
  | "mapleRune"
  | "minecraft"
  | "oneUp"
  | "pokemon"
  | "resultsAndMain"
  | "setup"
  | "speedUp"
  | "superMario"
  | "success"
  | "tetris"
  | "undertale"
  | "zelda";

export type SoundEffectTrack =
  | "clear1"
  | "clear2"
  | "clear3"
  | "clear4"
  | "clear5"
  | "animalCrossingStamp"
  | "cookieRunJump"
  | "cookieRunSlide"
  | "halliGalliBell"
  | "halliGalliCard"
  | "minecraftDig1"
  | "minecraftDig2"
  | "leagueChampionSelect"
  | "runeEffect";

const BGM_TRACK_PATHS = {
  animalCrossing: "/games/animal-crossing/sounds/animal-crossing-bgm.mp3",
  animalFarm: "/games/animal-farm/sounds/animal-farm-bgm.mp3",
  bossStage: "/games/game-flow/sounds/boss-stage.mp3",
  brainAcademy: "/games/brain-academy/sounds/brain-academy-bgm.mp3",
  cookieRun: "/games/cookie-run/sounds/cookie-run-bgm.mp3",
  fail: "/games/game-flow/sounds/fail.mp3",
  gameOver: "/games/game-flow/sounds/game-over.mp3",
  geometryDash: "/games/geometry-dash/sounds/geometry-dash-bgm.mp3",
  halliGalli: "/games/halli-galli/sounds/halli-galli-bgm.mp3",
  hancom: "/games/hancom/sounds/hancom-bgm.mp3",
  intermission: "/games/game-flow/sounds/intermission.mp3",
  kartrider: "/games/kartrider/sounds/kartrider-bgm.mp3",
  layton: "/games/layton/sounds/layton-bgm.mp3",
  leagueOfLegend: "/games/league-of-legend/sounds/league-of-legend-ban-bgm.mp3",
  maplestory: "/games/maplestory-lie-detector/sounds/maplestory-bgm.mp3",
  mapleRune: "/games/maple-story-rune/sounds/maple-rune-bgm.mp3",
  minecraft: "/games/minecraft/sounds/minecraft-bgm.mp3",
  oneUp: "/games/game-flow/sounds/1-up.mp3",
  pokemon: "/games/pokemon/sounds/pokemon-bgm.mp3",
  resultsAndMain: "/games/game-flow/sounds/results-and-main.mp3",
  setup: "/games/game-flow/sounds/setup.mp3",
  speedUp: "/games/game-flow/sounds/speed-up.mp3",
  superMario: "/games/supermario/sounds/overworld-theme.mp3",
  success: "/games/game-flow/sounds/success.mp3",
  tetris: "/games/tetris/sounds/tetris-bgm.mp3",
  undertale: "/games/undertale/sounds/undertale-bgm.mp3",
  zelda: "/games/zelda/sounds/zelda-bgm.mp3",
} satisfies Record<BgmTrack, string>;

const SOUND_EFFECT_TRACK_PATHS = {
  clear1: "/games/game-flow/sounds/clear-1.mp3",
  clear2: "/games/game-flow/sounds/clear-2.mp3",
  clear3: "/games/game-flow/sounds/clear-3.mp3",
  clear4: "/games/game-flow/sounds/clear-4.mp3",
  clear5: "/games/game-flow/sounds/clear-5.mp3",
  animalCrossingStamp: "/games/animal-crossing/sounds/stamp.mp3",
  cookieRunJump: "/games/cookie-run/sounds/cookie-jump.mp3",
  cookieRunSlide: "/games/cookie-run/sounds/cookie-slide.mp3",
  halliGalliBell: "/games/halli-galli/sounds/bell-chime.mp3",
  halliGalliCard: "/games/halli-galli/sounds/card-draw.mp3",
  leagueChampionSelect: "/games/league-of-legend/sounds/champ-select.mp3",
  minecraftDig1: "/games/minecraft/sounds/dig-1.mp3",
  minecraftDig2: "/games/minecraft/sounds/dig-2.mp3",
  runeEffect: "/games/maple-story-rune/sounds/rune-effect.mp3",
} satisfies Record<SoundEffectTrack, string>;

const AUDIO_TRACK_PATHS = {
  ...BGM_TRACK_PATHS,
  ...SOUND_EFFECT_TRACK_PATHS,
};

const DEFAULT_BEAT_DURATION_SECONDS = RHYTHM_DURATION_MS / 1000;
const BGM_GAIN = 0.72;
const BGM_TRACK_GAINS: Partial<Record<BgmTrack, number>> = {
  kartrider: 0.94,
  mapleRune: 0.94,
  undertale: 0.52,
};
const SOUND_EFFECT_GAIN = 0.86;
const SOUND_EFFECT_TRACK_GAINS: Partial<Record<SoundEffectTrack, number>> = {
  runeEffect: 1,
};
const ATTACK_FADE_SECONDS = 0.012;
const RELEASE_FADE_SECONDS = 0.045;

const BGM_TRACK_BEATS = {
  animalCrossing: 8,
  animalFarm: 36,
  bossStage: 8,
  brainAcademy: 12,
  cookieRun: 12,
  fail: 4,
  geometryDash: 12,
  halliGalli: 36,
  hancom: 12,
  intermission: 8,
  kartrider: 36,
  layton: 8,
  leagueOfLegend: 12,
  maplestory: 12,
  mapleRune: 8,
  minecraft: 8,
  oneUp: 8,
  pokemon: 12,
  resultsAndMain: 83,
  setup: 4,
  speedUp: 8,
  superMario: 8,
  success: 4,
  tetris: 12,
  undertale: 8,
  zelda: 12,
} satisfies Record<Exclude<BgmTrack, "gameOver">, number>;

export const GAME_OVER_DURATION_MS = 5208;

export type BgmPlaybackMode = "loop" | "once";
export type BgmStartPolicy = "beat" | "now";

type PlayingSource = Readonly<{
  gainNode: GainNode;
  mode: BgmPlaybackMode;
  source: AudioBufferSourceNode;
  stopAt: number;
  track: BgmTrack;
}>;

type ScheduledSource = Readonly<{
  gainNode: GainNode;
  mode: BgmPlaybackMode;
  source: AudioBufferSourceNode;
  stopAt: number;
  track: BgmTrack;
}>;

type DesiredPlayback = Readonly<{
  mode: BgmPlaybackMode;
  startPolicy: BgmStartPolicy;
  track: BgmTrack;
}>;

class BgmLibrary {
  private audioContext: AudioContext | null = null;
  private buffers = new Map<BgmTrack | SoundEffectTrack, AudioBuffer>();
  private loadingBuffers = new Map<
    BgmTrack | SoundEffectTrack,
    Promise<AudioBuffer>
  >();
  private currentSource: PlayingSource | null = null;
  private desiredPlayback: DesiredPlayback | null = null;
  private playRequestId = 0;
  private scheduledSources: ScheduledSource[] = [];
  private scheduledTransitionTimer: number | null = null;
  private beatDurationSeconds = DEFAULT_BEAT_DURATION_SECONDS;
  private timelineOriginSeconds = 0;

  async unlock() {
    const audioContext = this.getAudioContext();
    await audioContext.resume();

    if (this.desiredPlayback) {
      await this.play(
        this.desiredPlayback.track,
        this.desiredPlayback.mode,
        this.desiredPlayback.startPolicy,
      );
    }
  }

  preloadAll() {
    return Promise.all(
      Object.keys(AUDIO_TRACK_PATHS).map((track) =>
        this.loadTrack(track as BgmTrack | SoundEffectTrack),
      ),
    );
  }

  setBeatDurationMs(beatDurationMs: number) {
    this.beatDurationSeconds = beatDurationMs / 1000;
  }

  async getTrackDurationMs(track: BgmTrack) {
    const buffer = await this.loadTrack(track);

    return buffer.duration * 1000;
  }

  async playSoundEffect(track: SoundEffectTrack) {
    const audioContext = this.getAudioContext();
    const buffer = await this.loadTrack(track);
    const gainNode = audioContext.createGain();
    const source = audioContext.createBufferSource();

    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    gainNode.gain.setValueAtTime(
      this.getSoundEffectGain(track),
      audioContext.currentTime,
    );
    source.start(audioContext.currentTime);
  }

  async play(
    track: BgmTrack,
    mode: BgmPlaybackMode,
    startPolicy: BgmStartPolicy = mode === "loop" ? "beat" : "now",
  ) {
    this.desiredPlayback = { mode, startPolicy, track };
    const requestId = this.playRequestId + 1;

    this.playRequestId = requestId;

    const audioContext = this.getAudioContext();
    const buffer = await this.loadTrack(track);

    if (requestId !== this.playRequestId) {
      return;
    }

    this.clearScheduledTransitionTimer();

    if (this.isCurrentSource(track, mode, audioContext.currentTime)) {
      return;
    }

    if (this.isScheduledSource(track, mode, audioContext.currentTime)) {
      return;
    }

    this.clearScheduledSources();

    const startAt =
      startPolicy === "beat"
        ? this.getNextBeatTime(audioContext.currentTime)
        : audioContext.currentTime;
    const gainNode = audioContext.createGain();
    const source = audioContext.createBufferSource();
    const targetDurationSeconds = this.getTargetDurationSeconds(track, buffer);
    const playbackRate =
      mode === "once" ? buffer.duration / targetDurationSeconds : 1;

    source.buffer = buffer;
    source.loop = mode === "loop";
    source.playbackRate.value = playbackRate;
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    gainNode.gain.setValueAtTime(0, startAt);
    gainNode.gain.linearRampToValueAtTime(
      this.getTrackGain(track),
      startAt + ATTACK_FADE_SECONDS,
    );
    source.start(startAt);

    this.stopCurrentSource(startAt);
    const stopAt =
      mode === "loop"
        ? Number.POSITIVE_INFINITY
        : startAt + targetDurationSeconds;

    this.currentSource = {
      gainNode,
      mode,
      source,
      stopAt,
      track,
    };

    if (mode === "once") {
      window.setTimeout(() => {
        if (this.currentSource?.source === source) {
          this.currentSource = null;
        }
      }, targetDurationSeconds * 1000);
    }
  }

  async playSequence(
    firstTrack: BgmTrack,
    firstMode: BgmPlaybackMode,
    nextTrack: BgmTrack,
    nextMode: BgmPlaybackMode,
  ) {
    this.desiredPlayback = {
      mode: firstMode,
      startPolicy: "now",
      track: firstTrack,
    };
    const requestId = this.playRequestId + 1;

    this.playRequestId = requestId;

    const audioContext = this.getAudioContext();
    const [firstBuffer, nextBuffer] = await Promise.all([
      this.loadTrack(firstTrack),
      this.loadTrack(nextTrack),
    ]);

    if (requestId !== this.playRequestId) {
      return;
    }

    this.clearScheduledSources();

    const firstStartAt = audioContext.currentTime;
    const firstTargetDurationSeconds = this.getTargetDurationSeconds(
      firstTrack,
      firstBuffer,
    );
    const nextStartAt = firstStartAt + firstTargetDurationSeconds;

    const firstSource = this.createSource(
      firstTrack,
      firstMode,
      firstBuffer,
      firstStartAt,
    );
    const nextSource = this.createSource(
      nextTrack,
      nextMode,
      nextBuffer,
      nextStartAt,
    );

    this.stopCurrentSource(firstStartAt);
    this.currentSource = firstSource;
    this.scheduledSources = [nextSource];

    this.clearScheduledTransitionTimer();
    this.scheduledTransitionTimer = window.setTimeout(() => {
      if (requestId === this.playRequestId) {
        this.currentSource = nextSource;
        this.scheduledSources = [];
      }
      this.scheduledTransitionTimer = null;
    }, firstTargetDurationSeconds * 1000);
  }

  stop() {
    if (!this.audioContext) {
      return;
    }

    this.playRequestId += 1;
    this.clearScheduledTransitionTimer();
    this.clearScheduledSources();
    this.stopCurrentSource(this.audioContext.currentTime);
    this.currentSource = null;
  }

  private createSource(
    track: BgmTrack,
    mode: BgmPlaybackMode,
    buffer: AudioBuffer,
    startAt: number,
  ) {
    const gainNode = this.getAudioContext().createGain();
    const source = this.getAudioContext().createBufferSource();
    const targetDurationSeconds = this.getTargetDurationSeconds(track, buffer);
    const playbackRate =
      mode === "once" ? buffer.duration / targetDurationSeconds : 1;
    const stopAt =
      mode === "loop"
        ? Number.POSITIVE_INFINITY
        : startAt + targetDurationSeconds;

    source.buffer = buffer;
    source.loop = mode === "loop";
    source.playbackRate.value = playbackRate;
    source.connect(gainNode);
    gainNode.connect(this.getAudioContext().destination);
    gainNode.gain.setValueAtTime(0, startAt);
    gainNode.gain.linearRampToValueAtTime(
      this.getTrackGain(track),
      startAt + ATTACK_FADE_SECONDS,
    );
    source.start(startAt);

    return {
      gainNode,
      mode,
      source,
      stopAt,
      track,
    };
  }

  private getAudioContext() {
    if (this.audioContext) {
      return this.audioContext;
    }

    this.audioContext = new AudioContext();
    this.timelineOriginSeconds = this.audioContext.currentTime;

    return this.audioContext;
  }

  private async loadTrack(track: BgmTrack | SoundEffectTrack) {
    const decodedBuffer = this.buffers.get(track);

    if (decodedBuffer) {
      return decodedBuffer;
    }

    const loadingBuffer = this.loadingBuffers.get(track);

    if (loadingBuffer) {
      return loadingBuffer;
    }

    const nextLoadingBuffer = fetch(AUDIO_TRACK_PATHS[track])
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load BGM track: ${track}`);
        }

        return response.arrayBuffer();
      })
      .then((arrayBuffer) =>
        this.getAudioContext().decodeAudioData(arrayBuffer),
      )
      .then((audioBuffer) => {
        this.buffers.set(track, audioBuffer);
        this.loadingBuffers.delete(track);

        return audioBuffer;
      });

    this.loadingBuffers.set(track, nextLoadingBuffer);

    return nextLoadingBuffer;
  }

  private getNextBeatTime(currentTime: number) {
    const elapsedSeconds = currentTime - this.timelineOriginSeconds;
    const elapsedBeats = Math.ceil(elapsedSeconds / this.beatDurationSeconds);

    return this.timelineOriginSeconds + elapsedBeats * this.beatDurationSeconds;
  }

  private getTargetDurationSeconds(track: BgmTrack, buffer: AudioBuffer) {
    if (track === "gameOver" || track === "setup") {
      return buffer.duration;
    }

    return BGM_TRACK_BEATS[track] * this.beatDurationSeconds;
  }

  private getTrackGain(track: BgmTrack) {
    return BGM_TRACK_GAINS[track] ?? BGM_GAIN;
  }

  private getSoundEffectGain(track: SoundEffectTrack) {
    return SOUND_EFFECT_TRACK_GAINS[track] ?? SOUND_EFFECT_GAIN;
  }

  private isCurrentSource(
    track: BgmTrack,
    mode: BgmPlaybackMode,
    currentTime: number,
  ) {
    return (
      this.currentSource?.track === track &&
      this.currentSource.mode === mode &&
      this.currentSource.stopAt > currentTime
    );
  }

  private isScheduledSource(
    track: BgmTrack,
    mode: BgmPlaybackMode,
    currentTime: number,
  ) {
    return this.scheduledSources.some(
      (scheduledSource) =>
        scheduledSource.track === track &&
        scheduledSource.mode === mode &&
        scheduledSource.stopAt > currentTime,
    );
  }

  private clearScheduledSources() {
    const audioContext = this.getAudioContext();

    this.scheduledSources.forEach(({ gainNode, source }) => {
      gainNode.gain.cancelScheduledValues(audioContext.currentTime);
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);

      try {
        source.stop(audioContext.currentTime);
      } catch {
        // Scheduled sources may have already ended or been stopped by another request.
      }
    });
    this.scheduledSources = [];
  }

  private clearScheduledTransitionTimer() {
    if (this.scheduledTransitionTimer === null) {
      return;
    }

    window.clearTimeout(this.scheduledTransitionTimer);
    this.scheduledTransitionTimer = null;
  }

  private stopCurrentSource(stopAt: number) {
    if (!this.currentSource) {
      return;
    }

    const { gainNode, source } = this.currentSource;
    const audioContext = this.getAudioContext();
    const nextStopAt =
      stopAt <= audioContext.currentTime
        ? audioContext.currentTime + RELEASE_FADE_SECONDS
        : stopAt;

    this.fadeOutSource(gainNode, nextStopAt);
    try {
      source.stop(nextStopAt);
    } catch {
      // The source may have already ended naturally; the rhythm boundary still wins.
    }
  }

  private fadeOutSource(gainNode: GainNode, stopAt: number) {
    const audioContext = this.getAudioContext();
    const fadeStart = Math.max(
      audioContext.currentTime,
      stopAt - RELEASE_FADE_SECONDS,
    );

    gainNode.gain.cancelScheduledValues(fadeStart);
    gainNode.gain.setValueAtTime(gainNode.gain.value, fadeStart);
    gainNode.gain.linearRampToValueAtTime(0, stopAt);
  }
}

export const bgmLibrary = new BgmLibrary();

export function unlockBgmLibrary() {
  return bgmLibrary.unlock();
}
