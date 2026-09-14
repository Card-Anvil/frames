import { useCallback, useState } from "react";

/** Sample strings the studio draws in single-line boxes. */
export type SampleText = Readonly<Record<string, string>>;

const STORAGE_KEY = "frame-studio.sampleText";

export const DEFAULT_SAMPLE: SampleText = {
  title: "Serra Angel",
  type: "Creature — Angel",
  nicknameTitle: "The Fallen",
  keyword: "Flying, vigilance",
};

/** Presets worth checking a box against: typical, long, and worst case. */
export const PRESETS: Readonly<Record<string, SampleText>> = {
  typical: DEFAULT_SAMPLE,
  long: {
    title: "Rona, Sheoldred's Faithful",
    type: "Legendary Creature — Phyrexian Human Wizard",
    nicknameTitle: "Herald of the Machine Orthodoxy",
    keyword: "Flying, first strike, lifelink",
  },
  worst: {
    title: "Ramirez DePietro, Pillager of the Coast",
    type: "Legendary Artifact Creature — Phyrexian Horror Berserker",
    nicknameTitle: "Ramirez DePietro, Pillager of the Coast",
    keyword: "Flying, vigilance, trample, haste, lifelink",
  },
};

function load(): SampleText {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_SAMPLE;
    }
    const parsed: unknown = JSON.parse(stored);
    return typeof parsed === "object" && parsed !== null
      ? { ...DEFAULT_SAMPLE, ...(parsed as Record<string, string>) }
      : DEFAULT_SAMPLE;
  } catch {
    // Private windows and blocked site data both throw here; the defaults are
    // perfectly usable, so this is never worth surfacing.
    return DEFAULT_SAMPLE;
  }
}

export function useSampleText(): {
  sampleText: SampleText;
  setField: (key: string, value: string) => void;
  applyPreset: (name: string) => void;
} {
  const [sampleText, setSampleText] = useState<SampleText>(load);

  const persist = useCallback((next: SampleText) => {
    setSampleText(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* nothing here is worth losing the edit over */
    }
  }, []);

  return {
    sampleText,
    setField: useCallback(
      (key: string, value: string) => {
        persist({ ...sampleText, [key]: value });
      },
      [sampleText, persist],
    ),
    applyPreset: useCallback(
      (name: string) => {
        persist(PRESETS[name] ?? DEFAULT_SAMPLE);
      },
      [persist],
    ),
  };
}
