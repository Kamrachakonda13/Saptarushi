export const ECLIPSES = [
  {
    date: '2026-02-17', kind: 'solar', type: 'Annular solar eclipse', visibility: { minLat: -90, maxLat: -15, minLng: -180, maxLng: 180 },
    phases: [
      ['Partial eclipse begins', '2026-02-17T09:56:00Z'], ['Annularity begins', '2026-02-17T11:52:00Z'],
      ['Maximum eclipse', '2026-02-17T12:13:00Z'], ['Annularity ends', '2026-02-17T12:34:00Z'], ['Partial eclipse ends', '2026-02-17T14:29:00Z']
    ]
  },
  {
    date: '2026-03-03', kind: 'lunar', type: 'Total lunar eclipse', visibility: 'night',
    phases: [
      ['Penumbral eclipse begins', '2026-03-03T08:44:00Z'], ['Partial eclipse begins', '2026-03-03T09:50:00Z'],
      ['Totality begins', '2026-03-03T11:04:00Z'], ['Maximum eclipse', '2026-03-03T11:33:00Z'],
      ['Totality ends', '2026-03-03T12:03:00Z'], ['Partial eclipse ends', '2026-03-03T13:17:00Z'], ['Penumbral eclipse ends', '2026-03-03T14:23:00Z']
    ]
  },
  {
    date: '2026-08-12', kind: 'solar', type: 'Total solar eclipse', visibility: { minLat: 20, maxLat: 90, minLng: -180, maxLng: 40 },
    phases: [
      ['Partial eclipse begins', '2026-08-12T15:34:00Z'], ['Totality begins', '2026-08-12T16:58:00Z'],
      ['Maximum eclipse', '2026-08-12T17:06:00Z'], ['Totality ends', '2026-08-12T17:13:00Z'], ['Partial eclipse ends', '2026-08-12T18:46:00Z']
    ]
  },
  {
    date: '2026-08-28', kind: 'lunar', type: 'Partial lunar eclipse', visibility: 'night',
    phases: [
      ['Penumbral eclipse begins', '2026-08-28T01:23:00Z'], ['Partial eclipse begins', '2026-08-28T02:33:00Z'],
      ['Maximum eclipse', '2026-08-28T04:12:00Z'], ['Partial eclipse ends', '2026-08-28T05:51:00Z'], ['Penumbral eclipse ends', '2026-08-28T07:01:00Z']
    ]
  }
];
