/**
 * map.js — Global Surplus Redistribution Platform
 * Leaflet map initializer for donation map pages.
 *
 * Privacy rules enforced:
 * - getUserLocation() NEVER stores coordinates server-side.
 * - Coordinates are used only for local map display.
 * - No coordinates are logged or sent to the server directly from this module.
 */

'use strict';

var OSM_DEFAULT_TILE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
var OSM_ATTRIBUTION  = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Initialise a Leaflet map inside the given container element.
 * The tile URL is read from the container's data-tile-url attribute;
 * falls back to OpenStreetMap default.
 *
 * @param {string} containerId  The id of the map container div
 * @param {object} [options]    Optional Leaflet map options override
 * @returns {L.Map|null}        The Leaflet map instance, or null if Leaflet is unavailable
 */
function initMap(containerId, options) {
  if (typeof L === 'undefined') {
    console.error('[map.js] Leaflet (L) is not loaded. Ensure Leaflet CDN script is included before map.js.');
    return null;
  }

  var container = document.getElementById(containerId);
  if (!container) {
    console.error('[map.js] Map container not found: #' + containerId);
    return null;
  }

  // Read tile URL from data attribute, fall back to OSM default
  var tileUrl = container.getAttribute('data-tile-url') || OSM_DEFAULT_TILE;

  var defaultOptions = {
    center: [20, 0],   // Approximate world centre
    zoom: 2,
    scrollWheelZoom: false,
  };

  var mapOptions = Object.assign({}, defaultOptions, options || {});
  var map = L.map(containerId, mapOptions);

  L.tileLayer(tileUrl, {
    attribution: OSM_ATTRIBUTION,
    maxZoom: 19,
  }).addTo(map);

  return map;
}

/**
 * Add a donation marker to the given map at the specified coordinates.
 * Opens a popup with the provided HTML when the marker is clicked.
 *
 * @param {L.Map}   map        Leaflet map instance
 * @param {number}  lat        Latitude
 * @param {number}  lng        Longitude
 * @param {string}  popupHtml  HTML string for the marker popup
 * @returns {L.Marker}         The created marker instance
 */
function addDonationMarker(map, lat, lng, popupHtml) {
  if (typeof L === 'undefined') {
    console.error('[map.js] Leaflet is not loaded.');
    return null;
  }

  var marker = L.marker([lat, lng]).addTo(map);

  if (popupHtml) {
    marker.bindPopup(popupHtml);
  }

  return marker;
}

/**
 * Request the user's current position via the Geolocation API.
 * Returns a Promise resolving with { lat, lng }.
 *
 * PRIVACY: Coordinates are NEVER stored or sent to the server from this function.
 * The caller is responsible for using coordinates only for local display.
 * On permission denial or error, the promise rejects with a user-friendly message.
 *
 * @returns {Promise<{lat: number, lng: number}>}
 */
function getUserLocation() {
  return new Promise(function (resolve, reject) {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    var options = {
      enableHighAccuracy: false, // Lower accuracy is sufficient for nearby search
      timeout: 10000,            // 10-second timeout
      maximumAge: 60000,         // Accept a cached position up to 1 minute old
    };

    navigator.geolocation.getCurrentPosition(
      function (position) {
        // PRIVACY: return coords only — do not log, do not store, do not send to server
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      function (error) {
        var message;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access was denied. Please enter your location manually.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Your location could not be determined. Please enter your location manually.';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out. Please enter your location manually.';
            break;
          default:
            message = 'An error occurred getting your location. Please enter your location manually.';
        }
        reject(new Error(message));
      },
      options
    );
  });
}

/* ── Exports ────────────────────────────────────────────────────────────────── */
window.initMap            = initMap;
window.addDonationMarker  = addDonationMarker;
window.getUserLocation    = getUserLocation;
