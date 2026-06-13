export async function reverseGeocode(latitude, longitude) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'FoodBridge/1.0 (pickup-location-service)' },
    });
    const data = await response.json();
    if (data && data.display_name) {
      return `Pickup is available at ${data.display_name}.`;
    }
  } catch {}
  return `Pickup is available at coordinates (${latitude}, ${longitude}).`;
}

export function generateHandshakeCode() {
  return `FB-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function now() {
  return new Date().toISOString();
}

export function isExpired(createdAt, expiryHours) {
  const created = new Date(createdAt).getTime();
  const expiresAt = created + expiryHours * 60 * 60 * 1000;
  return expiresAt < Date.now();
}
