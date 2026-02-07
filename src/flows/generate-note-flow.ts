export type Clef = 'treble' | 'bass';

const NOTES_BY_CLEF = {
  treble: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5'],
  bass: ['E2', 'F2', 'G2', 'A2', 'B2', 'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4'],
};

const NOTES_PER_CLEF = 4;

export interface GenerateNoteInput {
  previousNote?: string;
  currentClef: Clef;
  notesInCurrentClef: number;
}

export interface GenerateNoteOutput {
  note: string;
  clef: Clef;
}

export async function generateNote(input: GenerateNoteInput): Promise<GenerateNoteOutput> {
  let { currentClef, notesInCurrentClef, previousNote } = input;

  // Switch clef after NOTES_PER_CLEF correct answers
  if (notesInCurrentClef >= NOTES_PER_CLEF) {
    currentClef = currentClef === 'treble' ? 'bass' : 'treble';
  }

  // Select a random note from the chosen clef
  const possibleNotes = NOTES_BY_CLEF[currentClef];
  let selectedNote = possibleNotes[Math.floor(Math.random() * possibleNotes.length)];

  // Ensure the new note is different from the previous one
  if (previousNote && selectedNote === previousNote && possibleNotes.length > 1) {
    let newNote;
    do {
      newNote = possibleNotes[Math.floor(Math.random() * possibleNotes.length)];
    } while (newNote === previousNote);
    selectedNote = newNote;
  }

  return {
    note: selectedNote,
    clef: currentClef,
  };
}
