"use client";

import { RHYTHM_DURATION_MS } from "@/hooks/useSynchronizedRhythm";

export type BgmTrack =
  | "fail"
  | "gameOver"
  | "intermission"
  | "resultsAndMain"
  | "success";

const BGM_TRACK_PATHS = {
  fail: "/sounds/fail.mp3",
  gameOver: "/sounds/game-over.mp3",
  intermission: "/sounds/intermission.mp3",
  resultsAndMain: "/sounds/results-and-main.mp3",
  success: "/sounds/success.mp3",
} satisfies Record<BgmTrack, string>;

const BEAT_DURATION_SECONDS = RHYTHM_DURATION_MS / 1000;
const BGM_GAIN = 0.72;
const ATTACK_FADE_SECONDS = 0.012;
const RELEASE_FADE_SECONDS = 0.045;

const BGM_TRACK_BEATS = {
  fail: 4,
  gameOver: 9,
  intermission: 8,
  resultsAndMain: 72,
  success: 4,
} satisfies Record<BgmTrack, number>;

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

type DesiredPlayback = Readonly<{
  mode: BgmPlaybackMode;
  startPolicy: BgmStartPolicy;
  track: BgmTrack;
}>;

class BgmLibrary {
  private audioContext: AudioContext | null = null;
  private buffers = new Map<BgmTrack, AudioBuffer>();
  private loadingBuffers = new Map<BgmTrack, Promise<AudioBuffer>>();
  private currentSource: PlayingSource | null = null;
  private desiredPlayback: DesiredPlayback | null = null;
  private playRequestId = 0;
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
      Object.keys(BGM_TRACK_PATHS).map((track) =>
        this.loadTrack(track as BgmTrack),
      ),
    );
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

    if (
      mode === "loop" &&
      this.currentSource?.track === track &&
      this.currentSource.mode === mode
    ) {
      return;
    }

    const startAt =
      startPolicy === "beat"
        ? this.getNextBeatTime(audioContext.currentTime)
        : audioContext.currentTime;
    const gainNode = audioContext.createGain();
    const source = audioContext.createBufferSource();
    const targetDurationSeconds =
      BGM_TRACK_BEATS[track] * BEAT_DURATION_SECONDS;

    source.buffer = buffer;
    source.loop = mode === "loop";
    source.playbackRate.value = 1;
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    gainNode.gain.setValueAtTime(0, startAt);
    gainNode.gain.linearRampToValueAtTime(
      BGM_GAIN,
      startAt + ATTACK_FADE_SECONDS,
    );
    source.start(startAt);

    this.stopCurrentSource(startAt);
    const stopAt =
      mode === "loop"
        ? Number.POSITIVE_INFINITY
        : startAt + targetDurationSeconds;

    if (mode === "once" && buffer.duration > targetDurationSeconds) {
      this.fadeOutSource(gainNode, stopAt);
      source.stop(stopAt);
    }

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

  stop() {
    if (!this.audioContext) {
      return;
    }

    this.playRequestId += 1;
    this.stopCurrentSource(this.audioContext.currentTime);
    this.currentSource = null;
  }

  private getAudioContext() {
    if (this.audioContext) {
      return this.audioContext;
    }

    this.audioContext = new AudioContext();
    this.timelineOriginSeconds = this.audioContext.currentTime;

    return this.audioContext;
  }

  private async loadTrack(track: BgmTrack) {
    const decodedBuffer = this.buffers.get(track);

    if (decodedBuffer) {
      return decodedBuffer;
    }

    const loadingBuffer = this.loadingBuffers.get(track);

    if (loadingBuffer) {
      return loadingBuffer;
    }

    const nextLoadingBuffer = fetch(BGM_TRACK_PATHS[track])
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
    const elapsedBeats = Math.ceil(elapsedSeconds / BEAT_DURATION_SECONDS);

    return this.timelineOriginSeconds + elapsedBeats * BEAT_DURATION_SECONDS;
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
