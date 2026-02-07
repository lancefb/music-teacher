import * as React from 'react';
import * as Tone from 'tone';
import { generateInterval, type GenerateIntervalOutput } from '@/flows/generate-interval-flow';
import { StaffDisplay } from '@/components/shared/staff-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Ear } from 'lucide-react';

export default function IntervalTrainer() {
  const [problem, setProblem] = React.useState<GenerateIntervalOutput | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [feedback, setFeedback] = React.useState<'correct' | 'incorrect' | null>(null);
  const [selectedAnswer, setSelectedAnswer] = React.useState<string | null>(null);
  const [isSynthReady, setIsSynthReady] = React.useState(false);
  const synth = React.useRef<Tone.PolySynth | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    const initializeSynth = async () => {
      try {
        await Tone.start();
        if (!synth.current) {
          synth.current = new Tone.PolySynth(Tone.Synth).toDestination();
        }
        setIsSynthReady(true);
        console.log('Audio ready.');
      } catch (error) {
        toast({
          title: 'Audio Error',
          description: 'Could not initialize audio context.',
          variant: 'destructive',
        });
      }
    };
    if (typeof window !== 'undefined' && !isSynthReady) {
      initializeSynth();
    }
  }, [toast, isSynthReady]);

  const loadNewProblem = React.useCallback(async (currentProblem?: GenerateIntervalOutput | null) => {
    setIsLoading(true);
    setFeedback(null);
    setSelectedAnswer(null);
    try {
      const newProblem = await generateInterval({ previousBaseNote: currentProblem?.baseNote });
      setProblem(newProblem);
    } catch (error) {
      console.error('Failed to generate new interval:', error);
      toast({
        title: 'Error',
        description: 'Failed to load a new problem. Please try again.',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  }, [toast]);

  React.useEffect(() => {
    loadNewProblem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playInterval = React.useCallback(() => {
    if (isSynthReady && synth.current && problem) {
      synth.current.triggerAttackRelease(problem.baseNote, '8n', Tone.now());
      synth.current.triggerAttackRelease(problem.upperNote, '8n', Tone.now() + Tone.Time('8n').toSeconds());
    }
  }, [isSynthReady, problem]);

  const handleAnswer = (answer: string) => {
    if (feedback) return;

    setSelectedAnswer(answer);
    if (answer === problem?.interval) {
      setFeedback('correct');
      playInterval();
      setTimeout(() => loadNewProblem(problem), 1500);
    } else {
      setFeedback('incorrect');
    }
  };

  const getButtonVariant = (answer: string): "default" | "outline" | "destructive" => {
    if (!feedback) return 'outline';
    if (answer === problem?.interval) return 'default';
    if (answer === selectedAnswer && feedback === 'incorrect') return 'destructive';
    return 'outline';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ear className="w-6 h-6" />
          <span>Interval Ear Trainer</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <StaffDisplay
          notes={problem ? [problem.baseNote, problem.upperNote] : []}
          disabled={isLoading || !isSynthReady}
          title="Identify the Interval"
        />

        <div className="flex items-center justify-center gap-4">
          <Button onClick={playInterval} disabled={isLoading || !isSynthReady}>
            Play Interval
          </Button>
          <Button onClick={() => loadNewProblem(problem)} disabled={isLoading}>
            Next Question
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {problem?.possibleAnswers.map((answer) => (
            <Button
              key={answer}
              onClick={() => handleAnswer(answer)}
              variant={getButtonVariant(answer)}
              disabled={isLoading || feedback !== null}
              className="h-12 text-sm"
            >
              {answer}
            </Button>
          ))}
        </div>

        {feedback === 'correct' && <p className="text-center text-green-600 font-bold">Correct!</p>}
        {feedback === 'incorrect' && <p className="text-center text-red-600 font-bold">Try again!</p>}

      </CardContent>
    </Card>
  );
}
