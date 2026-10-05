import { addDays, format, parseISO } from 'date-fns';

interface CertificateUser {
  role: string;
  schoolId?: string;
  permissions?: Record<string, { access?: boolean; read?: boolean; create?: boolean; update?: boolean; delete?: boolean }>;
}

export function canUseCertificates(user: CertificateUser | null, action: 'read' | 'create' | 'update' | 'delete' = 'read') {
  if (!user) return false;
  if (user.role === 'school' || (user.role === 'admin' && user.schoolId)) return true;
  const permission = user.permissions?.medicalCertificates;
  return !!user.schoolId && permission?.access === true && permission[action] === true;
}

export function todayLocal() {
  return format(new Date(), 'yyyy-MM-dd');
}

export function certificateStatus(record: { startDate: string; returnDate: string; returnedAt: string; alertDays: number }, today: string) {
  if (record.returnedAt) return { key: 'returned', label: 'Retorno confirmado', color: 'bg-green-100 text-green-800' };
  if (today > record.returnDate) return { key: 'overdue', label: 'Retorno não confirmado', color: 'bg-red-100 text-red-800' };
  if (today === record.returnDate) return { key: 'today', label: 'Retorno hoje', color: 'bg-amber-100 text-amber-900' };
  if (today >= format(addDays(parseISO(record.returnDate), -record.alertDays), 'yyyy-MM-dd')) {
    return { key: 'soon', label: 'Retorno próximo', color: 'bg-amber-100 text-amber-900' };
  }
  if (today < record.startDate) return { key: 'planned', label: 'Afastamento programado', color: 'bg-purple-100 text-purple-800' };
  return { key: 'active', label: 'Em afastamento', color: 'bg-blue-100 text-blue-800' };
}
