import React from 'react';

interface WaveformProps {
  active: boolean;
  color?: string;
}

const Waveform: React.FC<WaveformProps> = ({ active, color = 'bg-gold-500' }) => {
  return (
    <div className="flex items-center justify-center gap-1 h-12">
      {[1, 2, 3, 4, 5].map((bar) => (
        <div
          key={bar}
          className={`w-1.5 rounded-full ${color} transition-all duration-300 ease-in-out ${
            active ? 'animate-pulse' : 'h-1.5 opacity-30'
          }`}
          style={{
            height: active ? `${Math.random() * 24 + 12}px` : '4px',
            animationDelay: `${bar * 0.1}s`
          }}
        />
      ))}
    </div>
  );
};

export default Waveform;