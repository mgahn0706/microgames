"use client";

import { RHYTHM_DURATION_MS } from "@/hooks/useSynchronizedRhythm";

export type BgmTrack =
  | "animalCrossing"
  | "animalFarm"
  | "appleGame"
  | "babaIsYou"
  | "bossStage"
  | "brainAcademy"
  | "cookieRun"
  | "cookieRunKingdom"
  | "crossword"
  | "crazyArcade"
  | "dobble"
  | "fail"
  | "failNoControl"
  | "fireAndIce"
  | "fruitNinja"
  | "gameOver"
  | "geometryDash"
  | "halliGalli"
  | "hancom"
  | "intermission"
  | "intermissionNoControl"
  | "infiniteStairs"
  | "kartrider"
  | "kirby"
  | "layton"
  | "leagueOfLegend"
  | "maplestory"
  | "mapleRune"
  | "minigameEx"
  | "minecraft"
  | "modooMarble"
  | "oneUp"
  | "pokerouge"
  | "pokemon"
  | "pokemonTcgPocket"
  | "resultsAndMain"
  | "rhythmHero"
  | "setup"
  | "speedUp"
  | "starcraft"
  | "sudoku"
  | "superMarioGalaxy"
  | "superMario"
  | "success"
  | "successNoControl"
  | "suikaGame"
  | "tetris"
  | "undertale"
  | "wiiSports"
  | "wordle"
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
  | "crazyArcadeBombInstall"
  | "halliGalliBell"
  | "halliGalliCard"
  | "fruitNinjaImpact"
  | "infiniteStairsStep"
  | "minecraftDig1"
  | "minecraftDig2"
  | "modooDiceRoll"
  | "pongHit"
  | "leagueChampionSelect"
  | "pokerougeBuy"
  | "pokerougeSelect"
  | "rhythmHeroSpin"
  | "runeEffect"
  | "starcraftMove"
  | "twentyFortyEightSwipe";

