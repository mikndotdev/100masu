"use client";

import { Howl } from "howler";
import { createContext, useCallback, useContext, useEffect, useRef } from "react";

import { SOUND_EFFECTS, type SoundKey } from "@/lib/sounds";
import { useMe } from "@/stores/me";
import { useSoundStore } from "@/stores/sound";

type SoundContextValue = {
  play: (key: SoundKey) => void;
};

const SoundContext = createContext<SoundContextValue | null>(null);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const cache = useRef<Map<SoundKey, Howl>>(new Map());
  const soundEffects = useMe((s) => s.data?.soundEffects);

  useEffect(() => {
    if (soundEffects !== undefined && soundEffects !== null) {
      useSoundStore.getState().setMuted(!soundEffects);
    }
  }, [soundEffects]);

  const play = useCallback((key: SoundKey) => {
    if (useSoundStore.getState().muted) return;

    let sound = cache.current.get(key);
    if (!sound) {
      sound = new Howl({ src: [SOUND_EFFECTS[key]], preload: true, volume: 0.5 });
      cache.current.set(key, sound);
    }
    sound.play();
  }, []);

  useEffect(() => {
    const sounds = cache.current;
    return () => {
      sounds.forEach((sound) => sound.unload());
      sounds.clear();
    };
  }, []);

  return <SoundContext.Provider value={{ play }}>{children}</SoundContext.Provider>;
}

export function useSoundEffect() {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error("useSoundEffect must be used within a SoundProvider");
  }
  return context;
}
