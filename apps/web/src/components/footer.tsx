"use client";
import mikandevLogo from "@/assets/logo.png";
import { SiGithub } from "@icons-pack/react-simple-icons";

import Image from "next/image";

export default function Footer() {
  return (
    <footer className="flex flex-col items-center justify-center gap-3 bg-secondary py-5">
      <a href="https://mikn.dev" target="_blank" rel="noreferrer" className="block w-28 md:w-36">
        <Image src={mikandevLogo} alt="MikanDev" className="h-auto w-full" />
      </a>
      <div className="flex items-center gap-3 text-primary">
        <p>&copy; 2020-{new Date().getFullYear()} MikanDev</p>
        <a
          href="https://github.com/mikndotdev/100masu"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub"
          className="transition-opacity hover:opacity-70"
        >
          <SiGithub size={20} />
        </a>
      </div>
    </footer>
  );
}
