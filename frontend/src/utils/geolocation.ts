export function getAttendancePosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    let bestPosition: GeolocationPosition | null = null;
    let settled = false;
    let watchId: number | undefined;

    const finish = (position?: GeolocationPosition, error?: GeolocationPositionError | Error) => {
      if (settled) return;
      settled = true;
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
      clearTimeout(timeoutId);
      if (position) resolve(position);
      else reject(error || new Error('Localização não disponível.'));
    };

    const timeoutId = window.setTimeout(() => {
      finish(bestPosition || undefined, new Error('Tempo esgotado ao obter a localização.'));
    }, 15000);

    watchId = navigator.geolocation.watchPosition(
      position => {
        if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
          bestPosition = position;
        }
        if (position.coords.accuracy <= 30) finish(position);
      },
      error => {
        if (error.code === error.PERMISSION_DENIED) finish(undefined, error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  });
}
