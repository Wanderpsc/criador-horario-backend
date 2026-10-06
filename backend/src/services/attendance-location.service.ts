import User from '../models/User';
import SchoolPontoLink from '../models/SchoolPontoLink';
import TeacherPontoLink from '../models/TeacherPontoLink';

export interface AttendanceLocationConfig {
  required: boolean;
  latitude?: number;
  longitude?: number;
  radiusMeters: number;
}

export interface AttendanceLocationValidation extends AttendanceLocationConfig {
  configured: boolean;
  valid: boolean;
  distanceMeters?: number;
  message?: string;
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const radius = 6371000;
  const toRadians = (value: number) => value * Math.PI / 180;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const value =
    Math.sin(deltaLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export async function getAttendanceLocation(schoolId: string): Promise<AttendanceLocationConfig> {
  const school = await User.findById(schoolId).select('attendanceLocation').lean() as any;
  const central = school?.attendanceLocation;
  if (central?.latitude != null && central?.longitude != null) {
    return {
      required: central.required !== false,
      latitude: central.latitude,
      longitude: central.longitude,
      radiusMeters: central.radiusMeters || 50,
    };
  }

  const [teacherLink, schoolLink] = await Promise.all([
    TeacherPontoLink.findOne({ schoolId, isActive: true }).lean() as any,
    SchoolPontoLink.findOne({ schoolId, isActive: true }).lean() as any,
  ]);
  const legacy = teacherLink?.latitude != null ? teacherLink : schoolLink;
  return {
    required: legacy?.requireGeolocation || false,
    latitude: legacy?.latitude,
    longitude: legacy?.longitude,
    radiusMeters: legacy?.areaM2 ? Math.sqrt(legacy.areaM2 / Math.PI) : 50,
  };
}

export async function validateAttendanceLocation(
  schoolId: string,
  latitude?: number,
  longitude?: number
): Promise<AttendanceLocationValidation> {
  const config = await getAttendanceLocation(schoolId);
  const configured = config.latitude != null && config.longitude != null;

  if (!config.required) {
    return { ...config, configured, valid: true };
  }
  if (!configured) {
    return {
      ...config,
      configured: false,
      valid: false,
      message: 'A localização do ponto ainda não foi configurada pela escola.',
    };
  }
  if (latitude == null || longitude == null) {
    return {
      ...config,
      configured: true,
      valid: false,
      message: 'Localização obrigatória. Ative o GPS e permita o acesso à localização.',
    };
  }

  const distance = distanceMeters(config.latitude!, config.longitude!, latitude, longitude);
  return {
    ...config,
    configured: true,
    valid: distance <= config.radiusMeters,
    distanceMeters: Math.round(distance),
    message: distance <= config.radiusMeters
      ? undefined
      : `Fora do local de trabalho (${Math.round(distance)}m de distância, limite de ${Math.round(config.radiusMeters)}m).`,
  };
}
