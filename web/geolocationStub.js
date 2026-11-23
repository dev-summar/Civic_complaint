const Geolocation = {
  getCurrentPosition(success, error, options) {
    if (!navigator.geolocation) {
      error && error({code: 2, message: 'Geolocation not supported', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3});
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos =>
        success({
          coords: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            altitude: pos.coords.altitude,
            accuracy: pos.coords.accuracy,
            altitudeAccuracy: pos.coords.altitudeAccuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
          },
          timestamp: pos.timestamp,
        }),
      err => error && error(err),
      options,
    );
  },
  watchPosition(success, error, options) {
    if (!navigator.geolocation) return -1;
    return navigator.geolocation.watchPosition(
      pos =>
        success({
          coords: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            altitude: pos.coords.altitude,
            accuracy: pos.coords.accuracy,
            altitudeAccuracy: pos.coords.altitudeAccuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
          },
          timestamp: pos.timestamp,
        }),
      err => error && error(err),
      options,
    );
  },
  clearWatch(id) {
    if (navigator.geolocation && id != null) {
      navigator.geolocation.clearWatch(id);
    }
  },
  requestAuthorization() {},
  setRNConfiguration() {},
};

export default Geolocation;
