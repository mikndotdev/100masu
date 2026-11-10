"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { motion, useAnimate, useReducedMotion } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type MouseEvent,
  type ReactNode,
} from "react";

type FlipOut = () => Promise<void>;

const FlipContext = createContext<{
  register: (flipOut: FlipOut | null) => void;
  flipTo: (href: Route) => void;
} | null>(null);

export function FlipProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const current = useRef<FlipOut | null>(null);

  const value = useMemo(
    () => ({
      register: (flipOut: FlipOut | null) => {
        current.current = flipOut;
      },
      flipTo: (href: Route) => {
        void (current.current?.() ?? Promise.resolve()).then(() => router.push(href));
      },
    }),
    [router],
  );

  return <FlipContext.Provider value={value}>{children}</FlipContext.Provider>;
}

function useFlip() {
  const context = useContext(FlipContext);
  if (!context) {
    throw new Error("useFlip must be used inside FlipProvider");
  }
  return context;
}

export function FlipCard({ children, className }: { children: ReactNode; className?: string }) {
  const { register } = useFlip();
  const reduced = useReducedMotion();
  const [scope, animate] = useAnimate<HTMLDivElement>();

  const flipOut = useCallback(async () => {
    await animate(
      scope.current,
      reduced ? { opacity: 0 } : { rotateY: 90 },
      reduced ? { duration: 0.15 } : { duration: 0.16, ease: [0.77, 0, 0.175, 1] },
    );
  }, [animate, scope, reduced]);

  useEffect(() => {
    register(flipOut);
    return () => register(null);
  }, [register, flipOut]);

  return (
    <motion.div
      ref={scope}
      className={className}
      style={{ transformPerspective: 1200 }}
      initial={reduced ? { opacity: 0 } : { rotateY: -90 }}
      animate={reduced ? { opacity: 1 } : { rotateY: 0 }}
      transition={reduced ? { duration: 0.15 } : { duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function FlipLink({
  href,
  className,
  children,
}: {
  href: Route;
  className?: string;
  children: ReactNode;
}) {
  const { flipTo } = useFlip();
  const router = useRouter();

  useEffect(() => {
    router.prefetch(href);
  }, [router, href]);

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    flipTo(href);
  }

  return (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  );
}
