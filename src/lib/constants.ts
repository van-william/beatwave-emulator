import { DrumSound } from "../types";

export const TOTAL_STEPS = 16;
export const DEFAULT_BPM = 120;

export const DRUM_SOUNDS: DrumSound[] = [
  {
    id: "kick",
    name: "Kick Drum",
    shortName: "BD",
    soundFile: "808/kick.mp3",
    color: "bg-tr808-orange"
  },
  {
    id: "snare",
    name: "Snare Drum",
    shortName: "SD",
    soundFile: "808/snare.mp3",
    color: "bg-tr808-orange-light"
  },
  {
    id: "clap",
    name: "Clap",
    shortName: "CP",
    soundFile: "808/clap.mp3",
    color: "bg-tr808-orange-light"
  },
  {
    id: "rim",
    name: "Rim Shot",
    shortName: "RS",
    soundFile: "808/rimshot.mp3",
    color: "bg-tr808-orange-light"
  },
  {
    id: "tom-low",
    name: "Low Tom",
    shortName: "LT",
    soundFile: "808/tom-low.mp3",
    color: "bg-tr808-amber"
  },
  {
    id: "tom-mid",
    name: "Mid Tom",
    shortName: "MT",
    soundFile: "808/tom-mid.mp3",
    color: "bg-tr808-amber"
  },
  {
    id: "tom-hi",
    name: "High Tom",
    shortName: "HT",
    soundFile: "808/tom-high.mp3",
    color: "bg-tr808-amber"
  },
  {
    id: "ch",
    name: "Closed Hat",
    shortName: "CH",
    soundFile: "808/hihat-closed.mp3",
    color: "bg-tr808-amber"
  },
  {
    id: "oh",
    name: "Open Hat",
    shortName: "OH",
    soundFile: "808/hihat-open.mp3",
    color: "bg-tr808-cream"
  },
  {
    id: "cymbal",
    name: "Cymbal",
    shortName: "CY",
    soundFile: "808/cymbal.mp3",
    color: "bg-tr808-cream"
  },
  {
    id: "cowbell",
    name: "Cowbell",
    shortName: "CB",
    soundFile: "808/cowbell.mp3",
    color: "bg-tr808-cream"
  },
  {
    id: "clave",
    name: "Clave",
    shortName: "CL",
    soundFile: "808/clave.mp3",
    color: "bg-tr808-cream"
  }
];

export const INITIAL_PATTERN = {
  id: "default",
  name: "Pattern 1",
  bpm: DEFAULT_BPM,
  steps: DRUM_SOUNDS.reduce((acc, sound) => {
    acc[sound.id] = Array.from({ length: TOTAL_STEPS }, (_, i) => ({
      id: i,
      active: false
    }));
    return acc;
  }, {} as Record<string, { id: number; active: boolean }[]>)
};
