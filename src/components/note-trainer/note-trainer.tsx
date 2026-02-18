import * as React from 'react';
import { WebMidi } from 'webmidi';
import { generateNote, type GenerateNoteOutput, type ClefMode } from '@/flows/generate-note-flow';
import { StaffDisplay } from '@/components/shared/staff-display';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Music, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NoteTrainerProps {
    selectedMidiInput: string | null;
}

export default function NoteTrainer({ selectedMidiInput }: NoteTrainerProps) {
  const [problem, setProblem] = React.useState<GenerateNoteOutput | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [feedback, setFeedback] = React.useState<'correct' | 'incorrect' | 'waiting' | null>('waiting');
  const [notesInCurrentClef, setNotesInCurrentClef] = React.useState(0);
  const [clefMode, setClefMode] = React.useState<ClefMode>('auto');
  const currentMidiInput = React.useRef<any>(null);

  const { toast } = useToast();

  const loadNewProblem = React.useCallback(async (currentProblem?: GenerateNoteOutput | null) => {
    setIsLoading(true);
    setFeedback('waiting');

    let notesCount = notesInCurrentClef;
    let clef = currentProblem?.clef || 'treble';

    if (currentProblem) {
       if (problem?.clef === currentProblem.clef) {
        notesCount++;
       } else {
        notesCount = 1;
       }
    } else {
      notesCount = 0;
    }

    try {
      const newProblem = await generateNote({
          previousNote: currentProblem?.note,
          currentClef: clef,
          notesInCurrentClef: notesCount,
          mode: clefMode,
      });

      setProblem(newProblem);

      if (currentProblem && newProblem.clef !== currentProblem.clef) {
          setNotesInCurrentClef(1);
      } else {
          setNotesInCurrentClef(notesCount);
      }

    } catch (error) {
      console.error('Failed to generate new note:', error);
      toast({
        title: 'Error',
        description: 'Failed to load a new problem. Please try again.',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  }, [toast, notesInCurrentClef, problem?.clef, clefMode]);

  // Initial problem load
  React.useEffect(() => {
    loadNewProblem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMidiInput = React.useCallback((playedNote: string) => {
    if (!problem || isLoading || feedback === 'correct') return;

    if (playedNote === problem.note) {
      setFeedback('correct');
      setTimeout(() => {
        loadNewProblem(problem);
      }, 500);

    } else {
      setFeedback('incorrect');
      setTimeout(() => setFeedback('waiting'), 500);
    }
  }, [problem, isLoading, feedback, loadNewProblem]);


  React.useEffect(() => {
    const cleanup = () => {
      if (currentMidiInput.current) {
        currentMidiInput.current.removeListener('noteon');
        currentMidiInput.current = null;
      }
    };

    cleanup();

    if (selectedMidiInput && WebMidi.enabled) {
        const input = WebMidi.getInputById(selectedMidiInput);
        if (input) {
            currentMidiInput.current = input;
            const newListener = (e: any) => {
                const noteName = e.note.name + e.note.octave;
                handleMidiInput(noteName);
            };
            input.addListener('noteon', newListener);
        }
    }

    return cleanup;
  }, [selectedMidiInput, handleMidiInput]);


  const handleClefModeChange = React.useCallback((mode: ClefMode) => {
    setClefMode(mode);
    setNotesInCurrentClef(0);
    setProblem(null);
    setIsLoading(true);
    setFeedback('waiting');
    // Generate a fresh note in the new mode
    generateNote({
      currentClef: mode === 'auto' ? 'treble' : mode,
      notesInCurrentClef: 0,
      mode,
    }).then((newProblem) => {
      setProblem(newProblem);
      setNotesInCurrentClef(1);
      setIsLoading(false);
    });
  }, []);

  const renderContent = () => {
    if (isLoading && !problem) {
      return (
         <StaffDisplay
          notes={[]}
          clef={'treble'}
          disabled={true}
          title={<div className="text-xl">Loading first note...</div>}
        />
      )
    }

    if (!problem && !isLoading) {
        return (
            <div className="text-center p-8">
                Something went wrong loading the first problem.
                <Button onClick={() => loadNewProblem()}>Try again</Button>
            </div>
        )
    }

    return (
      <>
        <StaffDisplay
          notes={problem ? [problem.note] : []}
          clef={problem?.clef || 'treble'}
          disabled={isLoading || !problem}
          title={
             <div className="flex items-center justify-center gap-2 text-xl">
                {!isLoading && problem && feedback === 'waiting' && <span>Play the note on your keyboard</span>}
                {!isLoading && feedback === 'correct' && <span className="text-green-600 flex items-center gap-2"><CheckCircle /> Correct!</span>}
                {!isLoading && feedback === 'incorrect' && <span className="text-red-600 flex items-center gap-2"><XCircle /> Try Again</span>}
            </div>
          }
        />
        <Button onClick={() => loadNewProblem(problem)} disabled={isLoading}>
          Skip Note
        </Button>
      </>
    );
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Music className="w-6 h-6" />
          <span>Sight-Reading Trainer</span>
        </CardTitle>
        <div className="flex gap-1">
          {(['auto', 'treble', 'bass'] as const).map((mode) => (
            <Button
              key={mode}
              size="sm"
              variant={clefMode === mode ? 'default' : 'outline'}
              onClick={() => handleClefModeChange(mode)}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        {renderContent()}
      </CardContent>
    </Card>
  );
}
