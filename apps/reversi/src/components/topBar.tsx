import LanguageSwitch from "@100masu/ui/components/languageSwitch";
import SoundToggle from "@100masu/ui/components/soundToggle";

export default function TopBar() {
  return (
    <div className="hidden w-full items-center justify-end gap-2 md:flex">
      <LanguageSwitch />
      <SoundToggle />
    </div>
  );
}
