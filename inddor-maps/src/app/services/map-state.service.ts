import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { IndoorMap, MapObject } from '../models/map.model';

@Injectable({
  providedIn: 'root'
})
export class MapStateService {
  private currentMapSubject = new BehaviorSubject<IndoorMap | null>(null);
  public currentMap$ = this.currentMapSubject.asObservable();

  private selectedObjectSubject = new BehaviorSubject<MapObject | null>(null);
  public selectedObject$ = this.selectedObjectSubject.asObservable();

  private drawingModeSubject = new BehaviorSubject<{ mode: string, heightZ: number } | null>(null);
  public drawingMode$ = this.drawingModeSubject.asObservable();

  private heatmapSubject = new BehaviorSubject<number[][] | null>(null);
  public heatmapData$ = this.heatmapSubject.asObservable();

  constructor() {
    // Try to load from localStorage first
    const savedMap = localStorage.getItem('last_indoor_map');
    if (savedMap) {
      this.loadFromJson(savedMap);
    } else {
      // Initial dummy map for development
      this.createNewMap('Plano Nuevo', 20, 15);
    }

    // Subscribe to save changes automatically
    this.currentMap$.subscribe(map => {
      if (map) {
        localStorage.setItem('last_indoor_map', JSON.stringify(map));
      }
    });
  }

  createNewMap(name: string, width: number, height: number) {
    const newMap: IndoorMap = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      dimensions: { width, height },
      scale: 50, // 50 pixels = 1 meter default
      objects: []
    };
    this.currentMapSubject.next(newMap);
  }

  updateMap(partialMap: Partial<IndoorMap>) {
    const current = this.currentMapSubject.value;
    if (current) {
      this.currentMapSubject.next({ ...current, ...partialMap, updatedAt: Date.now() });
    }
  }

  addObject(obj: MapObject) {
    const current = this.currentMapSubject.value;
    if (current) {
      this.currentMapSubject.next({
        ...current,
        objects: [...current.objects, obj],
        updatedAt: Date.now()
      });
    }
  }

  updateObject(objectId: string, updates: Partial<MapObject>) {
    const current = this.currentMapSubject.value;
    if (current) {
      const objects = current.objects.map(obj => 
        obj.id === objectId ? { ...obj, ...updates } : obj
      );
      this.currentMapSubject.next({ ...current, objects, updatedAt: Date.now() });
    }
  }

  removeObject(objectId: string) {
    const current = this.currentMapSubject.value;
    if (current) {
      const objects = current.objects.filter(obj => obj.id !== objectId);
      this.currentMapSubject.next({ ...current, objects, updatedAt: Date.now() });
    }
  }

  selectObject(obj: MapObject | null) {
    this.selectedObjectSubject.next(obj);
  }

  setDrawingMode(mode: string | null, heightZ: number = 0) {
    this.drawingModeSubject.next(mode ? { mode, heightZ } : null);
  }

  setHeatmapData(data: number[][] | null) {
    // Force refresh by creating a new reference even if data is the same
    this.heatmapSubject.next(data ? [...data.map(row => [...row])] : null);
  }

  saveCurrentMap() {
    const current = this.currentMapSubject.value;
    if (current) {
      const saved = this.getSavedMaps();
      const index = saved.findIndex((m: any) => m.id === current.id);
      if (index >= 0) {
        saved[index] = current;
      } else {
        saved.push(current);
      }
      localStorage.setItem('saved_indoor_maps', JSON.stringify(saved));
    }
  }

  getSavedMaps(): IndoorMap[] {
    return JSON.parse(localStorage.getItem('saved_indoor_maps') || '[]');
  }

  deleteMap(id: string) {
    const saved = this.getSavedMaps().filter(m => m.id !== id);
    localStorage.setItem('saved_indoor_maps', JSON.stringify(saved));
  }

  exportToJson(): string {
    return JSON.stringify(this.currentMapSubject.value, null, 2);
  }

  loadFromJson(json: string) {
    try {
      const map = JSON.parse(json);
      this.currentMapSubject.next(map);
    } catch (e) {
      console.error('Error loading map JSON', e);
    }
  }
}
