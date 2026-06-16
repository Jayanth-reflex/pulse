import * as THREE from "three";
import { mesh } from "topojson-client";
import type { Topology } from "topojson-specification";

/** Map (lat, lon) in degrees onto a sphere of the given radius. */
export function latLngToVector3(
  lat: number,
  lon: number,
  radius: number,
): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

/**
 * Build a single LineSegments position buffer for every country boundary,
 * projected onto the sphere. Long edges are subdivided so they hug the curve.
 */
export function buildBorderPositions(
  topology: Topology,
  radius: number,
): Float32Array {
  const ml = mesh(topology, topology.objects.countries);
  const positions: number[] = [];

  for (const line of ml.coordinates) {
    for (let i = 0; i < line.length - 1; i++) {
      const [lon1, lat1] = line[i];
      const [lon2, lat2] = line[i + 1];
      const a = latLngToVector3(lat1, lon1, radius);
      const b = latLngToVector3(lat2, lon2, radius);
      // Subdivide so the chord follows the sphere rather than cutting through.
      const steps = Math.max(1, Math.round(a.distanceTo(b) / 0.04));
      let prev = a;
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const lat = lat1 + (lat2 - lat1) * t;
        const lon = lon1 + (lon2 - lon1) * t;
        const cur = latLngToVector3(lat, lon, radius);
        positions.push(prev.x, prev.y, prev.z, cur.x, cur.y, cur.z);
        prev = cur;
      }
    }
  }
  return new Float32Array(positions);
}
