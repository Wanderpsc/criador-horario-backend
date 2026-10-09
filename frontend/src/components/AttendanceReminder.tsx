import { useEffect, useMemo, useRef, useState } from 'react';
import { AlarmClock, Bell, BellOff } from 'lucide-react';

interface AttendanceReminderItem {
  time: string;
  label: string;
}

interface AttendanceReminderProps {
  personName: string;
  reminders: AttendanceReminderItem[];
  storageKey: string;
}

function notificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export default function AttendanceReminder({ personName, reminders, storageKey }: AttendanceReminderProps) {
  const [enabled, setEnabled] = useState(() =>
    localStorage.getItem(storageKey) === 'enabled'
      && notificationSupported()
      && Notification.permission === 'granted'
  );
  const [notice, setNotice] = useState('');
  const audioContextRef = useRef<AudioContext | null>(null);

  const uniqueReminders = useMemo(() => {
    const seen = new Set<string>();
    return reminders.filter(reminder => {
      if (!/^\d{2}:\d{2}$/.test(reminder.time) || seen.has(`${reminder.time}-${reminder.label}`)) return false;
      seen.add(`${reminder.time}-${reminder.label}`);
      return true;
    });
  }, [reminders]);

  useEffect(() => {
    if (!enabled) return;

    const timers = uniqueReminders.flatMap(reminder => {
      const [hours, minutes] = reminder.time.split(':').map(Number);
      const alarmAt = new Date();
      alarmAt.setHours(hours, minutes, 0, 0);
      const delay = alarmAt.getTime() - Date.now();
      if (delay <= 0) return [];

      return [window.setTimeout(() => {
        if (notificationSupported() && Notification.permission === 'granted') {
          new Notification('Hora de registrar o ponto', {
            body: `${personName}: ${reminder.label} às ${reminder.time}.`,
            tag: `attendance-${storageKey}-${reminder.time}-${reminder.label}`,
          });
          return;
        }

        navigator.vibrate?.([300, 150, 300]);
        const audioContext = audioContextRef.current;
        if (audioContext) {
          void audioContext.resume().then(() => {
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();
            oscillator.connect(gain);
            gain.connect(audioContext.destination);
            oscillator.frequency.value = 880;
            gain.gain.value = 0.15;
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.8);
          });
        }
      }, delay)];
    });

    return () => timers.forEach(window.clearTimeout);
  }, [enabled, personName, storageKey, uniqueReminders]);

  async function toggleReminder() {
    if (enabled) {
      localStorage.removeItem(storageKey);
      setEnabled(false);
      setNotice('');
      return;
    }

    if (typeof AudioContext !== 'undefined' && !audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    if (notificationSupported() && Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    const usesSystemNotification = notificationSupported() && Notification.permission === 'granted';
    setNotice(usesSystemNotification
      ? 'Notificações ativadas neste celular.'
      : 'Alarme ativado nesta página. Mantenha-a aberta para ouvir o aviso.');
    localStorage.setItem(storageKey, 'enabled');
    setEnabled(true);
  }

  if (uniqueReminders.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
      <div className="flex items-start gap-3">
        <AlarmClock className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900">Lembrete do ponto</p>
          <p className="mt-0.5 text-xs text-amber-700">
            {uniqueReminders.map(item => `${item.label}: ${item.time}`).join(' · ')}
          </p>
          {!notificationSupported() && (
            <p className="mt-2 text-xs text-amber-700">
              Neste navegador, o aviso usará som e vibração enquanto esta página estiver aberta.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={toggleReminder}
          className={`flex min-h-9 flex-shrink-0 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold ${
            enabled ? 'bg-amber-600 text-white' : 'border border-amber-300 bg-white text-amber-800'
          }`}
        >
          {enabled ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
          {enabled ? 'Ativo' : 'Ativar'}
        </button>
      </div>
      {notice && <p className="mt-2 text-[11px] text-amber-700">{notice}</p>}
      {enabled && (
        <p className="mt-2 text-[11px] text-amber-700">
          Mantenha esta página aberta no celular para receber o aviso.
        </p>
      )}
    </div>
  );
}
