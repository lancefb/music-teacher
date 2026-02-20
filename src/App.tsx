import * as React from 'react';
import { WebMidi } from 'webmidi';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music, Ear, Library, Headphones } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Toaster } from '@/components/ui/toaster';
import NoteTrainer from '@/components/note-trainer/note-trainer';
import IntervalTrainer from '@/components/interval-trainer/interval-trainer';
import SongTrainer from '@/components/song-trainer/song-trainer';
import EarTrainer from '@/components/ear-trainer/ear-trainer';

type MidiStatus = 'pending' | 'enabled' | 'disabled' | 'error';

export default function App() {
  const [midiStatus, setMidiStatus] = React.useState<MidiStatus>('pending');
  const [midiInputs, setMidiInputs] = React.useState<any[]>([]);
  const [selectedMidiInput, setSelectedMidiInput] = React.useState<string | null>(null);
  const [isConnecting, setIsConnecting] = React.useState(false);

  const { toast } = useToast();

  const enableMidi = React.useCallback(async () => {
    if (WebMidi.enabled) return;
    setIsConnecting(true);

    try {
      await WebMidi.enable();
      console.log('WebMidi enabled!');
      setMidiInputs(WebMidi.inputs);

      if (WebMidi.inputs.length > 0) {
        const defaultInputId = WebMidi.inputs[0].id;
        setSelectedMidiInput(defaultInputId);
        setMidiStatus('enabled');
      } else {
        toast({
          title: 'No MIDI devices found',
          description: 'Please connect a MIDI keyboard and then click "Scan for MIDI Devices".',
          variant: 'destructive',
        });
        setMidiStatus('disabled');
      }
    } catch (err: any) {
      console.error('Could not enable MIDI.', err);
      toast({
        title: 'MIDI Error',
        description: `Connection failed. In your browser's address bar, click the lock icon to check site settings and ensure MIDI access is allowed. Error: ${err.message}`,
        variant: 'destructive',
        duration: 10000,
      });
      setMidiStatus('error');
    } finally {
      setIsConnecting(false);
    }
  }, [toast]);

  const renderMidiConnect = () => (
    <Card>
       <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Music className="w-6 h-6" />
            <span>Connect Your MIDI Keyboard</span>
        </CardTitle>
       </CardHeader>
       <CardContent>
            <div className="text-center p-8 space-y-4">
                <Music className="w-12 h-12 mx-auto text-[hsl(var(--primary))]" />
                <p className="text-lg font-semibold">Ready to Practice?</p>
                <p className="text-[hsl(var(--muted-foreground))]">
                    {midiStatus === 'disabled'
                    ? 'Please connect a MIDI keyboard and click the button below.'
                    : 'Connect your MIDI keyboard to start sight-reading and song practice.'}
                </p>
                <Button onClick={enableMidi} disabled={isConnecting}>
                    {isConnecting ? 'Connecting...' : midiStatus === 'disabled' ? 'Scan for MIDI Devices' : 'Connect to MIDI'}
                </Button>
                {midiStatus === 'error' && (
                    <p className="text-sm text-[hsl(var(--destructive))]">Connection failed. Please grant MIDI permissions and try again.</p>
                )}
            </div>
       </CardContent>
    </Card>
  );

  return (
    <>
      <main className="flex min-h-screen w-full flex-col items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-5xl">
          <header className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
              <h1 className="text-4xl font-bold mb-2">AI-Accelerated Musician</h1>
              <p className="text-[hsl(var(--muted-foreground))] text-lg">
                A personalized music theory and keyboard skills trainer.
              </p>
            </div>
             {midiStatus === 'enabled' && midiInputs.length > 0 && (
              <div className="w-full sm:w-64">
                  <Select value={selectedMidiInput || ''} onValueChange={setSelectedMidiInput}>
                      <SelectTrigger>
                          <SelectValue placeholder="Select MIDI Input..." />
                      </SelectTrigger>
                      <SelectContent>
                          {midiInputs.map((input: any) => (
                              <SelectItem key={input.id} value={input.id}>{input.name}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
            )}
          </header>

          <Tabs defaultValue="note-trainer" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="note-trainer">
                <Music className="w-4 h-4 mr-2" />
                Note Trainer
              </TabsTrigger>
              <TabsTrigger value="interval-trainer">
                <Ear className="w-4 h-4 mr-2" />
                Interval Trainer
              </TabsTrigger>
              <TabsTrigger value="song-trainer">
                <Library className="w-4 h-4 mr-2" />
                Song Trainer
              </TabsTrigger>
              <TabsTrigger value="ear-trainer">
                <Headphones className="w-4 h-4 mr-2" />
                Ear Trainer
              </TabsTrigger>
            </TabsList>
            <TabsContent value="note-trainer" className="mt-4">
              {midiStatus === 'enabled' ? (
                <NoteTrainer selectedMidiInput={selectedMidiInput} />
              ) : renderMidiConnect()}
            </TabsContent>
            <TabsContent value="interval-trainer" className="mt-4">
              <IntervalTrainer />
            </TabsContent>
            <TabsContent value="song-trainer" className="mt-4">
              {midiStatus === 'enabled' ? (
                  <SongTrainer selectedMidiInput={selectedMidiInput} />
              ) : renderMidiConnect()}
            </TabsContent>
            <TabsContent value="ear-trainer" className="mt-4">
              {midiStatus === 'enabled' ? (
                <EarTrainer selectedMidiInput={selectedMidiInput} />
              ) : renderMidiConnect()}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Toaster />
    </>
  );
}
