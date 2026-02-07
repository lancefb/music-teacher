import { ALL_NOTES } from '@/lib/music-theory';

const INTERVALS = {
  'Minor 2nd': 1,
  'Major 2nd': 2,
  'Minor 3rd': 3,
  'Major 3rd': 4,
  'Perfect 4th': 5,
  'Tritone': 6,
  'Perfect 5th': 7,
  'Minor 6th': 8,
  'Major 6th': 9,
  'Minor 7th': 10,
  'Major 7th': 11,
  'Octave': 12,
} as const;

const INTERVAL_NAMES = Object.keys(INTERVALS) as (keyof typeof INTERVALS)[];

export interface GenerateIntervalInput {
  previousBaseNote?: string;
}

export interface GenerateIntervalOutput {
  baseNote: string;
  upperNote: string;
  interval: string;
  possibleAnswers: string[];
}

export async function generateInterval(input: GenerateIntervalInput): Promise<GenerateIntervalOutput> {
  // Determine the base note
  const baseNotes = ['E4', 'F4'];
  let baseNote = baseNotes[Math.floor(Math.random() * baseNotes.length)];
  if (input.previousBaseNote && baseNote === input.previousBaseNote) {
    baseNote = baseNotes.find(n => n !== input.previousBaseNote) || baseNote;
  }
  const baseNoteIndex = ALL_NOTES.indexOf(baseNote.slice(0, -1) as any);
  const baseNoteOctave = parseInt(baseNote.slice(-1));

  // Select a random interval
  const correctIntervalName = INTERVAL_NAMES[Math.floor(Math.random() * INTERVAL_NAMES.length)];
  const intervalSemitones = INTERVALS[correctIntervalName];

  // Calculate the upper note
  const upperNoteIndex = (baseNoteIndex + intervalSemitones);
  const upperNoteOctave = baseNoteOctave + Math.floor(upperNoteIndex / 12);
  const upperNoteName = ALL_NOTES[upperNoteIndex % 12];
  const upperNote = `${upperNoteName}${upperNoteOctave}`;

  // Generate multiple choice answers
  const otherIntervals = INTERVAL_NAMES.filter(name => name !== correctIntervalName);
  const shuffled = otherIntervals.sort(() => 0.5 - Math.random());
  const wrongAnswers = shuffled.slice(0, 3);
  const possibleAnswers = [correctIntervalName, ...wrongAnswers].sort(() => 0.5 - Math.random());

  return {
    baseNote,
    upperNote,
    interval: correctIntervalName,
    possibleAnswers,
  };
}