const BGM_TRACK_PATHS = {
  animalCrossing: "/games/animal-crossing/sounds/animal-crossing-bgm.mp3",
  animalFarm: "/games/animal-farm/sounds/animal-farm-bgm.mp3",
  appleGame: "/games/apple-game/sounds/apple-game-bgm.mp3",
  babaIsYou: "/games/baba-is-you/sounds/baba-is-you.mp3",
  bossStage: "/games/game-flow/sounds/boss-stage.mp3",
  brainAcademy: "/games/brain-academy/sounds/brain-academy-bgm.mp3",
  cookieRun: "/games/cookie-run/sounds/cookie-run-bgm.mp3",
  cookieRunKingdom:
    "/games/cookie-run-kingdom/sounds/cookie-run-kingdom-bgm.mp3",
  crossword: "/games/crossword/sounds/turkey-bgm.mp3",
  crazyArcade: "/games/crazy-arcade/sounds/crazy-arcade-bgm.mp3",
  dobble: "/games/dobble/sounds/dobble-bgm.mp3",
  fail: "/games/game-flow/sounds/fail.mp3",
  failNoControl: "/games/game-flow/sounds/fail-no-control.mp3",
  fireAndIce: "/games/a-dance-of-fire-and-ice/sounds/fire-and-ice-bgm.mp3",
  fruitNinja: "/games/fruit-ninja/sounds/Game-start.wav",
  gameOver: "/games/game-flow/sounds/game-over.mp3",
  geometryDash: "/games/geometry-dash/sounds/geometry-dash-bgm.mp3",
  halliGalli: "/games/halli-galli/sounds/halli-galli-bgm.mp3",
  hancom: "/games/hancom/sounds/hancom-bgm.mp3",
  intermission: "/games/game-flow/sounds/intermission.mp3",
  intermissionNoControl: "/games/game-flow/sounds/intermission-no-control.mp3",
  infiniteStairs: "/games/infinite-stairs/sounds/infinite-stair-bgm.mp3",
  kartrider: "/games/kartrider/sounds/kartrider-bgm.mp3",
  kirby: "/games/kirby/sounds/kirby-bgm.mp3",
  layton: "/games/layton/sounds/layton-bgm.mp3",
  leagueOfLegend: "/games/league-of-legend/sounds/league-of-legend-ban-bgm.mp3",
  maplestory: "/games/maplestory-lie-detector/sounds/maplestory-bgm.mp3",
  mapleRune: "/games/maple-story-rune/sounds/maple-rune-bgm.mp3",
  minigameEx: "/games/minigame-ex/sounds/minigame-ex-bgm.mp3",
  minecraft: "/games/minecraft/sounds/minecraft-bgm.mp3",
  modooMarble: "/games/modoo-marble/sounds/modoo-bgm.mp3",
  oneUp: "/games/game-flow/sounds/1-up.mp3",
  pokerouge: "/games/pokerouge/sounds/pokegoruge-bgm.flac",
  pokemon: "/games/pokemon/sounds/pokemon-bgm.mp3",
  pokemonTcgPocket:
    "/games/pokemon-tcg-pocket/sounds/pokemon-card-pocket-bgm.mp3",
  resultsAndMain: "/games/game-flow/sounds/results-and-main.mp3",
  rhythmHero: "/games/rhythm-hero/sounds/rhythm-hero-bgm.mp3",
  setup: "/games/game-flow/sounds/setup.mp3",
  speedUp: "/games/game-flow/sounds/speed-up.mp3",
  starcraft: "/games/starcraft/sounds/starcraft-bgm.mp3",
  sudoku: "/games/sudoku/sounds/sudoku-bgm.mp3",
  superMarioGalaxy:
    "/games/super-mario-galaxy/sounds/super-mario-galaxy-bgm.mp3",
  superMario: "/games/supermario/sounds/overworld-theme.mp3",
  success: "/games/game-flow/sounds/success.mp3",
  successNoControl: "/games/game-flow/sounds/success-no-control.mp3",
  suikaGame: "/games/suika-game/sounds/suika-game-bgm.mp3",
  tetris: "/games/tetris/sounds/tetris-bgm.mp3",
  undertale: "/games/undertale/sounds/undertale-bgm.mp3",
  wiiSports: "/games/wii-sports/sounds/wii-sports-bgm.mp3",
  wordle: "/games/wordle/sounds/wordle-bgm.mp3",
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
  crazyArcadeBombInstall:
    "/games/crazy-arcade/sounds/crazy-arcade-bomb-install.mp3",
  halliGalliBell: "/games/halli-galli/sounds/bell-chime.mp3",
  halliGalliCard: "/games/halli-galli/sounds/card-draw.mp3",
  fruitNinjaImpact: "/games/fruit-ninja/sounds/Impact-Watermelon.wav",
  infiniteStairsStep: "/games/infinite-stairs/sounds/button-click.mp3",
  leagueChampionSelect: "/games/league-of-legend/sounds/champ-select.mp3",
  minecraftDig1: "/games/minecraft/sounds/dig-1.mp3",
  minecraftDig2: "/games/minecraft/sounds/dig-2.mp3",
  modooDiceRoll: "/games/modoo-marble/sounds/dice-roll.mp3",
  pongHit: "/games/pong/sounds/pong-hit.mp3",
  pokerougeBuy: "/games/pokerouge/sounds/buy.wav",
  pokerougeSelect: "/games/pokerouge/sounds/select.wav",
  rhythmHeroSpin: "/games/rhythm-hero/sounds/spinning-sound.mp3",
  runeEffect: "/games/maple-story-rune/sounds/rune-effect.mp3",
  starcraftMove: "/games/starcraft/sounds/moving-voice.wav",
  twentyFortyEightSwipe: "/games/two-thousand-forty-eight/sounds/swipe.mp3",
} satisfies Record<SoundEffectTrack, string>;

