/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * Componente: câmera ao vivo para confirmação de ponto
 */
import { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RotateCcw, CheckCircle } from 'lucide-react';

interface LiveCameraProps {
  onCapture: (base64jpeg: string) => void;
  onClear?: () => void;
  required?: boolean;
  captured?: string | null;
}

export default function LiveCamera({ onCapture, onClear, required, captured }: LiveCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraState, setCameraState] = useState<'idle' | 'starting' | 'live' | 'captured' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  // Prefer front camera (usuário vê a si mesmo)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async (facing: 'user' | 'environment' = facingMode) => {
    stopStream();
    setCameraState('starting');
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      // Se videoRef ainda é null (elemento ainda não montou), o useEffect acima aplica o stream
      setCameraState('live');
    } catch (e: any) {
      const msg = e?.name === 'NotAllowedError'
        ? 'Acesso à câmera negado. Permita o uso da câmera no navegador.'
        : e?.name === 'NotFoundError'
        ? 'Câmera não encontrada neste dispositivo.'
        : 'Não foi possível acessar a câmera.';
      setErrorMsg(msg);
      setCameraState('error');
    }
  }, [facingMode, stopStream]);

  // Para a câmera quando o componente desmonta
  useEffect(() => {
    return () => { stopStream(); };
  }, [stopStream]);

  // Re-aplica stream ao <video> quando ele monta (após setCameraState('live'))
  // O bug: quando startCamera() roda, o <video> ainda não existe (spinner está visível),
  // então videoRef.current é null. Aqui garantimos que srcObject seja setado após montagem.
  useEffect(() => {
    if (cameraState === 'live' && videoRef.current && streamRef.current) {
      if (!videoRef.current.srcObject) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [cameraState]);

  // Se já tem foto capturada externamente, mostrar estado capturado
  useEffect(() => {
    if (captured) {
      setCameraState('captured');
      stopStream();
    }
  }, [captured, stopStream]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Captura o frame atual
    const W = 480;
    const ratio = video.videoHeight / video.videoWidth;
    canvas.width = W;
    canvas.height = Math.round(W * ratio) || 360;
    const ctx = canvas.getContext('2d')!;
    // Espelha se câmera frontal (mais natural para o usuário)
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const jpeg = canvas.toDataURL('image/jpeg', 0.75);
    stopStream();
    setCameraState('captured');
    onCapture(jpeg);
  };

  const handleRetake = () => {
    onClear?.();
    setCameraState('idle');
    startCamera(facingMode);
  };

  const toggleCamera = () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    startCamera(next);
  };

  // ── ESTADO: idle ─────────────────────────────────────────────────────────────
  if (cameraState === 'idle') {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-300 p-5 text-center bg-gray-50">
        <Camera className="mx-auto mb-2 text-gray-400" size={32} />
        <p className="text-sm text-gray-600 mb-3">
          Foto ao vivo
          {required && <span className="text-red-500 ml-1">*obrigatória</span>}
        </p>
        <button
          type="button"
          onClick={() => startCamera()}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
        >
          <Camera size={16} /> Abrir Câmera
        </button>
      </div>
    );
  }

  // ── ESTADO: starting ─────────────────────────────────────────────────────────
  if (cameraState === 'starting') {
    return (
      <div className="rounded-xl border border-gray-200 p-5 text-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Iniciando câmera...</p>
      </div>
    );
  }

  // ── ESTADO: error ────────────────────────────────────────────────────────────
  if (cameraState === 'error') {
    return (
      <div className="rounded-xl border border-red-200 p-4 bg-red-50 text-center">
        <p className="text-sm text-red-700 mb-3">{errorMsg}</p>
        <button
          type="button"
          onClick={() => startCamera()}
          className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  // ── ESTADO: captured ─────────────────────────────────────────────────────────
  if (cameraState === 'captured' && captured) {
    return (
      <div className="rounded-xl overflow-hidden border border-green-300">
        <img src={captured} alt="Foto tirada" className="w-full object-cover max-h-52" />
        <div className="flex items-center justify-between p-2 bg-green-50">
          <span className="text-xs text-green-700 flex items-center gap-1 font-semibold">
            <CheckCircle size={14} /> Foto capturada
          </span>
          <button
            type="button"
            onClick={handleRetake}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
          >
            <RotateCcw size={12} /> Tirar novamente
          </button>
        </div>
      </div>
    );
  }

  // ── ESTADO: live ─────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl overflow-hidden border border-blue-300 bg-black">
      <div className="relative">
        {/* Vídeo ao vivo — espelhado para câmera frontal */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full max-h-52 object-cover"
          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
        />
        {/* Canvas oculto para captura */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Botão trocar câmera */}
        <button
          type="button"
          onClick={toggleCamera}
          title="Trocar câmera (frontal/traseira)"
          className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70 transition-colors"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Botão tirar foto */}
      <div className="p-3 bg-gray-900 flex justify-center">
        <button
          type="button"
          onClick={handleCapture}
          className="px-6 py-2.5 bg-white text-gray-900 font-bold text-sm rounded-full hover:bg-gray-100 active:scale-95 transition-all flex items-center gap-2 shadow-lg"
        >
          <Camera size={18} /> Tirar Foto
        </button>
      </div>
    </div>
  );
}
