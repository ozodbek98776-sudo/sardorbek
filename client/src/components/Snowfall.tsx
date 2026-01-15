import { useEffect, useState } from 'react';

interface Snowflake {
  id: number;
  left: number;
  size: 'small' | 'medium' | 'large';
  speed: 'slow' | 'normal' | 'fast';
  delay: number;
  symbol: string;
}

const snowSymbols = ['❄', '❅', '❆', '✻', '✼', '❉', '✿', '❋'];

export default function Snowfall() {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);

  useEffect(() => {
    // 40 ta qor yaratish
    const flakes: Snowflake[] = [];
    for (let i = 0; i < 40; i++) {
      const sizes: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large'];
      const speeds: ('slow' | 'normal' | 'fast')[] = ['slow', 'normal', 'fast'];
      
      flakes.push({
        id: i,
        left: Math.random() * 100,
        size: sizes[Math.floor(Math.random() * sizes.length)],
        speed: speeds[Math.floor(Math.random() * speeds.length)],
        delay: Math.random() * 10,
        symbol: snowSymbols[Math.floor(Math.random() * snowSymbols.length)]
      });
    }
    setSnowflakes(flakes);
  }, []);

  return (
    <div className="snowfall-container">
      {snowflakes.map((flake) => (
        <span
          key={flake.id}
          className={`snowflake ${flake.size} ${flake.speed}`}
          style={{
            left: `${flake.left}%`,
            animationDelay: `${flake.delay}s`
          }}
        >
          {flake.symbol}
        </span>
      ))}
    </div>
  );
}
