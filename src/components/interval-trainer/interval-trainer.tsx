import * as React from 'react';
import * as Tone from 'tone';
import { generateInterval, type GenerateIntervalOutput } from '@/flows/generate-interval-flow';
import { getPianoSampler } from '@/lib/piano-sampler';
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
  const [isSamplerReady, setIsSamplerReady] = React.useState(false);
  const sampler = React.useRef<Tone.Sampler | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    let cancelled = false;
    getPianoSampler().then(s => {
      if (!cancelled) {
        sampler.current = s;
        setIsSamplerReady(true);
      }
    }).catch(() => {
      if (!cancelled) {
        toast({
          title: 'Audio Error',
          description: 'Could not initialize audio context.',
          variant: 'destructive',
        });
      }
    });
    return () => { cancelled = true; };
  }, [toast]);

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
    if (isSamplerReady && sampler.current && problem) {
      sampler.current.triggerAttackRelease(problem.baseNote, '8n', Tone.now());
      sampler.current.triggerAttackRelease(problem.upperNote, '8n', Tone.now() + Tone.Time('8n').toSeconds());
    }
  }, [isSamplerReady, problem]);

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
          disabled={isLoading || !isSamplerReady}
          title="Identify the Interval"
        />

        <div className="flex items-center justify-center gap-4">
          <Button onClick={playInterval} disabled={isLoading || !isSamplerReady}>
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
              disabled={isLoading || !isSamplerReady || feedback !== null}
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
