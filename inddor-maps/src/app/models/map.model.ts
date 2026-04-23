export interface IndoorMap {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  dimensions: {
    width: number;  // meters
    height: number; // meters
  };
  scale: number; // pixels per meter
  objects: MapObject[];
  metadata?: Record<string, any>;
}

export type MapObjectType = 'wall' | 'room' | 'furniture' | 'beacon' | 'path' | 'poi';

export interface MapObject {
  id: string;
  type: MapObjectType;
  name: string;
  // Coords relative to map top-left (0,0) in meters
  x: number;
  y: number;
  width: number;
  height: number;
  heightZ: number; // Height from floor in meters
  rotation: number; // degrees
  color?: string;
  opacity?: number;
  locked?: boolean;
  metadata?: Record<string, any>;
  // For walls/lines
  points?: { x: number; y: number }[];
}

export interface FurnitureTemplate {
  id: string;
  name: string;
  category: string;
  icon: string;
  defaultDimensions: { width: number; height: number };
}
