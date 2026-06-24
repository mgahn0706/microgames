"use client";

import { useEffect, useState } from "react";

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
    }, 1400);

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
    }, 2400);

    return () => {
      window.clearInterval(cartoonTimer);
    };
  }, [cartoonCount, isPaused]);

  return {
    cartoonIndex,
    messageIndex,
  };
}
