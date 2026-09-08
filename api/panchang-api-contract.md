# Panchangam API Contract

Saptarushi computes the pañchāṅgam **in the browser** using the
Swiss-Ephemeris–precision library `@ishubhamx/panchangam-js` (Lahiri
ayanāṁśa), so the site needs no server for today's use. This document
defines the equivalent server contract for a future backend or an
offline/render-time pipeline.

## Endpoint

```
GET /api/panchang?date=YYYY-MM-DD&lat=12.9716&lng=77.5946&elev=920&timezoneOffset=330
```

### Query parameters

| Param            | Type   | Required | Notes                                                              |
|------------------|--------|----------|--------------------------------------------------------------------|
| `date`           | string | yes      | `YYYY-MM-DD` in the observer's local calendar day.                  |
| `lat`            | number | yes      | Latitude  (−90…90).                                                 |
| `lng`            | number | yes      | Longitude (−180…180).                                               |
| `elev`           | number | no       | Elevation in metres above sea level (default 0, recommended ≥ 25).  |
| `timezoneOffset` | number | no       | Local offset from UTC in **minutes** (India: `330`). If omitted, it is approximated from the longitude. |

### Response (200)

```json
{
  "date": "2026-09-06",
  "timezoneOffset": 330,
  "place": { "lat": 12.9716, "lng": 77.5946 },
  "vara": { "index": 0, "name": "Sunday" },
  "tithi": { "index": 24, "name": "Dashami", "start": "2026-09-06T06:08Z", "end": "2026-09-06T19:29Z" },
  "nakshatra": { "index": 5, "name": "Ardra", "start": "2026-09-06T06:08Z", "end": "2026-09-06T19:52Z" },
  "yoga": { "index": 15, "name": "Siddhi" },
  "karana": { "name": "Vanija" },
  "paksha": "Krishna",
  "masa": { "index": 5, "name": "Bhadrapada", "isAdhika": false },
  "samvat": { "vikram": 2083, "shaka": 1948, "samvatsara": "Parabhava" },
  "ayana": "Dakshinayana",
  "ritu": "Sharad",
  "sun": { "sunrise": "2026-09-06T06:08Z", "sunset": "2026-09-06T18:27Z",
           "moonrise": "2026-09-06T01:06Z", "moonset": "2026-09-06T14:33Z" },
  "muhurtas": {
    "rahuKalam": { "start": "2026-09-06T16:54Z", "end": "2026-09-06T18:27Z" },
    "yamagandaKalam": { "start": "2026-09-06T12:17Z", "end": "2026-09-06T13:50Z" },
    "gulikaKalam": { "start": "2026-09-06T15:22Z", "end": "2026-09-06T16:54Z" },
    "abhijitMuhurta": { "start": "2026-09-06T11:53Z", "end": "2026-09-06T12:42Z" },
    "brahmaMuhurta": { "start": "2026-09-06T04:35Z", "end": "2026-09-06T05:22Z" },
    "durmuhurta": [],
    "varjyam": [],
    "amritKalam": []
  },
  "choghadiya": { "day": [], "night": [] },
  "festivals": ["Sri Ganesha Chaturthi"]
}
```

Timestamps follow RFC 3339 (absolute UTC). Wall-clock formatting is the
client's job using `timezoneOffset`.

### Errors

| Status | Meaning                                        |
|--------|------------------------------------------------|
| `400`  | Missing/invalid `date`, `lat` or `lng`.         |
| `422`  | Astronomical engine could not compute the date. |
| `500`  | Unexpected failure.                             |

Error body: `{ "error": { "code": "BAD_DATE", "message": "…" } }`

## Sankalpam

- **Location phrases are a curated, hand-verified table** (city name → a
  traditional Telugu/Sanskrit place phrase). The server must never derive a
  villainous-grammar phrase directly from GPS coordinates.
- The server may generate the saṅkalpam sentence only when the city matches
  the verified table; otherwise it returns `sankalpam.placePhrase = null`,
  and the client falls back to the generic "ఈ ప్రదేశంలో" phrase.

## Notes

- Ayanāṁśa: Lahiri (Chitrapaksha), consistent across the site.
- The engine recomputes the calendar from astronomical positions, so a
  distant date does not require a static table; DST is handled by passing
  the correct `timezoneOffset` for that date (the browser page uses the
  IANA time-zone of the selected city).