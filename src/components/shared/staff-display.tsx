import * as React from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } from 'vexflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface StaffDisplayProps {
  notes: string[];
  disabled: boolean;
  title: React.ReactNode;
  clef?: 'treble' | 'bass';
}

export function StaffDisplay({ notes, disabled, title, clef = 'treble' }: StaffDisplayProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const rendererRef = React.useRef<Renderer | null>(null);

  React.useEffect(() => {
    const renderStaff = () => {
      if (containerRef.current && !disabled && notes.length > 0) {
        containerRef.current.innerHTML = '';
        rendererRef.current = new Renderer(containerRef.current, Renderer.Backends.SVG);
        const renderer = rendererRef.current;

        renderer.resize(containerRef.current.clientWidth, 150);
        const context = renderer.getContext();
        context.setFont('Arial', 10, '').setBackgroundFillStyle('#eed');

        const stave = new Stave(10, 20, containerRef.current.clientWidth - 20);
        stave.addClef(clef).setContext(context).draw();

        const vexNoteKeys = notes.map(note => `${note.charAt(0).toLowerCase()}${note.includes('#') ? '#' : ''}/${note.slice(-1)}`);

        const tickable = new StaveNote({
          keys: vexNoteKeys,
          duration: 'w',
          clef: clef,
        });

        notes.forEach((note, index) => {
          if (note.includes('#')) {
            tickable.addModifier(new Accidental('#'), index);
          }
        });

        const voice = new Voice({ num_beats: 4, beat_value: 4 });
        voice.addTickables([tickable]);

        new Formatter().joinVoices([voice]).format([voice], containerRef.current.clientWidth - 50);

        voice.draw(context, stave);
      }
    };

    const timer = setTimeout(renderStaff, 100);
    return () => clearTimeout(timer);
  }, [notes, disabled, clef]);

  if (disabled) {
    return (
      <Card className="h-full w-full flex items-center justify-center p-4 min-h-[200px]">
        <div className="text-center space-y-2">
          <Skeleton className="w-24 h-6 mx-auto" />
          <p className="text-[hsl(var(--muted-foreground))]">Initializing...</p>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="w-full h-[150px] -mt-4"></div>
      </CardContent>
    </Card>
  );
}
