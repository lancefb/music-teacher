import * as React from 'react';
import * as Tone from 'tone';
import { WebMidi } from 'webmidi';
import { PianoKeyboard } from '@/components/shared/piano-keyboard';

interface PracticeKeyboardProps {
  selectedMidiInput: string | null;
  onNextNote: () => void;
  correctNote?: string | null;
  isWaiting: boolean;
  playbackNotes?: string[];
}

export function PracticeKeyboard({ selectedMidiInput, onNextNote, correctNote, isWaiting, playbackNotes = [] }: PracticeKeyboardProps) {
  const [activeNotes, setActiveNotes] = React.useState<string[]>([]);
  const [incorrectNote, setIncorrectNote] = React.useState<string | null>(null);
  const synth = React.useRef<Tone.PolySynth | null>(null);

  React.useEffect(() => {
    synth.current = new Tone.PolySynth(Tone.Synth).toDestination();
    return () => { synth.current?.dispose(); };
  }, []);

  const handleNoteOn = React.useCallback((e: any) => {
    const noteName = e.note.identifier;
    synth.current?.triggerAttack(noteName, Tone.now());
    setActiveNotes(prev => Array.from(new Set([...prev, noteName])));

    if (isWaiting && correctNote) {
      const playedMidi = Tone.Frequency(noteName).toMidi();
      const correctMidi = Tone.Frequency(correctNote).toMidi();
      if (playedMidi === correctMidi) {
        setIncorrectNote(null);
        onNextNote();
      } else {
        setIncorrectNote(noteName);
        setTimeout(() => setIncorrectNote(null), 300);
      }
    }
  }, [isWaiting, correctNote, onNextNote]);

  const handleNoteOff = React.useCallback((e: any) => {
    const noteName = e.note.identifier;
    synth.current?.triggerRelease(noteName, Tone.now());
    setActiveNotes(prev => prev.filter(n => n !== noteName));
  }, []);

  React.useEffect(() => {
    if (!selectedMidiInput || !WebMidi.enabled) return;
    const input = WebMidi.getInputById(selectedMidiInput);
    if (input) {
      input.addListener('noteon', handleNoteOn);
      input.addListener('noteoff', handleNoteOff);
      return () => {
        input.removeListener('noteon', handleNoteOn);
        input.removeListener('noteoff', handleNoteOff);
      };
    }
  }, [selectedMidiInput, handleNoteOn, handleNoteOff]);

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-center px-2">
        <h3 className="text-sm font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-widest">Keyboard Monitor</h3>
        {isWaiting && correctNote && (
          <div className="text-xs font-mono bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))] px-2 py-1 rounded">
            Target: {correctNote}
          </div>
        )}
      </div>
      <PianoKeyboard
        startNote="C3"
        endNote="B5"
        highlightedNotes={[...activeNotes, ...playbackNotes]}
        correctNote={isWaiting ? correctNote : undefined}
        incorrectNote={isWaiting ? incorrectNote : undefined}
      />
    </div>
  );
}
