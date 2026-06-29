"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MICROGAME_CLEAR_EVENT,
  MICROGAME_FAILURE_EVENT,
} from "@/hooks/useMicrogameInput";

export type TicTacToeMark = "O" | "X";
export type TicTacToeCell = Readonly<{
  id: number;
  mark: TicTacToeMark | null;
  strokeKey: number;
}>;

type GameStatus = "playing" | "resolved";

const BOARD_SIZE = 9;
const AI_MOVE_DELAY_MS = 260;
const DRAW_RESET_DELAY_MS = 430;
const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;
const SCRIBBLE_SOUND = "/games/tic-tac-toe/sounds/scribble.mp3";

function createBoard(): TicTacToeCell[] {
  return Array.from({ length: BOARD_SIZE }, (_, id) => ({
    id,
    mark: null,
    strokeKey: 0,
  }));
}

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function dispatchFailure() {
  window.dispatchEvent(new CustomEvent(MICROGAME_FAILURE_EVENT));
}

function createAudio() {
  const audio = new Audio(SCRIBBLE_SOUND);

  audio.preload = "auto";
  audio.volume = 0.72;

  return audio;
}

function playAudio(audio: HTMLAudioElement | null) {
  if (!audio) {
    return;
  }

  audio.currentTime = 0;
  audio.play().catch(() => {
    // The first browser interaction may be required before SFX can play.
  });
}

function getWinner(board: readonly TicTacToeCell[]) {
  const winningLine = WIN_LINES.find(([first, second, third]) => {
    const mark = board[first].mark;

    return Boolean(
      mark && mark === board[second].mark && mark === board[third].mark,
    );
  });

  if (!winningLine) {
    return null;
  }

  return {
    line: winningLine,
    mark: board[winningLine[0]].mark,
  };
}

function isBoardFull(board: readonly TicTacToeCell[]) {
  return board.every((cell) => cell.mark !== null);
}

function getEmptyIndexes(board: readonly TicTacToeCell[]) {
  return board.filter((cell) => cell.mark === null).map((cell) => cell.id);
}

function placeMark(
  board: readonly TicTacToeCell[],
  cellIndex: number,
  mark: TicTacToeMark,
) {
  return board.map((cell) =>
    cell.id === cellIndex
      ? {
          ...cell,
          mark,
          strokeKey: cell.strokeKey + 1,
        }
      : cell,
  );
}

function pickRandomMove(board: readonly TicTacToeCell[]) {
  const emptyIndexes = getEmptyIndexes(board);

  if (emptyIndexes.length === 0) {
    return null;
  }

  return emptyIndexes[Math.floor(Math.random() * emptyIndexes.length)];
}

function getLineKey(line: readonly [number, number, number] | null) {
  return line ? line.join("-") : null;
}

export function useTicTacToeGame({
  isActive,
}: Readonly<{ isActive: boolean }>) {
  const [board, setBoard] = useState(createBoard);
  const [status, setStatus] = useState<GameStatus>("playing");
  const [turn, setTurn] = useState<TicTacToeMark>("X");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const drawResetTimerRef = useRef<number | null>(null);
  const isActiveRef = useRef(isActive);
  const latestBoardRef = useRef(board);
  const statusRef = useRef(status);
  const turnRef = useRef(turn);

  useEffect(() => {
    audioRef.current = createAudio();
  }, []);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    latestBoardRef.current = board;
  }, [board]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    turnRef.current = turn;
  }, [turn]);

  const winner = useMemo(() => getWinner(board), [board]);
  const winningLineKey = getLineKey(winner?.line ?? null);

  const clearDrawResetTimer = useCallback(() => {
    if (drawResetTimerRef.current === null) {
      return;
    }

    window.clearTimeout(drawResetTimerRef.current);
    drawResetTimerRef.current = null;
  }, []);

  const resetBoardForDraw = useCallback(() => {
    clearDrawResetTimer();
    setBoard(createBoard());
    setTurn("X");
    setStatus("playing");
  }, [clearDrawResetTimer]);

  const resolveBoard = useCallback(
    (nextBoard: readonly TicTacToeCell[]) => {
      const nextWinner = getWinner(nextBoard);

      if (nextWinner?.mark === "X") {
        setStatus("resolved");
        dispatchClear();
        return true;
      }

      if (nextWinner?.mark === "O") {
        setStatus("resolved");
        dispatchFailure();
        return true;
      }

      if (isBoardFull(nextBoard)) {
        drawResetTimerRef.current = window.setTimeout(() => {
          resetBoardForDraw();
        }, DRAW_RESET_DELAY_MS);
        return true;
      }

      return false;
    },
    [resetBoardForDraw],
  );

  const playCell = useCallback(
    (cellIndex: number) => {
      if (
        !isActiveRef.current ||
        statusRef.current !== "playing" ||
        turnRef.current !== "X" ||
        latestBoardRef.current[cellIndex].mark !== null
      ) {
        return;
      }

      clearDrawResetTimer();
      const nextBoard = placeMark(latestBoardRef.current, cellIndex, "X");

      playAudio(audioRef.current);
      setBoard(nextBoard);
      latestBoardRef.current = nextBoard;

      if (resolveBoard(nextBoard)) {
        return;
      }

      setTurn("O");
    },
    [clearDrawResetTimer, resolveBoard],
  );

  useEffect(() => {
    if (!isActive || status !== "playing" || turn !== "O") {
      return;
    }

    const aiTimer = window.setTimeout(() => {
      const cellIndex = pickRandomMove(latestBoardRef.current);

      if (
        cellIndex === null ||
        !isActiveRef.current ||
        statusRef.current !== "playing" ||
        turnRef.current !== "O"
      ) {
        return;
      }

      const nextBoard = placeMark(latestBoardRef.current, cellIndex, "O");

      playAudio(audioRef.current);
      setBoard(nextBoard);
      latestBoardRef.current = nextBoard;

      if (resolveBoard(nextBoard)) {
        return;
      }

      setTurn("X");
    }, AI_MOVE_DELAY_MS);

    return () => {
      window.clearTimeout(aiTimer);
    };
  }, [isActive, resolveBoard, status, turn]);

  useEffect(() => {
    if (isActive) {
      return;
    }

    clearDrawResetTimer();
  }, [clearDrawResetTimer, isActive]);

  return {
    board,
    playCell,
    status,
    turn,
    winningLineKey,
  } as const;
}
