// ─────────────────────────────────────────────────────────────────────────────
// maritimeService.js
// Provides real geographic coordinates, maritime sea distances, and
// live weather lookups (via Open-Meteo API) for global shipping ports.
// ─────────────────────────────────────────────────────────────────────────────

const axios = require("axios");
const logger = require("../utils/logger");

const PORTS_DATA = {
  "Shanghai": { label: "Shanghai, CN", lat: 31.23, lon: 121.47, baseCongestion: 0.65 },
  "Singapore": { label: "Singapore, SG", lat: 1.29, lon: 103.85, baseCongestion: 0.55 },
  "Rotterdam": { label: "Rotterdam, NL", lat: 51.92, lon: 4.48, baseCongestion: 0.58 },
  "Busan": { label: "Busan, KR", lat: 35.18, lon: 129.07, baseCongestion: 0.42 },
  "Los Angeles": { label: "Los Angeles, US", lat: 33.74, lon: -118.27, baseCongestion: 0.68 },
  "Hamburg": { label: "Hamburg, DE", lat: 53.55, lon: 9.99, baseCongestion: 0.50 },
  "Dubai": { label: "Dubai (Jebel Ali), UAE", lat: 25.01, lon: 55.06, baseCongestion: 0.48 },
  "Mumbai": { label: "Mumbai (Nhava Sheva), IN", lat: 18.95, lon: 72.95, baseCongestion: 0.52 },
  "Felixstowe": { label: "Felixstowe, UK", lat: 51.96, lon: 1.35, baseCongestion: 0.46 },
  "Tokyo": { label: "Tokyo, JP", lat: 35.65, lon: 139.77, baseCongestion: 0.40 },
  "Antwerp": { label: "Antwerp, BE", lat: 51.22, lon: 4.40, baseCongestion: 0.52 },
  "Santos": { label: "Santos, BR", lat: -23.96, lon: -46.33, baseCongestion: 0.45 },
  "Hong Kong": { label: "Hong Kong, HK", lat: 22.32, lon: 114.17, baseCongestion: 0.48 },
  "Valencia": { label: "Valencia, ES", lat: 39.45, lon: -0.32, baseCongestion: 0.38 },
  "Sydney": { label: "Sydney, AU", lat: -33.87, lon: 151.21, baseCongestion: 0.35 },
  "Colombo": { label: "Colombo, LK", lat: 6.93, lon: 79.85, baseCongestion: 0.44 },
};

// Key maritime route distances (in km) through major shipping lanes
const MARITIME_DISTANCES = {
  "Shanghai_Rotterdam": 19550,
  "Shanghai_Los Angeles": 11200,
  "Shanghai_Singapore": 4200,
  "Shanghai_Busan": 1050,
  "Shanghai_Hamburg": 20100,
  "Shanghai_Dubai": 10900,
  "Shanghai_Mumbai": 9200,
  "Singapore_Rotterdam": 15400,
  "Singapore_Busan": 4600,
  "Singapore_Los Angeles": 14200,
  "Singapore_Dubai": 6200,
  "Singapore_Mumbai": 3900,
  "Rotterdam_Hamburg": 650,
  "Rotterdam_Felixstowe": 380,
  "Rotterdam_Los Angeles": 15800,
  "Rotterdam_Santos": 10200,
  "Mumbai_Rotterdam": 11600,
  "Mumbai_Dubai": 2100,
  "Mumbai_Felixstowe": 12100,
  "Dubai_Rotterdam": 10200,
  "Los Angeles_Tokyo": 8800,
  "Tokyo_Rotterdam": 20800,
};

// Simple in-memory weather cache (20 minute TTL)
const weatherCache = new Map();
const CACHE_TTL_MS = 20 * 60 * 1000;

function normalizePortName(name = "") {
  if (!name) return "Shanghai";
  const clean = String(name).split(",")[0].split("(")[0].trim();
  for (const key of Object.keys(PORTS_DATA)) {
    if (key.toLowerCase() === clean.toLowerCase() || name.toLowerCase().includes(key.toLowerCase())) {
      return key;
    }
  }
  return clean || "Shanghai";
}

function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  // Apply a 1.35 maritime circumnavigation factor for sea routes
  return Math.round(R * c * 1.35);
}

