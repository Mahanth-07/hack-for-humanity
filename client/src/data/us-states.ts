import { geoAlbersUsa } from "d3-geo";
import statesData from "./us-states-generated.json";

export interface StateData {
  id: string;
  name: string;
  abbr: string;
  path: string;
  labelX: number;
  labelY: number;
}

export const US_STATES: StateData[] = statesData as StateData[];

const projection = geoAlbersUsa().scale(1300).translate([487.5, 305]);

export function projectToSvg(
  lat: number,
  lng: number
): { x: number; y: number } | null {
  const projected = projection([lng, lat]);
  if (!projected) return null;
  return { x: projected[0], y: projected[1] };
}

export function getStateForCoordinates(lat: number, lng: number): string | null {
  const point = projection([lng, lat]);
  if (!point) return null;

  let closest: { id: string; dist: number } | null = null;
  for (const state of US_STATES) {
    const dx = point[0] - state.labelX;
    const dy = point[1] - state.labelY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (!closest || dist < closest.dist) {
      closest = { id: state.id, dist };
    }
  }
  return closest && closest.dist < 80 ? closest.id : null;
}
