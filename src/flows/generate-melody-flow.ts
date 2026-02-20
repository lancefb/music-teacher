export type MusicalKey = 'C' | 'G' | 'D' | 'A' | 'E' | 'B' | 'F' | 'Bb' | 'Eb' | 'Ab' | 'Db';

export interface GenerateMelodyInput {
  key: MusicalKey;
  length?: number;
  previousMelody?: string[];
  midiMax?: number; // upper MIDI bound for note range (default 83 = B5)
}

export interface GenerateMelodyOutput {
  notes: string[];
  key: MusicalKey;
}

// Gamification plumbing — not displayed yet
export interface EarTrainerStats {
  totalAttempts: number;
  correctAttempts: number;
  currentStreak: number;
  bestStreak: number;
}

// Major scale semitone offsets from root
const MAJOR_SCALE_OFFSETS = new Set([0, 2, 4, 5, 7, 9, 11]);

// Semitone of each key's root, relative to C
const KEY_ROOT_SEMITONE: Record<MusicalKey, number> = {
  'C':   0,
  'Db':  1,
  'D':   2,
  'Eb':  3,
  'E':   4,
  'F':   5,
  'G':   7,
  'Ab':  8,
  'A':   9,
  'Bb': 10,
  'B':  11,
};

// Flat-first names to match sample filenames
const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[midi % 12]}${octave}`;
}

// Returns all unique diatonic notes for the key between C4 (MIDI 60) and midiMax
function getDiatonicPool(key: MusicalKey, midiMax = 83): string[] {
  const rootSemitone = KEY_ROOT_SEMITONE[key];
  const pool: string[] = [];
  for (let midi = 60; midi <= midiMax; midi++) {
    const relativeToRoot = (midi % 12 - rootSemitone + 12) % 12;
    if (MAJOR_SCALE_OFFSETS.has(relativeToRoot)) {
      pool.push(midiToNoteName(midi));
    }
  }
  return pool; // already sorted ascending, all unique
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function generateMelody(input: GenerateMelodyInput): GenerateMelodyOutput {
  const { key, length = 3, previousMelody, midiMax = 83 } = input;
  const pool = getDiatonicPool(key, midiMax);
  const safeLength = Math.min(length, pool.length);

  let melody: string[];
  let attempts = 0;
  do {
    melody = shuffle(pool).slice(0, safeLength);
    attempts++;
  } while (
    attempts < 10 &&
    previousMelody !== undefined &&
    melody.join(',') === previousMelody.join(',')
  );

  return { notes: melody, key };
}
