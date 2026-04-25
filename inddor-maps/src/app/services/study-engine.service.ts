import { Injectable } from '@angular/core';
import { IndoorMap, MapObject } from '../models/map.model';
import { BLEModel } from '../models/ble-model.model';

@Injectable({
  providedIn: 'root'
})
export class StudyEngineService {
  constructor() {}

  /**
   * Calculates the triangulation quality at a specific point (x, y).
   * Result is a score from 0 (no coverage) to 1 (perfect triangulation).
   */
  calculateQualityAtPoint(x: number, y: number, beacons: MapObject[], map: IndoorMap): number {
    // If point is outside walls, quality is 0
    if (!this.isPointInsideRoom(x, y, map)) return 0;

    const visibleBeacons = beacons.filter(b => {
      const dist = Math.sqrt(Math.pow(b.x - x, 2) + Math.pow(b.y - y, 2));
      return dist <= (b.metadata?.['maxRange'] || 20);
    });

    if (visibleBeacons.length < 3) return 0;

    // Angular distribution (GDOP-like)
    // We want beacons to be spread around the user
    const angles = visibleBeacons.map(b => Math.atan2(b.y - y, b.x - x));
    angles.sort((a, b) => a - b);
    
    let maxGap = 0;
    for (let i = 0; i < angles.length; i++) {
      const gap = (i === angles.length - 1) 
        ? (2 * Math.PI - angles[i] + angles[0])
        : (angles[i + 1] - angles[i]);
      if (gap > maxGap) maxGap = gap;
    }

    // A gap of 120 deg (2.09 rad) is ideal for 3 beacons.
    // We penalize gaps larger than 180 deg (PI) heavily.
    const gapScore = Math.pow(Math.max(0, 1 - (maxGap / (1.5 * Math.PI))), 2);
    
    // Distance score: are beacons at optimal distance?
    const dists = visibleBeacons.map(b => Math.sqrt(Math.pow(b.x - x, 2) + Math.pow(b.y - y, 2)));
    const avgDist = dists.reduce((a, b) => a + b, 0) / dists.length;
    const optimalDist = 3.0; // 3 meters is a good sweet spot for BLE
    
    // Use a bell curve for distance score to increase contrast
    const distScore = Math.exp(-Math.pow(avgDist - optimalDist, 2) / 8);

    // Final score with high contrast
    return (gapScore * 0.6) + (distScore * 0.4);
  }

  generateHeatmap(map: IndoorMap, beacons: MapObject[]): number[][] {
    const gridResolution = 0.25; // Higher resolution: 0.25 meters
    const rows = Math.ceil(map.dimensions.height / gridResolution);
    const cols = Math.ceil(map.dimensions.width / gridResolution);
    
    const heatmap: number[][] = [];

    for (let r = 0; r < rows; r++) {
      heatmap[r] = [];
      for (let c = 0; c < cols; c++) {
        const x = c * gridResolution;
        const y = r * gridResolution;
        heatmap[r][c] = this.calculateQualityAtPoint(x, y, beacons, map);
      }
    }
    return heatmap;
  }

  private isPointInsideRoom(x: number, y: number, map: IndoorMap): boolean {
    const walls = map.objects.filter(obj => obj.type === 'wall');
    if (walls.length < 3) return true; // Default to true if not enough walls to form a room

    // Ray casting algorithm
    let inside = false;
    const segments = walls.map(w => {
      const rad = (w.rotation * Math.PI) / 180;
      return {
        x1: w.x,
        y1: w.y,
        x2: w.x + w.width * Math.cos(rad),
        y2: w.y + w.width * Math.sin(rad)
      };
    });

    for (let i = 0, j = segments.length - 1; i < segments.length; j = i++) {
      const xi = segments[i].x1, yi = segments[i].y1;
      const xj = segments[j].x1, yj = segments[j].y1;
      
      const intersect = ((yi > y) !== (yj > y))
          && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }

    return inside;
  }

  private getPointsOnObjects(map: IndoorMap): {x: number, y: number}[] {
    const validObjects = map.objects.filter(obj => obj.type === 'wall' || obj.type === 'furniture');
    const points: {x: number, y: number}[] = [];

    validObjects.forEach(obj => {
      const rad = (obj.rotation * Math.PI) / 180;
      if (obj.type === 'wall') {
        // Points along the wall: start, middle, end
        points.push({ x: obj.x, y: obj.y });
        points.push({ 
          x: obj.x + (obj.width / 2) * Math.cos(rad), 
          y: obj.y + (obj.width / 2) * Math.sin(rad) 
        });
        points.push({ 
          x: obj.x + obj.width * Math.cos(rad), 
          y: obj.y + obj.width * Math.sin(rad) 
        });
      } else {
        // Center of furniture
        // Adjust for rotation and dimensions
        const centerX = obj.x + (obj.width / 2 * Math.cos(rad)) - (obj.height / 2 * Math.sin(rad));
        const centerY = obj.y + (obj.width / 2 * Math.sin(rad)) + (obj.height / 2 * Math.cos(rad));
        points.push({ x: centerX, y: centerY });
      }
    });

    return points;
  }

  proposePlacement(map: IndoorMap, model: BLEModel): MapObject[] {
    const candidates = this.getPointsOnObjects(map);
    
    // Filter points that are inside or on the boundary of the room
    const validCandidates = candidates.filter(p => this.isPointInsideRoom(p.x, p.y, map));
    
    // If ray-casting failed on boundaries, fall back to all points on objects
    const finalCandidates = validCandidates.length > 0 ? validCandidates : candidates;

    if (finalCandidates.length === 0) return [];

    // Pick up to 5 points, attempting to keep them distributed
    // (Simplification: take first, middle, last and two in between)
    const count = Math.min(5, finalCandidates.length);
    const selected: {x: number, y: number}[] = [];
    
    for (let i = 0; i < count; i++) {
      const index = Math.floor(i * (finalCandidates.length - 1) / (count - 1 || 1));
      selected.push(finalCandidates[index]);
    }

    return selected.map((p, i) => ({
      id: crypto.randomUUID(),
      type: 'beacon',
      name: `${model.brand} ${model.modelName} #${i + 1}`,
      x: p.x,
      y: p.y,
      width: 0.3,
      height: 0.3,
      heightZ: 2.2,
      rotation: 0,
      color: '#007bff',
      metadata: {
        modelId: model.id,
        optimalRange: model.optimalRange,
        maxRange: model.maxRange,
        txPower: model.defaultTxPower
      }
    }));
  }
}
