/**
 * Haversine formula - calculate distance between two GPS coordinates in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Check if employee is within allowed radius of store
 * @returns {{ isWithin: boolean, distance: number, allowedRadius: number }}
 */
function isWithinRadius(empLat, empLon, storeLat, storeLon, radius) {
  const distance = calculateDistance(empLat, empLon, storeLat, storeLon);
  return {
    isWithin: distance <= radius,
    distance: Math.round(distance),
    allowedRadius: radius
  };
}

module.exports = { calculateDistance, isWithinRadius };