function getMaritimeDistance(originPort, destPort) {
  const o = normalizePortName(originPort);
  const d = normalizePortName(destPort);
  if (o === d) return 500;

  const key1 = `${o}_${d}`;
  const key2 = `${d}_${o}`;

  if (MARITIME_DISTANCES[key1]) return MARITIME_DISTANCES[key1];
  if (MARITIME_DISTANCES[key2]) return MARITIME_DISTANCES[key2];

  const p1 = PORTS_DATA[o];
  const p2 = PORTS_DATA[d];
  if (p1 && p2) {
    return calculateHaversineKm(p1.lat, p1.lon, p2.lat, p2.lon);
  }

  return 8000;
}

/**
 * Fetch live weather for a port using Open-Meteo free API
 */
async function fetchPortLiveWeather(portKey) {
  const port = PORTS_DATA[portKey];
  if (!port) return { severity: "clear", windSpeed: 10, temp: 20, desc: "Normal" };

  const now = Date.now();
  if (weatherCache.has(portKey)) {
    const cached = weatherCache.get(portKey);
    if (now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${port.lat}&longitude=${port.lon}&current=weather_code,wind_speed_10m,precipitation,temperature_2m`;
    const res = await axios.get(url, { timeout: 3500 });
    const current = res.data?.current || {};

    const wind = current.wind_speed_10m || 10;
    const precip = current.precipitation || 0;
    const code = current.weather_code || 0;
    const temp = current.temperature_2m || 20;

    let severity = "clear";
    let desc = "Clear / Fair";

    // Storm conditions (High winds > 45km/h, thunderstorms code 95-99, gale snow 75-77)
    if (wind >= 45 || [95, 96, 99, 75, 77, 85, 86].includes(code)) {
      severity = "storm";
      desc = `Storm Advisory (${wind} km/h wind)`;
    } else if (wind >= 25 || precip >= 2.0 || [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
      severity = "moderate";
      desc = `Moderate Squall / Rain (${wind} km/h wind)`;
    }

    const result = { severity, windSpeed: wind, temp, desc, code };
    weatherCache.set(portKey, { timestamp: now, data: result });
    return result;
  } catch (err) {
    logger.warn(`Open-Meteo live weather lookup failed for ${portKey}: ${err.message}`);
    const fallback = { severity: "clear", windSpeed: 12, temp: 20, desc: "Live service standby" };
    return fallback;
  }
}

/**
 * Enrich shipment route with real distances, live port weather, and congestion indices
 */
async function enrichShipmentRoute(origin, destination, extra = {}) {
  const originKey = normalizePortName(origin);
  const destKey = normalizePortName(destination);

  const distanceKm = extra.distance_km || extra.distanceKm || getMaritimeDistance(originKey, destKey);
  const [originWeather, destWeather] = await Promise.all([
    fetchPortLiveWeather(originKey),
    fetchPortLiveWeather(destKey),
  ]);

  // Combine weather severity: if either port experiences a storm, route severity is elevated
  let weatherSeverity = "clear";
  if (originWeather.severity === "storm" || destWeather.severity === "storm") {
    weatherSeverity = "storm";
  } else if (originWeather.severity === "moderate" || destWeather.severity === "moderate") {
    weatherSeverity = "moderate";
  }

  // Base congestions from port profiles
  const originCongestion = Number(extra.origin_congestion || extra.originCongestion || PORTS_DATA[originKey]?.baseCongestion || 0.5);
  const destCongestion = Number(extra.destination_congestion || extra.destinationCongestion || PORTS_DATA[destKey]?.baseCongestion || 0.5);

  // Scaled transit & delay benchmarks based on real distance
  const transitDays = Math.max(2, Math.round(distanceKm / 750));
  const routeAvgDelayDays = Number(extra.route_avg_delay_days || extra.routeAvgDelayDays || Math.max(1.0, (transitDays * 0.12).toFixed(1)));

  return {
    origin_port: originKey,
    destination_port: destKey,
    distance_km: distanceKm,
    origin_congestion: originCongestion,
    destination_congestion: destCongestion,
    weather_severity: weatherSeverity,
    route_avg_delay_days: routeAvgDelayDays,
    transit_days: transitDays,
    live_weather: {
      origin: { port: originKey, ...originWeather },
      destination: { port: destKey, ...destWeather },
    },
  };
}

module.exports = {
  PORTS_DATA,
  normalizePortName,
  getMaritimeDistance,
  fetchPortLiveWeather,
  enrichShipmentRoute,
};
