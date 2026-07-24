"use client";

import { Howl } from "howler";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { SOUND_EFFECTS, type SoundKey } from "@/lib/sounds";

type SoundContextValue = {
  play: (key: SoundKey) => void;
  muted: boolean;
  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;
};

const STORAGE_KEY = "100masu:sound-muted";

const SoundContext = createContext<SoundContextValue | null>(null);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const cache = useRef<Map<SoundKey, Howl>>(new Map());
  const [muted, setMutedState] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setMutedState(stored === "true");
    }
  }, []);

  const setMuted = useCallback((next: boolean) => {
    setMutedState(next);
    window.localStorage.setItem(STORAGE_KEY, String(next));
  }, []);

  const toggleMuted = useCallback(() => {
    setMutedState((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const play = useCallback(
    (key: SoundKey) => {
      if (muted) return;

      let sound = cache.current.get(key);
      if (!sound) {
        sound = new Howl({ src: [SOUND_EFFECTS[key]], preload: true, volume: 0.5 });
        cache.current.set(key, sound);
      }
      sound.play();
    },
    [muted],
  );

  useEffect(() => {
    const sounds = cache.current;
    return () => {
      sounds.forEach((sound) => sound.unload());
      sounds.clear();
    };
  }, []);

  return (
    <SoundContext.Provider value={{ play, muted, setMuted, toggleMuted }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSoundEffect() {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error("useSoundEffect must be used within a SoundProvider");
  }
  return context;
}
