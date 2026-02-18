import * as React from 'react';
import * as Tone from 'tone';
import { OpenSheetMusicDisplay as OSMD, Note, type GraphicalNote } from 'opensheetmusicdisplay';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Library, Upload, Play, Square, Mic2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ScoreDisplay, type ScoreDisplayHandle } from './score-display';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { PracticeKeyboard } from './practice-keyboard';

type PracticeMode = 'inactive' | 'playback' | 'waitForMe';

const osmdNoteToToneNote = (osmdNote: Note): string | null => {
  if (osmdNote.isRest() || !osmdNote?.halfTone) return null;
  const midiNumber = osmdNote.halfTone + 12;
  return Tone.Frequency(midiNumber, 'midi').toNote();
};

interface SongTrainerProps {
  selectedMidiInput: string | null;
}

export default function SongTrainer({ selectedMidiInput }: SongTrainerProps) {
  const [musicXml, setMusicXml] = React.useState<string | null>(null);
  const [practiceMode, setPracticeMode] = React.useState<PracticeMode>('inactive');
  const [startMeasure, setStartMeasure] = React.useState(1);
  const [endMeasure, setEndMeasure] = React.useState(4);
  const [totalMeasures, setTotalMeasures] = React.useState(0);
  const [waitNote, setWaitNote] = React.useState<string | null>(null);
  const [bpm, setBpm] = React.useState(50);
  const [playbackNotes, setPlaybackNotes] = React.useState<string[]>([]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const scoreRef = React.useRef<ScoreDisplayHandle>(null);
  const synthRef = React.useRef<Tone.PolySynth | null>(null);

  const highlightedNotesRef = React.useRef<GraphicalNote[]>([]);

  const { toast } = useToast();

  const highlightCursorNotes = React.useCallback(() => {
    const cursor = scoreRef.current?.cursor;
    if (!cursor) return;

    // Reset previously highlighted notes to black
    for (const gNote of highlightedNotesRef.current) {
      try { gNote.setColor('#000000', { applyToNoteheads: true, applyToStem: true, applyToBeams: true }); } catch {}
    }
    highlightedNotesRef.current = [];

    // Highlight current notes in blue and update keyboard
    const keyboardNotes: string[] = [];
    try {
      const gNotes = cursor.GNotesUnderCursor();
      for (const gNote of gNotes) {
        gNote.setColor('#3b82f6', { applyToNoteheads: true, applyToStem: true, applyToBeams: true });
        highlightedNotesRef.current.push(gNote);
      }
      const notes = cursor.NotesUnderCursor();
      for (const note of notes) {
        if (!note.isRest()) {
          const toneNote = osmdNoteToToneNote(note);
          if (toneNote) keyboardNotes.push(toneNote);
        }
      }
    } catch {}
    setPlaybackNotes(keyboardNotes);
  }, []);

  const clearHighlights = React.useCallback(() => {
    for (const gNote of highlightedNotesRef.current) {
      try { gNote.setColor('#000000', { applyToNoteheads: true, applyToStem: true, applyToBeams: true }); } catch {}
    }
    highlightedNotesRef.current = [];
  }, []);

  React.useEffect(() => {
    synthRef.current = new Tone.PolySynth(Tone.Synth).toDestination();
    return () => {
      Tone.getTransport().stop();
      Tone.getTransport().cancel();
      synthRef.current?.dispose();
    };
  }, []);

  const stopPractice = React.useCallback(() => {
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    Tone.getTransport().position = 0;
    setPracticeMode('inactive');
    setWaitNote(null);
    setPlaybackNotes([]);
    clearHighlights();

    if (scoreRef.current?.cursor) {
      scoreRef.current.cursor.reset();
      scoreRef.current.cursor.hide();
    }
  }, [clearHighlights]);

  const handleFileChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const xmlContent = e.target?.result as string;
        stopPractice();
        setMusicXml(xmlContent);
      };
      reader.readAsText(file);
    }
  }, [stopPractice]);

  const onScoreReady = React.useCallback((osmd: OSMD) => {
    const measures = osmd.Sheet.SourceMeasures.length;
    setTotalMeasures(measures);
    setStartMeasure(1);
    setEndMeasure(Math.min(4, measures));
    if (scoreRef.current?.cursor) {
      scoreRef.current.cursor.show();
    }
  }, []);

  const onNextNote = React.useCallback(() => {
    if (practiceMode === 'waitForMe' && scoreRef.current?.cursor) {
      const cursor = scoreRef.current.cursor;
      cursor.next();
      highlightCursorNotes();

      if (cursor.iterator.endReached || cursor.iterator.CurrentMeasureIndex >= endMeasure) {
        stopPractice();
        toast({ title: "Section Finished" });
        return;
      }

      const notes = cursor.NotesUnderCursor();
      if (notes.length > 0 && !notes[0].isRest()) {
        setWaitNote(osmdNoteToToneNote(notes[0]));
      } else {
        onNextNote();
      }
    }
  }, [practiceMode, endMeasure, stopPractice, toast, highlightCursorNotes]);

  const startPlaybackMode = React.useCallback(async () => {
    const osmd = scoreRef.current?.osmd;
    const cursor = scoreRef.current?.cursor;
    if (!osmd?.Sheet || !cursor || !synthRef.current) return;

    stopPractice();
    await Tone.start();
    setPracticeMode('playback');

    const transport = Tone.getTransport();
    transport.bpm.value = bpm;
    transport.cancel();

    cursor.show();
    cursor.reset();

    while (cursor.iterator.CurrentMeasureIndex < startMeasure - 1 && !cursor.iterator.endReached) {
      cursor.next();
    }
    highlightCursorNotes();

    const firstNoteTime = cursor.iterator.currentTimeStamp.RealValue;
    const tempIterator = cursor.iterator.clone();
    const secPerQuarter = 60 / bpm;

    while (!tempIterator.endReached && tempIterator.CurrentMeasureIndex < endMeasure) {
      const voiceEntries = tempIterator.CurrentVoiceEntries;
      const timeInWholeNotes = tempIterator.currentTimeStamp.RealValue;
      const relativeTimeInQuarters = (timeInWholeNotes - firstNoteTime) * 4;
      const timeInSeconds = relativeTimeInQuarters * secPerQuarter;

      transport.schedule(() => {
        cursor.next();
        highlightCursorNotes();
      }, timeInSeconds);

      if (voiceEntries) {
        for (const entry of voiceEntries) {
          for (const note of entry.Notes) {
            if (!note.isRest()) {
              const toneNote = osmdNoteToToneNote(note);
              if (toneNote) {
                const durationInSeconds = note.Length.RealValue * 4 * secPerQuarter;
                transport.schedule(t => {
                  synthRef.current?.triggerAttackRelease(toneNote, durationInSeconds, t);
                }, timeInSeconds);
              }
            }
          }
        }
      }
      tempIterator.moveToNext();
    }

    const lastTimeInQuarters = (tempIterator.currentTimeStamp.RealValue - firstNoteTime) * 4;
    transport.scheduleOnce(() => {
      stopPractice();
      toast({ title: 'Playback Finished' });
    }, lastTimeInQuarters * secPerQuarter);

    transport.start();
  }, [startMeasure, endMeasure, stopPractice, toast, highlightCursorNotes, bpm]);

  const startWaitForMeMode = React.useCallback(async () => {
    const cursor = scoreRef.current?.cursor;
    if (!cursor) return;
    stopPractice();
    await Tone.start();
    setPracticeMode('waitForMe');

    cursor.reset();
    cursor.show();

    while (cursor.iterator.CurrentMeasureIndex < startMeasure - 1 && !cursor.iterator.endReached) {
      cursor.next();
    }

    const findFirstNote = () => {
      if (cursor.iterator.endReached || cursor.iterator.CurrentMeasureIndex >= endMeasure) {
        stopPractice();
        return;
      }
      const notes = cursor.NotesUnderCursor();
      if (notes.length > 0 && !notes[0].isRest()) {
        highlightCursorNotes();
        setWaitNote(osmdNoteToToneNote(notes[0]));
      } else {
        cursor.next();
        findFirstNote();
      }
    };
    findFirstNote();
  }, [startMeasure, endMeasure, stopPractice, highlightCursorNotes]);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <Library className="w-6 h-6" />
          <span>Song Trainer</span>
        </CardTitle>
        <div className="flex items-center gap-4">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xml,.musicxml" />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            {musicXml ? 'Change Song' : 'Upload Song'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!musicXml ? (
          <div className="text-center p-12 border-2 border-dashed border-[hsl(var(--muted))] rounded-lg space-y-4">
            <Upload className="w-12 h-12 mx-auto text-[hsl(var(--muted-foreground))]" />
            <div className="space-y-2">
              <p className="text-lg font-semibold">No song loaded</p>
              <p className="text-[hsl(var(--muted-foreground))]">Upload a MusicXML file to start practicing.</p>
            </div>
            <Button onClick={() => fileInputRef.current?.click()}>Select File</Button>
          </div>
        ) : (
          <div className="space-y-6">
            <ScoreDisplay ref={scoreRef} xml={musicXml} onScoreReady={onScoreReady} />

            <Card className="bg-[hsl(var(--muted))]/30">
              <CardHeader>
                <CardTitle className="text-lg">Practice Range</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-3">
                    <Label htmlFor="startMeasure">From Measure</Label>
                    <Input
                      id="startMeasure"
                      type="number"
                      min={1}
                      max={totalMeasures}
                      value={startMeasure}
                      onChange={(e) => setStartMeasure(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Label htmlFor="endMeasure">To Measure</Label>
                    <Input
                      id="endMeasure"
                      type="number"
                      min={startMeasure}
                      max={totalMeasures}
                      value={endMeasure}
                      onChange={(e) => setEndMeasure(Math.max(startMeasure, parseInt(e.target.value) || startMeasure))}
                      className="w-20"
                    />
                  </div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">Total: {totalMeasures} measures</p>
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <Label htmlFor="bpm">Tempo</Label>
                  <input
                    id="bpm"
                    type="range"
                    min={30}
                    max={130}
                    value={bpm}
                    onChange={(e) => setBpm(parseInt(e.target.value))}
                    disabled={practiceMode !== 'inactive'}
                    className="w-40 accent-[hsl(var(--primary))]"
                  />
                  <span className="text-sm font-medium w-16">{bpm} BPM</span>
                </div>
                <Separator />
                <div className="flex flex-wrap items-center gap-4">
                  <Button
                    onClick={startPlaybackMode}
                    disabled={practiceMode !== 'inactive'}
                    className="min-w-[180px]"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Playback
                  </Button>
                  <Button
                    onClick={startWaitForMeMode}
                    disabled={practiceMode !== 'inactive'}
                    variant="secondary"
                    className="min-w-[180px]"
                  >
                    <Mic2 className="w-4 h-4 mr-2" />
                    Wait-for-Me
                  </Button>
                </div>
              </CardContent>
              {practiceMode !== 'inactive' && (
                <CardFooter className="bg-[hsl(var(--primary))]/10 p-4 rounded-b-lg flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[hsl(var(--primary))] animate-pulse" />
                    <span className="font-bold text-[hsl(var(--primary))] text-sm uppercase tracking-wider">
                      {practiceMode === 'playback' ? `Playing: ${bpm} BPM` : 'Waiting for note...'}
                    </span>
                  </div>
                  <Button onClick={stopPractice} size="sm" variant="destructive">
                    <Square className="w-4 h-4 mr-2" /> Stop
                  </Button>
                </CardFooter>
              )}
            </Card>

            <PracticeKeyboard
              selectedMidiInput={selectedMidiInput}
              onNextNote={onNextNote}
              correctNote={waitNote}
              isWaiting={practiceMode === 'waitForMe'}
              playbackNotes={playbackNotes}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
