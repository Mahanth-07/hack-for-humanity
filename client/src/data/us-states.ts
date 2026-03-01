export interface StateData {
  id: string;
  name: string;
  abbr: string;
  path: string;
  labelX: number;
  labelY: number;
}

export const US_BOUNDS = {
  minLat: 24.396308,
  maxLat: 49.384358,
  minLng: -124.848974,
  maxLng: -66.885444,
};

export function projectToSvg(
  lat: number,
  lng: number,
  width: number = 960,
  height: number = 600
): { x: number; y: number } {
  const x = ((lng - US_BOUNDS.minLng) / (US_BOUNDS.maxLng - US_BOUNDS.minLng)) * width;
  const y = ((US_BOUNDS.maxLat - lat) / (US_BOUNDS.maxLat - US_BOUNDS.minLat)) * height;
  return { x, y };
}

export const US_STATES: StateData[] = [
  { id: "AL", name: "Alabama", abbr: "AL", labelX: 700, labelY: 410, path: "M670,370 L700,370 710,380 720,390 720,430 715,445 705,450 690,440 680,430 675,400 670,380Z" },
  { id: "AK", name: "Alaska", abbr: "AK", labelX: 150, labelY: 530, path: "M80,510 L120,500 160,510 180,520 170,540 140,550 100,545 70,530Z" },
  { id: "AZ", name: "Arizona", abbr: "AZ", labelX: 195, labelY: 390, path: "M150,340 L220,340 230,350 235,380 230,420 220,440 200,445 170,430 155,400 150,370Z" },
  { id: "AR", name: "Arkansas", abbr: "AR", labelX: 600, labelY: 390, path: "M580,370 L630,370 640,380 640,410 630,420 610,420 590,415 580,400Z" },
  { id: "CA", name: "California", abbr: "CA", labelX: 100, labelY: 330, path: "M60,200 L100,190 120,220 130,260 125,300 120,340 110,370 95,390 70,380 55,350 50,310 45,270 50,230Z" },
  { id: "CO", name: "Colorado", abbr: "CO", labelX: 295, labelY: 300, path: "M250,270 L340,270 340,330 250,330Z" },
  { id: "CT", name: "Connecticut", abbr: "CT", labelX: 870, labelY: 195, path: "M855,185 L880,180 890,190 885,200 870,205 855,200Z" },
  { id: "DE", name: "Delaware", abbr: "DE", labelX: 845, labelY: 265, path: "M835,250 L850,245 855,260 850,275 840,275 835,265Z" },
  { id: "FL", name: "Florida", abbr: "FL", labelX: 770, labelY: 475, path: "M700,440 L770,430 790,440 800,460 790,490 770,510 750,520 740,510 735,490 730,475 720,460 710,450Z" },
  { id: "GA", name: "Georgia", abbr: "GA", labelX: 735, labelY: 400, path: "M710,360 L750,360 760,380 760,420 750,440 730,445 710,435 700,410 705,380Z" },
  { id: "HI", name: "Hawaii", abbr: "HI", labelX: 280, labelY: 540, path: "M250,525 L265,520 275,530 285,535 280,545 265,550 255,540Z" },
  { id: "ID", name: "Idaho", abbr: "ID", labelX: 185, labelY: 180, path: "M170,100 L210,100 220,130 215,170 205,210 190,230 170,220 160,190 155,150Z" },
  { id: "IL", name: "Illinois", abbr: "IL", labelX: 620, labelY: 290, path: "M605,230 L640,230 645,260 650,290 645,320 635,350 620,360 605,340 600,310 600,270Z" },
  { id: "IN", name: "Indiana", abbr: "IN", labelX: 655, labelY: 280, path: "M640,230 L670,230 675,260 675,300 670,330 660,350 645,340 640,310 640,260Z" },
  { id: "IA", name: "Iowa", abbr: "IA", labelX: 540, labelY: 240, path: "M510,220 L580,220 590,240 585,265 570,275 540,275 520,265 510,245Z" },
  { id: "KS", name: "Kansas", abbr: "KS", labelX: 470, labelY: 320, path: "M420,300 L540,300 540,350 420,350Z" },
  { id: "KY", name: "Kentucky", abbr: "KY", labelX: 690, labelY: 325, path: "M640,310 L730,305 740,315 735,335 720,345 690,350 660,350 645,340Z" },
  { id: "LA", name: "Louisiana", abbr: "LA", labelX: 600, labelY: 450, path: "M580,420 L630,420 640,440 635,460 620,470 600,475 585,465 575,445Z" },
  { id: "ME", name: "Maine", abbr: "ME", labelX: 905, labelY: 120, path: "M885,80 L910,90 920,120 915,150 900,155 885,140 880,110Z" },
  { id: "MD", name: "Maryland", abbr: "MD", labelX: 825, labelY: 270, path: "M790,260 L840,250 850,260 845,275 830,280 810,280 795,275Z" },
  { id: "MA", name: "Massachusetts", abbr: "MA", labelX: 885, labelY: 180, path: "M860,170 L900,165 910,175 905,185 885,190 865,185Z" },
  { id: "MI", name: "Michigan", abbr: "MI", labelX: 650, labelY: 195, path: "M610,150 L640,140 665,150 680,170 685,200 675,220 650,225 630,215 615,200 610,175Z" },
  { id: "MN", name: "Minnesota", abbr: "MN", labelX: 520, labelY: 155, path: "M500,100 L560,100 570,130 565,170 555,200 530,210 510,205 500,180 495,140Z" },
  { id: "MS", name: "Mississippi", abbr: "MS", labelX: 640, labelY: 420, path: "M630,370 L660,370 665,400 660,430 650,450 635,455 625,440 625,410Z" },
  { id: "MO", name: "Missouri", abbr: "MO", labelX: 570, labelY: 320, path: "M540,280 L600,280 615,300 620,330 615,360 595,370 570,370 545,360 540,330Z" },
  { id: "MT", name: "Montana", abbr: "MT", labelX: 280, labelY: 120, path: "M200,80 L370,80 375,110 370,150 340,155 300,150 250,145 210,140 200,110Z" },
  { id: "NE", name: "Nebraska", abbr: "NE", labelX: 430, labelY: 260, path: "M380,240 L510,240 515,260 510,290 500,300 420,300 390,290 380,270Z" },
  { id: "NV", name: "Nevada", abbr: "NV", labelX: 135, labelY: 280, path: "M110,200 L160,200 170,240 165,290 155,330 140,340 115,330 105,290 100,250Z" },
  { id: "NH", name: "New Hampshire", abbr: "NH", labelX: 885, labelY: 150, path: "M875,120 L890,115 895,140 892,160 880,165 872,150Z" },
  { id: "NJ", name: "New Jersey", abbr: "NJ", labelX: 855, labelY: 240, path: "M840,215 L855,210 862,225 860,250 850,265 840,260 838,240Z" },
  { id: "NM", name: "New Mexico", abbr: "NM", labelX: 260, labelY: 390, path: "M220,340 L300,340 310,360 310,420 300,445 270,450 240,440 225,420 220,380Z" },
  { id: "NY", name: "New York", abbr: "NY", labelX: 840, labelY: 185, path: "M790,155 L855,150 870,165 875,185 860,200 840,210 815,215 800,205 790,185Z" },
  { id: "NC", name: "North Carolina", abbr: "NC", labelX: 775, labelY: 345, path: "M710,330 L800,320 820,335 810,350 780,360 750,360 720,355 710,345Z" },
  { id: "ND", name: "North Dakota", abbr: "ND", labelX: 440, labelY: 130, path: "M400,100 L500,100 505,130 500,165 480,170 430,170 405,165 400,135Z" },
  { id: "OH", name: "Ohio", abbr: "OH", labelX: 710, labelY: 260, path: "M680,225 L720,220 740,240 745,270 740,300 725,305 700,300 685,290 680,260Z" },
  { id: "OK", name: "Oklahoma", abbr: "OK", labelX: 470, labelY: 370, path: "M400,350 L540,350 550,365 545,385 530,395 500,400 460,395 420,390 400,380Z" },
  { id: "OR", name: "Oregon", abbr: "OR", labelX: 115, labelY: 145, path: "M50,100 L165,100 170,130 165,170 140,185 100,190 60,185 45,160 40,130Z" },
  { id: "PA", name: "Pennsylvania", abbr: "PA", labelX: 805, labelY: 230, path: "M760,210 L840,205 845,220 840,245 820,250 790,255 770,245 760,230Z" },
  { id: "RI", name: "Rhode Island", abbr: "RI", labelX: 890, labelY: 195, path: "M885,190 L895,188 898,198 892,205 883,202Z" },
  { id: "SC", name: "South Carolina", abbr: "SC", labelX: 755, labelY: 370, path: "M720,350 L770,345 785,360 780,380 760,390 740,385 725,375Z" },
  { id: "SD", name: "South Dakota", abbr: "SD", labelX: 440, labelY: 195, path: "M400,170 L510,170 515,200 510,230 490,240 430,240 405,235 400,205Z" },
  { id: "TN", name: "Tennessee", abbr: "TN", labelX: 680, labelY: 350, path: "M630,340 L730,335 740,345 735,360 720,365 680,370 640,370 630,360Z" },
  { id: "TX", name: "Texas", abbr: "TX", labelX: 440, labelY: 440, path: "M350,390 L420,390 470,395 520,400 540,410 545,440 535,470 520,500 490,520 460,530 430,525 400,510 380,490 365,460 355,430Z" },
  { id: "UT", name: "Utah", abbr: "UT", labelX: 215, labelY: 280, path: "M180,220 L250,220 255,260 250,320 240,340 210,340 190,330 175,300 175,260Z" },
  { id: "VT", name: "Vermont", abbr: "VT", labelX: 870, labelY: 145, path: "M860,120 L875,118 878,145 872,165 860,168 855,145Z" },
  { id: "VA", name: "Virginia", abbr: "VA", labelX: 790, labelY: 300, path: "M730,290 L800,280 820,295 825,315 810,330 780,335 750,335 735,320Z" },
  { id: "WA", name: "Washington", abbr: "WA", labelX: 130, labelY: 85, path: "M60,50 L170,50 175,70 170,100 140,105 100,100 60,95 50,75Z" },
  { id: "WV", name: "West Virginia", abbr: "WV", labelX: 755, labelY: 285, path: "M730,260 L760,255 770,270 765,295 755,310 740,315 730,300 728,275Z" },
  { id: "WI", name: "Wisconsin", abbr: "WI", labelX: 580, labelY: 170, path: "M560,120 L610,120 625,145 625,180 615,210 600,225 575,220 560,200 555,170Z" },
  { id: "WY", name: "Wyoming", abbr: "WY", labelX: 290, labelY: 195, path: "M230,155 L350,155 355,190 350,230 340,250 250,250 235,240 225,210 225,180Z" },
];

