"use client";

import { useTranslation } from "react-i18next";

import Segmented from "@/components/segmented";
import { COLOR_CHOICES, type ColorChoice } from "@/lib/game";

const COLOR_LABEL = { B: "reversi.black", W: "reversi.white", random: "reversi.random" } as const;

export function ColorPicker({
  value,
  onChange,
}: {
  value: ColorChoice;
  onChange: (value: ColorChoice) => void;
}) {
  const { t } = useTranslation();
  return (
    <Segmented
      label={t("reversi.colorLabel")}
      options={COLOR_CHOICES}
      value={value}
      onChange={onChange}
      render={(option) => t(COLOR_LABEL[option])}
      hint={t("reversi.blackFirst")}
    />
  );
}
