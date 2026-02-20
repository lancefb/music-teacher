import * as Tone from 'tone';

// All 88 piano samples mapped to Tone.js note names
// Source: University of Iowa Electronic Music Studios Steinway piano samples
// via https://github.com/pianosnake/ear-training-buddy
const SAMPLE_URLS: Record<string, string> = {
  'A0': 'A0-97-127.mp3',
  'Bb0': 'Bb0-97-127.mp3',
  'B0': 'B0-97-127.mp3',
  'C1': 'C1-97-127.mp3',
  'Db1': 'Db1-97-127.mp3',
  'D1': 'D1-97-127.mp3',
  'Eb1': 'Eb1-97-127.mp3',
  'E1': 'E1-97-127.mp3',
  'F1': 'F1-97-127.mp3',
  'Gb1': 'Gb1-97-127.mp3',
  'G1': 'G1-97-127.mp3',
  'Ab1': 'Ab1-97-127.mp3',
  'A1': 'A1-97-127.mp3',
  'Bb1': 'Bb1-97-127.mp3',
  'B1': 'B1-97-127.mp3',
  'C2': 'C2-97-127.mp3',
  'Db2': 'Db2-97-127.mp3',
  'D2': 'D2-97-127.mp3',
  'Eb2': 'Eb2-97-127.mp3',
  'E2': 'E2-97-127.mp3',
  'F2': 'F2-97-127.mp3',
  'Gb2': 'Gb2-97-127.mp3',
  'G2': 'G2-97-127.mp3',
  'Ab2': 'Ab2-97-127.mp3',
  'A2': 'A2-97-127.mp3',
  'Bb2': 'Bb2-97-127.mp3',
  'B2': 'B2-97-127.mp3',
  'C3': 'C3-97-127.mp3',
  'Db3': 'Db3-97-127.mp3',
  'D3': 'D3-97-127.mp3',
  'Eb3': 'Eb3-97-127.mp3',
  'E3': 'E3-97-127.mp3',
  'F3': 'F3-97-127.mp3',
  'Gb3': 'Gb3-97-127.mp3',
  'G3': 'G3-97-127.mp3',
  'Ab3': 'Ab3-97-127.mp3',
  'A3': 'A3-97-127.mp3',
  'Bb3': 'Bb3-97-127.mp3',
  'B3': 'B3-97-127.mp3',
  'C4': 'C4-97-127.mp3',
  'Db4': 'Db4-97-127.mp3',
  'D4': 'D4-97-127.mp3',
  'Eb4': 'Eb4-97-127.mp3',
  'E4': 'E4-97-127.mp3',
  'F4': 'F4-97-127.mp3',
  'Gb4': 'Gb4-97-127.mp3',
  'G4': 'G4-97-127.mp3',
  'Ab4': 'Ab4-97-127.mp3',
  'A4': 'A4-97-127.mp3',
  'Bb4': 'Bb4-97-127.mp3',
  'B4': 'B4-97-127.mp3',
  'C5': 'C5-97-127.mp3',
  'Db5': 'Db5-97-127.mp3',
  'D5': 'D5-97-127.mp3',
  'Eb5': 'Eb5-97-127.mp3',
  'E5': 'E5-97-127.mp3',
  'F5': 'F5-97-127.mp3',
  'Gb5': 'Gb5-97-127.mp3',
  'G5': 'G5-97-127.mp3',
  'Ab5': 'Ab5-97-127.mp3',
  'A5': 'A5-97-127.mp3',
  'Bb5': 'Bb5-97-127.mp3',
  'B5': 'B5-97-127.mp3',
  'C6': 'C6-97-127.mp3',
  'Db6': 'Db6-97-127.mp3',
  'D6': 'D6-97-127.mp3',
  'Eb6': 'Eb6-97-127.mp3',
  'E6': 'E6-97-127.mp3',
  'F6': 'F6-97-127.mp3',
  'Gb6': 'Gb6-97-127.mp3',
  'G6': 'G6-97-127.mp3',
  'Ab6': 'Ab6-97-127.mp3',
  'A6': 'A6-97-127.mp3',
  'Bb6': 'Bb6-97-127.mp3',
  'B6': 'B6-97-127.mp3',
  'C7': 'C7-97-127.mp3',
  'Db7': 'Db7-97-127.mp3',
  'D7': 'D7-97-127.mp3',
  'Eb7': 'Eb7-97-127.mp3',
  'E7': 'E7-97-127.mp3',
  'F7': 'F7-97-127.mp3',
  'Gb7': 'Gb7-97-127.mp3',
  'G7': 'G7-97-127.mp3',
  'Ab7': 'Ab7-97-127.mp3',
  'A7': 'A7-97-127.mp3',
  'Bb7': 'Bb7-97-127.mp3',
  'B7': 'B7-97-127.mp3',
  'C8': 'C8-97-127.mp3',
};

let _sampler: Tone.Sampler | null = null;
let _loadPromise: Promise<Tone.Sampler> | null = null;

export async function getPianoSampler(): Promise<Tone.Sampler> {
  if (_sampler) return _sampler;
  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    await Tone.start();
    _sampler = new Tone.Sampler({
      urls: SAMPLE_URLS,
      baseUrl: '/sounds/',
    }).toDestination();
    await Tone.loaded();
    return _sampler;
  })();

  return _loadPromise;
}

export function disposePianoSampler() {
  _sampler?.dispose();
  _sampler = null;
  _loadPromise = null;
}
