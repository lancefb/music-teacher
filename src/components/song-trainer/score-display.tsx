import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { OpenSheetMusicDisplay, type OSMDOptions, type Cursor } from 'opensheetmusicdisplay';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ScoreDisplayProps {
  xml: string;
  onScoreReady?: (osmd: OpenSheetMusicDisplay) => void;
}

export interface ScoreDisplayHandle {
  osmd: OpenSheetMusicDisplay | null;
  cursor: Cursor | null;
  container: HTMLDivElement | null;
}

export const ScoreDisplay = forwardRef<ScoreDisplayHandle, ScoreDisplayProps>(({ xml, onScoreReady }, ref) => {
  const osmdContainerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    osmd: osmdRef.current,
    cursor: osmdRef.current?.cursor ?? null,
    container: osmdContainerRef.current,
  }));

  useEffect(() => {
    if (!xml || !osmdContainerRef.current) return;

    if (osmdRef.current) {
      osmdRef.current.clear();
    }
    if (osmdContainerRef.current) {
      osmdContainerRef.current.innerHTML = '';
    }

    setIsLoading(true);
    setError(null);

    const options: OSMDOptions = {
      autoResize: true,
      backend: 'svg',
      drawTitle: false,
      followCursor: false,
      renderSingleHorizontalStaffline: true,
      drawPartNames: false,
      drawingParameters: 'compacttight',
    };

    const osmd = new OpenSheetMusicDisplay(osmdContainerRef.current, options);
    osmdRef.current = osmd;

    async function loadAndRender() {
      try {
        await osmd.load(xml);
        osmd.render();
        if (onScoreReady) {
          onScoreReady(osmd);
        }
      } catch (err) {
        console.error("OSMD Error: ", err);
        setError("Failed to render score. The MusicXML file might be invalid.");
      } finally {
        setIsLoading(false);
      }
    }

    const timer = setTimeout(loadAndRender, 10);
    return () => {
      clearTimeout(timer);
      if (osmdContainerRef.current) {
        osmdContainerRef.current.innerHTML = '';
      }
    };
  }, [xml, onScoreReady]);

  return (
    <Card>
      <CardContent className="p-2 relative min-h-[150px]">
        {isLoading && <Skeleton className="h-[150px] w-full" />}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-red-600 p-4">
            <p>{error}</p>
          </div>
        )}
        <div ref={osmdContainerRef} className="overflow-x-auto overflow-y-hidden" style={{ display: isLoading || error ? 'none' : 'block' }} />
      </CardContent>
    </Card>
  );
});

ScoreDisplay.displayName = 'ScoreDisplay';
