/**
 * lib/geocoding.js — Step 6
 * City → lat/lon via OpenStreetMap Nominatim (free, no API key).
 * Browser-safe (uses fetch). Requires a User-Agent header per Nominatim ToS.
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'Ephi-Astrology-App/1.0 (https://github.com/ephi)';

// Simple in-memory cache to avoid duplicate requests
const cache = new Map();

/**
 * Search for a city and return lat/lon.
 * @param {string} query — city name, e.g. "Manila" or "New York, US"
 * @returns {Promise<Array<{lat, lon, display_name}>>}
 */
export async function geocodeCity(query) {
  const key = query.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key);

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '5',
    addressdetails: '1',
  });

  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);

  const data = await res.json();
  const results = data.map(r => ({
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
    display_name: r.display_name,
    type: r.type,
    country: r.address?.country || '',
    city: r.address?.city || r.address?.town || r.address?.village || query,
  }));

  cache.set(key, results);
  return results;
}

/**
 * Get the best single result for a city query.
 * @param {string} query
 * @returns {Promise<{lat, lon, display_name, city, country}|null>}
 */
export async function getCoordinates(query) {
  const results = await geocodeCity(query);
  return results.length > 0 ? results[0] : null;
}

/**
 * Reverse geocode: lat/lon → place name.
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<string>} display name
 */
export async function reverseGeocode(lat, lon) {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    format: 'json',
  });

  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!res.ok) throw new Error(`Nominatim reverse error: ${res.status}`);
  const data = await res.json();
  return data.display_name || `${lat}, ${lon}`;
}

/**
 * Get user's current location via browser Geolocation API.
 * @returns {Promise<{lat, lon, city}>}
 */
export function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lon } = pos.coords;
        const city = await reverseGeocode(lat, lon).catch(() => `${lat.toFixed(2)}, ${lon.toFixed(2)}`);
        resolve({ lat, lon, city });
      },
      err => reject(new Error(`Geolocation denied: ${err.message}`)),
      { timeout: 8000 }
    );
  });
}
