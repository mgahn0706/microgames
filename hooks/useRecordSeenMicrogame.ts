"use client";

import { useEffect } from "react";

export function useRecordSeenMicrogame({
  isActive,
  microgameId,
  onSeen,
}: Readonly<{
  isActive: boolean;
  microgameId: string;
  onSeen: (microgameId: string) => void;
}>) {
  useEffect(() => {
    if (!isActive) {
      return;
    }

    onSeen(microgameId);
  }, [isActive, microgameId, onSeen]);
}
