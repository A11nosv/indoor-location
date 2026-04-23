import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import DxfParser from 'dxf-parser';
import { IndoorMap, MapObject } from '../models/map.model';

@Injectable({
  providedIn: 'root'
})
export class ImportExportService {
  constructor() {}

  async parseDxf(fileContent: string): Promise<Partial<IndoorMap>> {
    const parser = new DxfParser();
    try {
      const dxf = parser.parseSync(fileContent);
      console.log('DXF Parsed:', dxf);
      
      const objects: MapObject[] = [];
      
      // Basic conversion of entities to our model
      if (dxf.entities) {
        dxf.entities.forEach((entity: any) => {
          if (entity.type === 'LINE') {
            objects.push({
              id: crypto.randomUUID(),
              type: 'wall',
              name: 'Muro CAD',
              x: entity.vertices[0].x,
              y: entity.vertices[0].y,
              width: Math.sqrt(Math.pow(entity.vertices[1].x - entity.vertices[0].x, 2) + Math.pow(entity.vertices[1].y - entity.vertices[0].y, 2)),
              height: 0.1,
              rotation: Math.atan2(entity.vertices[1].y - entity.vertices[0].y, entity.vertices[1].x - entity.vertices[0].x) * (180 / Math.PI),
              color: '#555555'
            });
          }
        });
      }

      return { objects };
    } catch (err) {
      console.error('Error parsing DXF', err);
      throw err;
    }
  }

  async parseGeoJson(data: any): Promise<Partial<IndoorMap>> {
    // Basic conversion from GeoJSON features to MapObjects
    const objects: MapObject[] = [];
    if (data.features) {
      data.features.forEach((feature: any) => {
        // Logic for GeoJSON conversion
      });
    }
    return { objects };
  }
}
