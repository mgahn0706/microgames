"use client";

import { useEffect, useState } from "react";

const LOADING_MESSAGE_INTERVAL_MS = 1400;
const LOADING_CARTOON_INTERVAL_MS = 4800;

export function useLoadingScreenCarousel({
  cartoonCount,
  isPaused,
  messageCount,
}: Readonly<{
  cartoonCount: number;
  isPaused: boolean;
  messageCount: number;
}>) {
  const [cartoonIndex, setCartoonIndex] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (isPaused || messageCount <= 1) {
      return;
    }

    const messageTimer = window.setInterval(() => {
      setMessageIndex(
        (currentMessageIndex) => (currentMessageIndex + 1) % messageCount,
      );
    }, LOADING_MESSAGE_INTERVAL_MS);

    return () => {
      window.clearInterval(messageTimer);
    };
  }, [isPaused, messageCount]);

  useEffect(() => {
    if (isPaused || cartoonCount <= 1) {
      return;
    }

    const cartoonTimer = window.setInterval(() => {
      setCartoonIndex(
        (currentCartoonIndex) => (currentCartoonIndex + 1) % cartoonCount,
      );
    }, LOADING_CARTOON_INTERVAL_MS);

    return () => {
      window.clearInterval(cartoonTimer);
    };
  }, [cartoonCount, isPaused]);

  return {
    cartoonIndex,
    messageIndex,
  };
}