const AUDIO_TRACK_PATHS = {
  ...BGM_TRACK_PATHS,
  ...SOUND_EFFECT_TRACK_PATHS,
};

export const BGM_LIBRARY_PRELOAD_ASSET_PATHS: ReadonlySet<string> = new Set(
  Object.values(AUDIO_TRACK_PATHS),
);

const AUDIO_PRELOAD_SKIP_TRACKS: ReadonlySet<BgmTrack | SoundEffectTrack> =
  new Set(["resultsAndMain"]);

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
  appleGame: 12,
  babaIsYou: 8,
  bossStage: 8,
  brainAcademy: 12,
  cookieRun: 12,
  cookieRunKingdom: 8,
  crossword: 8,
  crazyArcade: 12,
  dobble: 12,
  fail: 4,
  failNoControl: 4,
  fireAndIce: 8,
  fruitNinja: 8,
  geometryDash: 12,
  halliGalli: 36,
  hancom: 12,
  intermission: 8,
  intermissionNoControl: 4,
  infiniteStairs: 8,
  kartrider: 36,
  kirby: 8,
  layton: 8,
  leagueOfLegend: 12,
  maplestory: 12,
  mapleRune: 8,
  minigameEx: 16,
  minecraft: 8,
  modooMarble: 8,
  oneUp: 8,
  pokerouge: 8,
  pokemon: 12,
  pokemonTcgPocket: 12,
  resultsAndMain: 83,
  rhythmHero: 8,
  setup: 4,
  speedUp: 8,
  starcraft: 8,
  sudoku: 12,
  superMarioGalaxy: 12,
  superMario: 8,
  success: 4,
  successNoControl: 4,
  suikaGame: 8,
  tetris: 12,
  undertale: 8,
  wiiSports: 8,
  wordle: 52,
  zelda: 12,
} satisfies Record<Exclude<BgmTrack, "gameOver">, number>;

const BGM_TRACK_SOURCE_BEAT_DURATION_SECONDS: Partial<Record<BgmTrack, number>> =
  {
    crossword: DEFAULT_BEAT_DURATION_SECONDS,
    infiniteStairs: DEFAULT_BEAT_DURATION_SECONDS,
    pokerouge: DEFAULT_BEAT_DURATION_SECONDS,
    wordle: DEFAULT_BEAT_DURATION_SECONDS,
  };

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

  async preloadAll() {
    await Promise.all(
      (Object.keys(AUDIO_TRACK_PATHS) as (BgmTrack | SoundEffectTrack)[])
        .filter((track) => !AUDIO_PRELOAD_SKIP_TRACKS.has(track))
        .map((track) => this.loadTrack(track)),
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
    const sourceDurationSeconds = this.getSourceDurationSeconds(track, buffer);
    const playbackRate =
      mode === "once" ? sourceDurationSeconds / targetDurationSeconds : 1;

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
    if (mode === "once") {
      source.start(startAt, 0, sourceDurationSeconds);
    } else {
      source.start(startAt);
    }

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
    const sourceDurationSeconds = this.getSourceDurationSeconds(track, buffer);
    const playbackRate =
      mode === "once" ? sourceDurationSeconds / targetDurationSeconds : 1;
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
    if (mode === "once") {
      source.start(startAt, 0, sourceDurationSeconds);
    } else {
      source.start(startAt);
    }

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
      })
      .catch((error: unknown) => {
        this.loadingBuffers.delete(track);
        throw error;
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

  private getSourceDurationSeconds(track: BgmTrack, buffer: AudioBuffer) {
    if (track === "gameOver") {
      return buffer.duration;
    }

    const sourceBeatDurationSeconds =
      BGM_TRACK_SOURCE_BEAT_DURATION_SECONDS[track];

    if (!sourceBeatDurationSeconds) {
      return buffer.duration;
    }

    return Math.min(
      buffer.duration,
      BGM_TRACK_BEATS[track] * sourceBeatDurationSeconds,
    );
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
