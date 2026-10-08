import crypto from 'crypto';
import { Request } from 'express';
import AttendanceLink from '../models/AttendanceLink';

export type DeviceVerificationCode =
  | 'DEVICE_NOT_REGISTERED'
  | 'DEVICE_NOT_AUTHORIZED';

export interface DeviceVerification {
  valid: boolean;
  code?: DeviceVerificationCode;
  message?: string;
}

export function createDeviceSecret(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashDeviceValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function safeHashEqual(value: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashDeviceValue(value), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function getDeviceSecretFromRequest(req: Request): string {
  return String(req.header('X-Attendance-Device') || '').trim();
}

export async function verifyAttendanceDevice(
  req: Request,
  linkId: string
): Promise<DeviceVerification> {
  const link = await AttendanceLink.findById(linkId)
    .select('+deviceSecretHash deviceBoundAt isActive')
    .lean() as any;

  if (!link?.isActive || !link.deviceSecretHash) {
    return {
      valid: false,
      code: 'DEVICE_NOT_REGISTERED',
      message: 'Este ponto ainda não possui dispositivo cadastrado. Solicite à administração um link de ativação.',
    };
  }

  const secret = getDeviceSecretFromRequest(req);
  if (!secret || !safeHashEqual(secret, link.deviceSecretHash)) {
    return {
      valid: false,
      code: 'DEVICE_NOT_AUTHORIZED',
      message: 'Este dispositivo não está autorizado. Somente o dispositivo cadastrado pode registrar frequência.',
    };
  }

  await AttendanceLink.updateOne(
    { _id: linkId },
    { $set: { deviceLastSeenAt: new Date() } }
  );
  return { valid: true };
}

export function validateAttendancePhoto(photoData: unknown, required: boolean): string | undefined {
  if (!photoData) return required ? 'Foto ao vivo obrigatória.' : undefined;
  if (typeof photoData !== 'string') return 'Formato de foto inválido.';
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photoData)) {
    return 'A foto deve ser uma imagem JPEG, PNG ou WebP válida.';
  }
  if (Buffer.byteLength(photoData, 'utf8') > 5 * 1024 * 1024) {
    return 'A foto excede o limite de 5 MB.';
  }
  return undefined;
}

export function compareEnrollmentToken(token: string, expectedHash: string): boolean {
  return Boolean(token) && safeHashEqual(token, expectedHash);
}
