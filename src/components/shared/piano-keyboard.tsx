import * as React from 'react';
import * as Tone from 'tone';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface PianoKeyboardProps {
  highlightedNotes?: string[];
  startNote?: string;
  endNote?: string;
  correctNote?: string | null;
  incorrectNote?: string | null;
}

export function PianoKeyboard({
  highlightedNotes = [],
  startNote = 'C3',
  endNote = 'B5',
  correctNote,
  incorrectNote,
}: PianoKeyboardProps) {
  const synth = React.useRef<Tone.PolySynth | null>(null);
  const [isSynthReady, setIsSynthReady] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    const initializeSynth = async () => {
      try {
        await Tone.start();
        synth.current = new Tone.PolySynth(Tone.Synth).toDestination();
        setIsSynthReady(true);
      } catch (error) {
        toast({
          title: 'Audio Error',
          description: 'Could not initialize audio for keyboard.',
          variant: 'destructive',
        });
      }
    };
    if (typeof window !== 'undefined' && !isSynthReady) {
      initializeSynth();
    }
  }, [toast, isSynthReady]);

  const playNote = (note: string) => {
    if (isSynthReady && synth.current) {
      synth.current.triggerAttackRelease(note, '8n');
    }
  };

  const isHighlighted = (note: string) => {
    const isSameNote = (n1: string, n2: string) => {
       try {
         return Tone.Frequency(n1).toMidi() === Tone.Frequency(n2).toMidi();
       } catch {
         return false;
       }
    };

    if (correctNote && isSameNote(note, correctNote)) return 'correct';
    if (incorrectNote && isSameNote(note, incorrectNote)) return 'incorrect';
    if (highlightedNotes.some(hn => isSameNote(note, hn))) return 'highlighted';

    return false;
  };

  const getNoteRange = () => {
    const range: {note: string, midi: number}[] = [];
    const startMidi = Tone.Frequency(startNote).toMidi();
    const endMidi = Tone.Frequency(endNote).toMidi();

    for (let i = startMidi; i <= endMidi; i++) {
        try {
            const noteName = Tone.Frequency(i, 'midi').toNote();
            range.push({ note: noteName, midi: i });
        } catch (e) {
            // skip invalid midi note
        }
    }
    return range;
  };

  const noteRange = getNoteRange();
  const whiteKeys = noteRange.filter(n => !n.note.includes('#') && !n.note.includes('b'));

  const WHITE_KEY_WIDTH = 3; // rem
  const BLACK_KEY_WIDTH = 1.75; // rem

  const renderBlackKeys = () => {
    let whiteKeyCounter = 0;
    return noteRange.map(({ note }) => {
      const isBlackKey = note.includes('#') || note.includes('b');
      const noteName = note.slice(0, -1);

      if (!isBlackKey) {
        whiteKeyCounter++;
        return null;
      }

      if (noteName === 'E#' || noteName === 'B#' || noteName === 'Fb' || noteName === 'Cb') {
         return null;
      }

      const leftPosition = (whiteKeyCounter * WHITE_KEY_WIDTH) - (BLACK_KEY_WIDTH / 2);
      const highlightStatus = isHighlighted(note);

      return (
        <div
          key={note}
          onClick={(e) => { e.stopPropagation(); playNote(note); }}
          className={cn(
            'absolute z-10 bg-black rounded-b-md cursor-pointer transition-colors duration-100 ease-in-out flex items-end justify-center pb-1 text-xs text-white',
            'hover:bg-gray-700',
            highlightStatus === 'highlighted' && 'bg-blue-500',
            highlightStatus === 'correct' && 'bg-green-500',
            highlightStatus === 'incorrect' && 'bg-red-500',
          )}
          style={{
            left: `${leftPosition}rem`,
            width: `${BLACK_KEY_WIDTH}rem`,
            height: '8rem',
          }}
        >
          <span className="pointer-events-none">{note.slice(0,2)}</span>
        </div>
      );
    });
  };

  return (
    <div className="relative flex justify-center bg-gray-200 p-4 rounded-lg shadow-inner w-full overflow-x-auto">
      <div className="relative flex" style={{ width: `${whiteKeys.length * WHITE_KEY_WIDTH}rem`}}>
        {whiteKeys.map(({ note }) => {
           const highlightStatus = isHighlighted(note);
          return (
            <div
              key={note}
              onClick={() => playNote(note)}
              className={cn(
                'relative border-l border-t border-b border-gray-400 bg-white cursor-pointer transition-colors duration-100 ease-in-out flex items-end justify-center pb-2 text-sm text-gray-500',
                'hover:bg-gray-100',
                 highlightStatus === 'highlighted' && 'bg-blue-200',
                 highlightStatus === 'correct' && 'bg-green-200',
                 highlightStatus === 'incorrect' && 'bg-red-200',
              )}
              style={{
                width: `${WHITE_KEY_WIDTH}rem`,
                height: '12rem',
              }}
            >
              <span className="pointer-events-none">{note}</span>
            </div>
          )
        })}
        {renderBlackKeys()}
      </div>
    </div>
  );
}
