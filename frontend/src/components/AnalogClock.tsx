import { useEffect, useState } from 'react';

interface AnalogClockProps {
  size?: number;
  showNumbers?: boolean;
}

// Hora sempre no fuso de Brasília, independente do sistema da TV Box
const getBrazilTime = (): Date => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value ?? '0');
  const h = get('hour');
  return new Date(get('year'), get('month') - 1, get('day'), h === 24 ? 0 : h, get('minute'), get('second'));
};

export default function AnalogClock({ size = 200, showNumbers = true }: AnalogClockProps) {
  const [time, setTime] = useState(getBrazilTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(getBrazilTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours() % 12;
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  // Calcular ângulos (começando do topo, 12h = 0°)
  const secondAngle = (seconds * 6) - 90; // 360° / 60s = 6° por segundo
  const minuteAngle = (minutes * 6 + seconds * 0.1) - 90; // 360° / 60m = 6° por minuto
  const hourAngle = (hours * 30 + minutes * 0.5) - 90; // 360° / 12h = 30° por hora

  const center = size / 2;
  const clockRadius = size / 2 - 10;

  // Comprimentos dos ponteiros
  const hourLength = clockRadius * 0.5;
  const minuteLength = clockRadius * 0.7;
  const secondLength = clockRadius * 0.9;

  // Calcular posições dos ponteiros
  const getHandPosition = (angle: number, length: number) => {
    const radian = (angle * Math.PI) / 180;
    return {
      x: center + length * Math.cos(radian),
      y: center + length * Math.sin(radian)
    };
  };

  const hourHand = getHandPosition(hourAngle, hourLength);
  const minuteHand = getHandPosition(minuteAngle, minuteLength);
  const secondHand = getHandPosition(secondAngle, secondLength);

  // Posições dos números
  const numbers = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Círculo externo */}
        <circle
          cx={center}
          cy={center}
          r={clockRadius}
          fill="rgba(30, 41, 59, 0.9)"
          stroke="rgba(250, 204, 21, 0.8)"
          strokeWidth="4"
        />

        {/* Marcações das horas */}
        {[...Array(12)].map((_, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const startRadius = clockRadius - 15;
          const endRadius = clockRadius - 5;
          const x1 = center + startRadius * Math.cos(angle);
          const y1 = center + startRadius * Math.sin(angle);
          const x2 = center + endRadius * Math.cos(angle);
          const y2 = center + endRadius * Math.sin(angle);
          
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(250, 204, 21, 0.6)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          );
        })}

        {/* Marcações dos minutos */}
        {[...Array(60)].map((_, i) => {
          if (i % 5 === 0) return null; // Pular marcações de hora
          const angle = (i * 6 - 90) * (Math.PI / 180);
          const startRadius = clockRadius - 8;
          const endRadius = clockRadius - 3;
          const x1 = center + startRadius * Math.cos(angle);
          const y1 = center + startRadius * Math.sin(angle);
          const x2 = center + endRadius * Math.cos(angle);
          const y2 = center + endRadius * Math.sin(angle);
          
          return (
            <line
              key={`min-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(250, 204, 21, 0.3)"
              strokeWidth="1"
            />
          );
        })}

        {/* Números */}
        {showNumbers && numbers.map((num) => {
          const angle = ((num === 12 ? 0 : num) * 30 - 90) * (Math.PI / 180);
          const radius = clockRadius - 30;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          
          return (
            <text
              key={num}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(250, 204, 21, 1)"
              fontSize={size / 10}
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
            >
              {num}
            </text>
          );
        })}

        {/* Ponteiro das horas */}
        <line
          x1={center}
          y1={center}
          x2={hourHand.x}
          y2={hourHand.y}
          stroke="rgba(255, 255, 255, 0.95)"
          strokeWidth={size / 30}
          strokeLinecap="round"
        />

        {/* Ponteiro dos minutos */}
        <line
          x1={center}
          y1={center}
          x2={minuteHand.x}
          y2={minuteHand.y}
          stroke="rgba(250, 204, 21, 0.95)"
          strokeWidth={size / 40}
          strokeLinecap="round"
        />

        {/* Ponteiro dos segundos */}
        <line
          x1={center}
          y1={center}
          x2={secondHand.x}
          y2={secondHand.y}
          stroke="rgba(239, 68, 68, 0.9)"
          strokeWidth={size / 80}
          strokeLinecap="round"
        />

        {/* Centro do relógio */}
        <circle
          cx={center}
          cy={center}
          r={size / 40}
          fill="rgba(250, 204, 21, 1)"
        />
        <circle
          cx={center}
          cy={center}
          r={size / 50}
          fill="rgba(239, 68, 68, 1)"
        />
      </svg>

      {/* Horário digital */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-gray-900 px-3 py-1 rounded-lg border border-yellow-500">
        <span className="text-yellow-400 font-mono font-bold text-sm">
          {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
