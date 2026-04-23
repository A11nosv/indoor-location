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
    const visibleBeacons = beacons.filter(b => {
      const dist = Math.sqrt(Math.pow(b.x - x, 2) + Math.pow(b.y - y, 2));
      // For now, simple range check. 
      // In future, we can add wall-clipping logic.
      return dist <= (b.metadata?.['maxRange'] || 20);
    });

    if (visibleBeacons.length < 3) return 0; // Need at least 3 for trilateration

    // Simple GDOP approximation: 
    // High quality if beacons are well distributed around the point
    let quality = 0;
    
    // Check angular distribution
    const angles = visibleBeacons.map(b => Math.atan2(b.y - y, b.x - x));
    angles.sort((a, b) => a - b);
    
    let maxGap = 0;
    for (let i = 0; i < angles.length; i++) {
      const gap = (i === angles.length - 1) 
        ? (2 * Math.PI - angles[i] + angles[0])
        : (angles[i + 1] - angles[i]);
      if (gap > maxGap) maxGap = gap;
    }

    // A gap of 360 (2PI) means all beacons are in one line.
    // A gap of 120 (for 3 beacons) is ideal.
    const gapScore = Math.max(0, 1 - (maxGap / (2 * Math.PI)));
    
    // Distance score: are beacons at optimal distance?
    const dists = visibleBeacons.map(b => Math.sqrt(Math.pow(b.x - x, 2) + Math.pow(b.y - y, 2)));
    const avgDist = dists.reduce((a, b) => a + b, 0) / dists.length;
    const optimalDist = visibleBeacons[0].metadata?.['optimalRange'] || 2.5;
    const distScore = Math.max(0, 1 - Math.abs(avgDist - optimalDist) / optimalDist);

    return (gapScore * 0.7) + (distScore * 0.3);
  }

  generateHeatmap(map: IndoorMap, beacons: MapObject[]): number[][] {
    const gridResolution = 0.5; // 0.5 meters
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

  proposePlacement(map: IndoorMap, model: BLEModel): MapObject[] {
    // Basic proposal logic: Place beacons in corners and center to maximize angular spread
    const margin = 2; // meters from walls
    const { width, height } = map.dimensions;
    
    const positions = [
      { x: margin, y: margin },
      { x: width - margin, y: margin },
      { x: margin, y: height - margin },
      { x: width - margin, y: height - margin },
      { x: width / 2, y: height / 2 }
    ];

    return positions.map((p, i) => ({
      id: crypto.randomUUID(),
      type: 'beacon',
      name: `${model.brand} ${model.modelName} #${i + 1}`,
      x: p.x,
      y: p.y,
      width: 0.3,
      height: 0.3,
      heightZ: 2.2, // Default ceiling height
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