export function getStateForCoordinates(lat: number, lng: number): string | null {
  const stateMap: Record<string, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
    AL: { minLat: 30.2, maxLat: 35.0, minLng: -88.5, maxLng: -84.9 },
    AK: { minLat: 51.2, maxLat: 71.4, minLng: -179.1, maxLng: -129.9 },
    AZ: { minLat: 31.3, maxLat: 37.0, minLng: -114.8, maxLng: -109.0 },
    AR: { minLat: 33.0, maxLat: 36.5, minLng: -94.6, maxLng: -89.6 },
    CA: { minLat: 32.5, maxLat: 42.0, minLng: -124.4, maxLng: -114.1 },
    CO: { minLat: 37.0, maxLat: 41.0, minLng: -109.1, maxLng: -102.0 },
    CT: { minLat: 40.9, maxLat: 42.1, minLng: -73.7, maxLng: -71.8 },
    DE: { minLat: 38.4, maxLat: 39.8, minLng: -75.8, maxLng: -75.0 },
    FL: { minLat: 24.5, maxLat: 31.0, minLng: -87.6, maxLng: -80.0 },
    GA: { minLat: 30.4, maxLat: 35.0, minLng: -85.6, maxLng: -80.8 },
    HI: { minLat: 18.9, maxLat: 22.2, minLng: -160.2, maxLng: -154.8 },
    ID: { minLat: 42.0, maxLat: 49.0, minLng: -117.2, maxLng: -111.0 },
    IL: { minLat: 36.9, maxLat: 42.5, minLng: -91.5, maxLng: -87.5 },
    IN: { minLat: 37.8, maxLat: 41.8, minLng: -88.1, maxLng: -84.8 },
    IA: { minLat: 40.4, maxLat: 43.5, minLng: -96.6, maxLng: -90.1 },
    KS: { minLat: 37.0, maxLat: 40.0, minLng: -102.1, maxLng: -94.6 },
    KY: { minLat: 36.5, maxLat: 39.1, minLng: -89.6, maxLng: -81.9 },
    LA: { minLat: 29.0, maxLat: 33.0, minLng: -94.0, maxLng: -89.0 },
    ME: { minLat: 43.1, maxLat: 47.5, minLng: -71.1, maxLng: -66.9 },
    MD: { minLat: 37.9, maxLat: 39.7, minLng: -79.5, maxLng: -75.0 },
    MA: { minLat: 41.2, maxLat: 42.9, minLng: -73.5, maxLng: -69.9 },
    MI: { minLat: 41.7, maxLat: 48.3, minLng: -90.4, maxLng: -82.4 },
    MN: { minLat: 43.5, maxLat: 49.4, minLng: -97.2, maxLng: -89.5 },
    MS: { minLat: 30.2, maxLat: 35.0, minLng: -91.7, maxLng: -88.1 },
    MO: { minLat: 36.0, maxLat: 40.6, minLng: -95.8, maxLng: -89.1 },
    MT: { minLat: 44.4, maxLat: 49.0, minLng: -116.0, maxLng: -104.0 },
    NE: { minLat: 40.0, maxLat: 43.0, minLng: -104.1, maxLng: -95.3 },
    NV: { minLat: 35.0, maxLat: 42.0, minLng: -120.0, maxLng: -114.0 },
    NH: { minLat: 42.7, maxLat: 45.3, minLng: -72.6, maxLng: -70.7 },
    NJ: { minLat: 38.9, maxLat: 41.4, minLng: -75.6, maxLng: -73.9 },
    NM: { minLat: 31.3, maxLat: 37.0, minLng: -109.1, maxLng: -103.0 },
    NY: { minLat: 40.5, maxLat: 45.0, minLng: -79.8, maxLng: -71.9 },
    NC: { minLat: 33.8, maxLat: 36.6, minLng: -84.3, maxLng: -75.5 },
    ND: { minLat: 45.9, maxLat: 49.0, minLng: -104.0, maxLng: -96.6 },
    OH: { minLat: 38.4, maxLat: 42.0, minLng: -84.8, maxLng: -80.5 },
    OK: { minLat: 33.6, maxLat: 37.0, minLng: -103.0, maxLng: -94.4 },
    OR: { minLat: 42.0, maxLat: 46.3, minLng: -124.6, maxLng: -116.5 },
    PA: { minLat: 39.7, maxLat: 42.3, minLng: -80.5, maxLng: -74.7 },
    RI: { minLat: 41.1, maxLat: 42.0, minLng: -71.9, maxLng: -71.1 },
    SC: { minLat: 32.0, maxLat: 35.2, minLng: -83.4, maxLng: -78.5 },
    SD: { minLat: 42.5, maxLat: 45.9, minLng: -104.1, maxLng: -96.4 },
    TN: { minLat: 35.0, maxLat: 36.7, minLng: -90.3, maxLng: -81.6 },
    TX: { minLat: 25.8, maxLat: 36.5, minLng: -106.6, maxLng: -93.5 },
    UT: { minLat: 37.0, maxLat: 42.0, minLng: -114.1, maxLng: -109.0 },
    VT: { minLat: 42.7, maxLat: 45.0, minLng: -73.4, maxLng: -71.5 },
    VA: { minLat: 36.5, maxLat: 39.5, minLng: -83.7, maxLng: -75.2 },
    WA: { minLat: 45.5, maxLat: 49.0, minLng: -124.8, maxLng: -116.9 },
    WV: { minLat: 37.2, maxLat: 40.6, minLng: -82.6, maxLng: -77.7 },
    WI: { minLat: 42.5, maxLat: 47.1, minLng: -92.9, maxLng: -86.8 },
    WY: { minLat: 41.0, maxLat: 45.0, minLng: -111.1, maxLng: -104.1 },
    DC: { minLat: 38.8, maxLat: 39.0, minLng: -77.1, maxLng: -76.9 },
  };

  for (const [abbr, bounds] of Object.entries(stateMap)) {
    if (lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng) {
      return abbr;
    }
  }
  return null;
}
