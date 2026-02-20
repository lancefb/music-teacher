import * as React from 'react';
import * as Tone from 'tone';
import { WebMidi } from 'webmidi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PianoKeyboard } from '@/components/shared/piano-keyboard';
import { getPianoSampler } from '@/lib/piano-sampler';
import { generateMelody, type MusicalKey, type GenerateMelodyOutput, type EarTrainerStats } from '@/flows/generate-melody-flow';
import { Ear, Play, RotateCcw, Eye, ArrowRight } from 'lucide-react';

type PracticeState = 'idle' | 'playing' | 'listening' | 'revealed';

const KEYS: MusicalKey[] = ['C', 'G', 'D', 'A', 'E', 'B', 'F', 'Bb', 'Eb', 'Ab', 'Db'];
const NOTE_SPACING_SECONDS = 0.75;
const NOTE_DURATION = '4n';

interface EarTrainerProps {
  selectedMidiInput: string | null;
}

export default function EarTrainer({ selectedMidiInput }: EarTrainerProps) {
  const [practiceState, setPracticeState] = React.useState<PracticeState>('idle');
  const [selectedKey, setSelectedKey] = React.useState<MusicalKey>('C');
  const [melody, setMelody] = React.useState<GenerateMelodyOutput | null>(null);
  const [userNotes, setUserNotes] = React.useState<string[]>([]);
  const [melodyLength, setMelodyLength] = React.useState(3);
  const [octaveRange, setOctaveRange] = React.useState(1); // 1 = C4-C5, 2 = C4-B5
  const [stats, setStats] = React.useState<EarTrainerStats>({
    totalAttempts: 0,
    correctAttempts: 0,
    currentStreak: 0,
    bestStreak: 0,
  });

  const sampler = React.useRef<Tone.Sampler | null>(null);
  const practiceStateRef = React.useRef<PracticeState>('idle');
  const userNotesRef = React.useRef<string[]>([]);
  const melodyRef = React.useRef<GenerateMelodyOutput | null>(null);
  const melodyLengthRef = React.useRef(3);
  const midiMaxRef = React.useRef(72); // 1 octave default

  // Keep refs in sync for MIDI callbacks
  React.useEffect(() => { practiceStateRef.current = practiceState; }, [practiceState]);
  React.useEffect(() => { userNotesRef.current = userNotes; }, [userNotes]);
  React.useEffect(() => { melodyRef.current = melody; }, [melody]);
  React.useEffect(() => { melodyLengthRef.current = melodyLength; }, [melodyLength]);
  React.useEffect(() => { midiMaxRef.current = octaveRange === 1 ? 72 : 83; }, [octaveRange]);

  // Load sampler on mount
  React.useEffect(() => {
    getPianoSampler().then(s => { sampler.current = s; });
  }, []);

  // Generate initial melody on mount
  React.useEffect(() => {
    const m = generateMelody({ key: selectedKey, length: melodyLength, midiMax: midiMaxRef.current });
    setMelody(m);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusMessage = () => {
    switch (practiceState) {
      case 'idle': return 'Press Play to hear the melody.';
      case 'playing': return 'Listen carefully...';
      case 'listening': return `Echo the ${melodyLength}-note melody on your keyboard. (${userNotes.length}/${melodyLength})`;
      case 'revealed': return 'Here\'s the melody. Press Next to try another.';
    }
  };

  const playMelody = React.useCallback(async () => {
    if (!melody || !sampler.current) return;
    await Tone.start();
    setUserNotes([]);
    setPracticeState('playing');

    const now = Tone.now() + 0.05;
    melody.notes.forEach((note, i) => {
      sampler.current!.triggerAttackRelease(note, NOTE_DURATION, now + i * NOTE_SPACING_SECONDS);
    });

    const totalDuration = (melody.notes.length - 1) * NOTE_SPACING_SECONDS + 0.5;
    setTimeout(() => {
      setPracticeState(prev => prev === 'playing' ? 'listening' : prev);
    }, totalDuration * 1000);
  }, [melody]);

  const handleReveal = React.useCallback(() => {
    if (practiceStateRef.current === 'listening') {
      setPracticeState('revealed');
      // Score the attempt
      const target = melodyRef.current?.notes ?? [];
      const played = userNotesRef.current;
      const correct = target.every((note, i) => {
        const targetMidi = Tone.Frequency(note).toMidi();
        const playedNote = played[i];
        if (!playedNote) return false;
        const playedMidi = Tone.Frequency(playedNote).toMidi();
        return targetMidi === playedMidi;
      }) && played.length === target.length;

      setStats(prev => {
        const newStreak = correct ? prev.currentStreak + 1 : 0;
        return {
          totalAttempts: prev.totalAttempts + 1,
          correctAttempts: prev.correctAttempts + (correct ? 1 : 0),
          currentStreak: newStreak,
          bestStreak: Math.max(prev.bestStreak, newStreak),
        };
      });
    }
  }, []);

  const handleNext = React.useCallback(() => {
    const m = generateMelody({ key: selectedKey, length: melodyLength, previousMelody: melody?.notes, midiMax: midiMaxRef.current });
    setMelody(m);
    setUserNotes([]);
    setPracticeState('idle');
  }, [selectedKey, melody, melodyLength]);

  const handleKeyChange = React.useCallback((key: MusicalKey) => {
    setSelectedKey(key);
    const m = generateMelody({ key, length: melodyLengthRef.current, midiMax: midiMaxRef.current });
    setMelody(m);
    setUserNotes([]);
    setPracticeState('idle');
  }, []);

  // Compute highlighted notes for keyboard
  // listening: user's played notes in blue
  // revealed: melody notes in blue
  const keyboardHighlighted = practiceState === 'listening'
    ? userNotes
    : practiceState === 'revealed'
      ? (melody?.notes ?? [])
      : [];

  // For revealed state: first wrong user note shown in red
  const wrongUserNotes = React.useMemo(() => {
    if (practiceState !== 'revealed') return [];
    const targetMidis = new Set((melody?.notes ?? []).map(n => Tone.Frequency(n).toMidi()));
    return userNotes.filter(n => !targetMidis.has(Tone.Frequency(n).toMidi()));
  }, [practiceState, userNotes, melody]);

  // MIDI input handler
  const handleNoteOn = React.useCallback((e: any) => {
    if (practiceStateRef.current !== 'listening') return;
    const noteName = e.note.identifier;

    setUserNotes(prev => {
      if (prev.length >= melodyLengthRef.current) return prev;
      const next = [...prev, noteName];
      userNotesRef.current = next;
      if (next.length >= melodyLengthRef.current) {
        // Auto-reveal after collecting all notes
        setTimeout(() => {
          if (practiceStateRef.current === 'listening') {
            setPracticeState('revealed');
            const target = melodyRef.current?.notes ?? [];
            const correct = target.every((note, i) => {
              const targetMidi = Tone.Frequency(note).toMidi();
              const playedNote = next[i];
              if (!playedNote) return false;
              return Tone.Frequency(playedNote).toMidi() === targetMidi;
            }) && next.length === target.length;

            setStats(p => {
              const newStreak = correct ? p.currentStreak + 1 : 0;
              return {
                totalAttempts: p.totalAttempts + 1,
                correctAttempts: p.correctAttempts + (correct ? 1 : 0),
                currentStreak: newStreak,
                bestStreak: Math.max(p.bestStreak, newStreak),
              };
            });
          }
        }, 200);
      }
      return next;
    });
  }, []);

  React.useEffect(() => {
    if (!selectedMidiInput || !WebMidi.enabled) return;
    const input = WebMidi.getInputById(selectedMidiInput);
    if (!input) return;
    input.addListener('noteon', handleNoteOn);
    return () => { input.removeListener('noteon', handleNoteOn); };
  }, [selectedMidiInput, handleNoteOn]);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <Ear className="w-6 h-6" />
          <span>Ear Trainer</span>
        </CardTitle>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-[hsl(var(--muted-foreground))]">Key:</span>
            <Select value={selectedKey} onValueChange={(v) => handleKeyChange(v as MusicalKey)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KEYS.map(k => (
                  <SelectItem key={k} value={k}>{k} Major</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[hsl(var(--muted-foreground))]">Notes:</span>
            <input
              type="range"
              min={2}
              max={8}
              value={melodyLength}
              disabled={practiceState !== 'idle'}
              onChange={(e) => {
                const len = parseInt(e.target.value);
                setMelodyLength(len);
                const m = generateMelody({ key: selectedKey, length: len, midiMax: midiMaxRef.current });
                setMelody(m);
                setUserNotes([]);
              }}
              className="w-24 accent-[hsl(var(--primary))]"
            />
            <span className="text-sm font-medium w-4">{melodyLength}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[hsl(var(--muted-foreground))]">Range:</span>
            <input
              type="range"
              min={1}
              max={2}
              step={1}
              value={octaveRange}
              disabled={practiceState !== 'idle'}
              onChange={(e) => {
                const range = parseInt(e.target.value);
                const newMidiMax = range === 1 ? 72 : 83;
                setOctaveRange(range);
                midiMaxRef.current = newMidiMax;
                const m = generateMelody({ key: selectedKey, length: melodyLengthRef.current, midiMax: newMidiMax });
                setMelody(m);
                setUserNotes([]);
              }}
              className="w-16 accent-[hsl(var(--primary))]"
            />
            <span className="text-sm font-medium w-10">{octaveRange} oct</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status */}
        <div className="text-center py-3 px-4 rounded-lg bg-[hsl(var(--muted))]/40">
          <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">{getStatusMessage()}</p>
          {practiceState === 'revealed' && melody && (
            <p className="text-xs mt-1 font-mono text-[hsl(var(--muted-foreground))]">
              {melody.notes.join(' · ')}
            </p>
          )}
        </div>

        {/* Piano keyboard */}
        <PianoKeyboard
          startNote="C3"
          endNote="B5"
          highlightedNotes={keyboardHighlighted}
          incorrectNote={practiceState === 'revealed' && wrongUserNotes.length > 0 ? wrongUserNotes[0] : undefined}
        />

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            onClick={playMelody}
            disabled={practiceState === 'playing' || practiceState !== 'idle' || !melody}
            className="min-w-[100px]"
          >
            <Play className="w-4 h-4 mr-2" />
            Play
          </Button>

          <Button
            onClick={playMelody}
            disabled={practiceState === 'playing' || practiceState === 'idle' || !melody}
            variant="outline"
            className="min-w-[100px]"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Replay
          </Button>

          <div className="w-px h-8 bg-[hsl(var(--border))]" />

          <Button
            onClick={handleReveal}
            disabled={practiceState !== 'listening'}
            variant="secondary"
            className="min-w-[100px]"
          >
            <Eye className="w-4 h-4 mr-2" />
            Reveal
          </Button>

          <Button
            onClick={handleNext}
            disabled={practiceState === 'playing'}
            variant={practiceState === 'revealed' ? 'default' : 'outline'}
            className="min-w-[100px]"
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            Next
          </Button>
        </div>

        {/* Revealed feedback */}
        {practiceState === 'revealed' && melody && (
          <div className="space-y-3">
            {/* Sequence comparison grid */}
            <div className="flex justify-center gap-2 flex-wrap">
              {melody.notes.map((targetNote, i) => {
                const playedNote = userNotes[i];
                const isCorrect = playedNote != null &&
                  Tone.Frequency(playedNote).toMidi() === Tone.Frequency(targetNote).toMidi();
                return (
                  <div key={i} className="flex flex-col items-center gap-1 min-w-[3.5rem]">
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">{i + 1}</span>
                    <div className="w-full text-center px-2 py-1 rounded bg-blue-100 text-blue-800 text-sm font-mono font-semibold">
                      {targetNote}
                    </div>
                    <div className={`w-full text-center px-2 py-1 rounded text-sm font-mono font-semibold ${
                      playedNote == null
                        ? 'bg-gray-100 text-gray-400'
                        : isCorrect
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                    }`}>
                      {playedNote ?? '—'}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Summary line */}
            <p className="text-center text-sm font-medium">
              {userNotes.length === 0
                ? 'No notes played.'
                : melody.notes.every((note, i) =>
                    userNotes[i] != null &&
                    Tone.Frequency(note).toMidi() === Tone.Frequency(userNotes[i]).toMidi()
                  )
                  ? <span className="text-green-600 font-bold">Perfect!</span>
                  : <span className="text-amber-600">
                      {melody.notes.filter((note, i) =>
                        userNotes[i] != null &&
                        Tone.Frequency(note).toMidi() === Tone.Frequency(userNotes[i]).toMidi()
                      ).length} / {melody.notes.length} correct
                    </span>
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
