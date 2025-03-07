
export interface DrumSound {
  id: string;
  name: string;
  shortName: string;
  soundFile: string;
  color: string;
}

export interface Step {
  id: number;
  active: boolean;
}

export interface Pattern {
  id: string;
  name: string;
  bpm: number;
  steps: Record<string, Step[]>;
}

export interface SavedPattern extends Pattern {
  date: string;
}
