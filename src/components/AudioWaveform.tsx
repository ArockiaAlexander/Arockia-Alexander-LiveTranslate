import { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  isActive: boolean;
  isSpeaking?: boolean;
  level?: number;
  color?: string;
  barsCount?: number;
  className?: string;
}

export function AudioWaveform({
  isActive,
  isSpeaking = false,
  level = 0,
  color = '#2563EB',
  barsCount = 20,
  className = '',
}: AudioWaveformProps) {
  const heightsRef = useRef<number[]>(new Array(barsCount).fill(4));

  // Animate bars based on microphone level or synthetic speaking wave
  const bars = Array.from({ length: barsCount }, (_, index) => {
    let barHeight = 4;
    if (isActive) {
      const normalizedLevel = Math.max(0.1, Math.min(1, level * 2.5));
      const distanceToCenter = Math.abs(index - barsCount / 2) / (barsCount / 2);
      const randomJitter = Math.sin(Date.now() / 150 + index) * 0.3 + 0.7;
      barHeight = Math.max(4, Math.floor(normalizedLevel * 32 * (1 - distanceToCenter * 0.5) * randomJitter));
    } else if (isSpeaking) {
      const wave = Math.sin(Date.now() / 180 + index * 0.45) * 0.5 + 0.5;
      barHeight = Math.max(4, Math.floor(wave * 24 + 4));
    }

    return (
      <div
        key={index}
        className="w-1 rounded-full transition-all duration-75"
        style={{
          height: `${barHeight}px`,
          backgroundColor: isActive ? '#EF4444' : isSpeaking ? color : '#CBD5E1',
        }}
      />
    );
  });

  return (
    <div className={`flex items-center justify-center gap-1 h-10 px-2 ${className}`}>
      {bars}
    </div>
  );
}
