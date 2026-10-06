import { useEffect, useMemo, useState } from 'react';
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
    notificationSupported()
      && Notification.permission === 'granted'
      && localStorage.getItem(storageKey) === 'enabled'
  );

  const uniqueReminders = useMemo(() => {
    const seen = new Set<string>();
    return reminders.filter(reminder => {
      if (!/^\d{2}:\d{2}$/.test(reminder.time) || seen.has(`${reminder.time}-${reminder.label}`)) return false;
      seen.add(`${reminder.time}-${reminder.label}`);
      return true;
    });
  }, [reminders]);

  useEffect(() => {
    if (!enabled || !notificationSupported() || Notification.permission !== 'granted') return;

    const timers = uniqueReminders.flatMap(reminder => {
      const [hours, minutes] = reminder.time.split(':').map(Number);
      const alarmAt = new Date();
      alarmAt.setHours(hours, minutes, 0, 0);
      const delay = alarmAt.getTime() - Date.now();
      if (delay <= 0) return [];

      return [window.setTimeout(() => {
        new Notification('Hora de registrar o ponto', {
          body: `${personName}: ${reminder.label} às ${reminder.time}.`,
          tag: `attendance-${storageKey}-${reminder.time}-${reminder.label}`,
        });
      }, delay)];
    });

    return () => timers.forEach(window.clearTimeout);
  }, [enabled, personName, storageKey, uniqueReminders]);

  async function toggleReminder() {
    if (!notificationSupported()) return;
    if (enabled) {
      localStorage.removeItem(storageKey);
      setEnabled(false);
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      localStorage.setItem(storageKey, 'enabled');
      setEnabled(true);
    }
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
            <p className="mt-2 text-xs text-amber-700">Este navegador não oferece notificações locais.</p>
          )}
        </div>
        {notificationSupported() && (
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
        )}
      </div>
      {enabled && (
        <p className="mt-2 text-[11px] text-amber-700">
          Mantenha esta página aberta no celular para receber o aviso.
        </p>
      )}
    </div>
  );
}
