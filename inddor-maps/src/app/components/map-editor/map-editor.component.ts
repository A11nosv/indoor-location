import { Component, ElementRef, OnInit, OnDestroy, ViewChild, AfterViewInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as fabric from 'fabric';
import { MapStateService } from '../../services/map-state.service';
import { IndoorMap, MapObject } from '../../models/map.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-map-editor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-editor.component.html',
  styleUrls: ['./map-editor.component.scss']
})
export class MapEditorComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('container') container!: ElementRef;
  @Input() readonly: boolean = false;
  
  private canvas!: fabric.Canvas;
  private subscriptions: Subscription = new Subscription();
  private isInternalUpdate = false;
  
  // Drawing state
  private activePolygon: fabric.Polyline | null = null;
  private polygonPoints: fabric.Point[] = [];
  private drawingMode: { mode: string, heightZ: number } | null = null;
  private dragStartPositions: Map<string, { left: number, top: number }> = new Map();

  constructor(private mapState: MapStateService) {}

  ngOnInit() {}

  async ngAfterViewInit() {
    this.initCanvas();
    this.setupSubscriptions();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    if (this.canvas) {
      this.canvas.dispose();
    }
  }

  private async initCanvas() {
    this.canvas = new fabric.Canvas('mapCanvas', {
      backgroundColor: '#ffffff',
      selection: !this.readonly,
      preserveObjectStacking: true
    });

    this.updateCanvasSize();

    // Fabric.js Events
    if (!this.readonly) {
      this.canvas.on('mouse:down', (options) => {
        this.handleMouseDown(options);
        const target = options.target as any;
        if (target && target.data?.type === 'wall') {
          this.dragStartPositions.clear();
          this.canvas.getObjects().filter(obj => (obj as any).data?.type === 'wall').forEach(wall => {
            this.dragStartPositions.set((wall as any).data.id, { left: wall.left!, top: wall.top! });
          });
        }
      });
      this.canvas.on('mouse:move', (options) => this.handleMouseMove(options));
      this.canvas.on('mouse:dblclick', () => this.finishPolygon());

      this.canvas.on('object:moving', (options) => {
        const target = options.target as any;
        const map = (this.mapState as any).currentMapSubject?.value;
        if (!map) return;
        const grid = map.scale * 0.1;

        if (target && target.data?.type === 'wall' && this.dragStartPositions.has(target.data.id)) {
          const startPos = this.dragStartPositions.get(target.data.id)!;
          const dx = target.left! - startPos.left;
          const dy = target.top! - startPos.top;

          this.canvas.getObjects().filter(obj => (obj as any).data?.type === 'wall' && obj !== target).forEach(wall => {
            wall.set({
              left: this.dragStartPositions.get((wall as any).data.id)!.left + dx,
              top: this.dragStartPositions.get((wall as any).data.id)!.top + dy
            });
            wall.setCoords();
          });
        } else if (target) {
          target.set({
            left: Math.round(target.left! / grid) * grid,
            top: Math.round(target.top! / grid) * grid
          });
        }
      });

      this.canvas.on('object:scaling', (options) => {
        const map = (this.mapState as any).currentMapSubject?.value;
        if (!map) return;

        const grid = map.scale * 0.1;
        const target = options.target!;
        
        target.set({
          width: Math.round((target.width! * target.scaleX!) / grid) * grid / target.scaleX!,
          height: Math.round((target.height! * target.scaleY!) / grid) * grid / target.scaleY!
        });
      });

      this.canvas.on('object:modified', (e) => this.handleObjectChange(e));
      this.canvas.on('selection:created', (e) => this.handleSelection(e));
      this.canvas.on('selection:updated', (e) => this.handleSelection(e));
      this.canvas.on('selection:cleared', () => this.mapState.selectObject(null));

      window.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          const activeObject = this.canvas.getActiveObject();
          if (activeObject && (activeObject as any).data) {
            this.mapState.removeObject((activeObject as any).data.id);
            this.canvas.remove(activeObject);
            this.canvas.discardActiveObject();
            this.canvas.renderAll();
          }
        }
      });
    }

    window.addEventListener('resize', () => this.updateCanvasSize());
  }

  private setupSubscriptions() {
    this.subscriptions.add(
      this.mapState.currentMap$.subscribe(map => {
        if (map && !this.isInternalUpdate) {
          this.renderMap(map);
        }
      })
    );

    this.subscriptions.add(
      this.mapState.drawingMode$.subscribe(mode => {
        this.drawingMode = mode;
        if (this.canvas) {
          this.canvas.selection = !mode;
          this.canvas.defaultCursor = mode ? 'crosshair' : 'default';
        }
      })
    );

    this.subscriptions.add(
      this.mapState.heatmapData$.subscribe(data => {
        this.renderHeatmap(data);
      })
    );

    this.subscriptions.add(
      this.mapState.selectedObject$.subscribe(selected => {
        if (!this.canvas) return;
        if (selected) {
          const fabricObj = this.canvas.getObjects().find(obj => (obj as any).data?.id === selected.id);
          if (fabricObj && this.canvas.getActiveObject() !== fabricObj) {
            this.canvas.setActiveObject(fabricObj);
            this.canvas.renderAll();
          }
        } else if (this.canvas.getActiveObject()) {
          this.canvas.discardActiveObject();
          this.canvas.renderAll();
        }
      })
    );
  }

  private renderHeatmap(data: number[][] | null) {
    // Clear old heatmap thoroughly
    const heatmapObjects = this.canvas.getObjects().filter(obj => (obj as any).isHeatmap);
    this.canvas.remove(...heatmapObjects);

    if (!data) {
      this.canvas.renderAll();
      return;
    }

    const map = (this.mapState as any).currentMapSubject.value;
    const res = 0.25; // Higher resolution: 0.25 meters
    const scale = map.scale;

    const rects = [];
    for (let r = 0; r < data.length; r++) {
      for (let c = 0; c < data[r].length; c++) {
        const quality = data[r][c];
        if (quality <= 0.05) continue; // Skip very low quality for performance and contrast

        const color = this.getHeatmapColor(quality);
        rects.push(new fabric.Rect({
          left: c * res * scale,
          top: r * res * scale,
          width: res * scale,
          height: res * scale,
          fill: color,
          opacity: 0.5, // Slightly higher opacity for better visibility
          selectable: false,
          evented: false,
          // @ts-ignore
          isHeatmap: true
        }));
      }
    }

    this.canvas.add(...rects);
    // Ensure beacons are always on top
    this.canvas.getObjects()
      .filter(o => (o as any).data?.type === 'beacon')
      .forEach(b => this.canvas.bringObjectToFront(b));
    
    this.canvas.renderAll();
  }

  private getHeatmapColor(quality: number): string {
    // 0 = Red, 1 = Green
    const r = Math.floor(255 * (1 - quality));
    const g = Math.floor(255 * quality);
    return `rgb(${r},${g},0)`;
  }

  private handleMouseDown(options: fabric.TPointerEventInfo) {
    if (!this.drawingMode || this.drawingMode.mode !== 'polygon') return;

    const pointer = this.canvas.getScenePoint(options.e);
    const snapPoint = this.snapToGrid(pointer.x, pointer.y);
    const point = new fabric.Point(snapPoint.x, snapPoint.y);

    if (!this.activePolygon) {
      this.polygonPoints = [point, point];
      this.activePolygon = new fabric.Polyline(this.polygonPoints, {
        stroke: '#8b4513',
        strokeWidth: 2,
        fill: 'rgba(139, 69, 19, 0.3)',
        selectable: false,
        evented: false
      });
      this.canvas.add(this.activePolygon);
    } else {
      this.polygonPoints.push(point);
      this.activePolygon.set({ points: this.polygonPoints });
    }
    this.canvas.renderAll();
  }

  private handleMouseMove(options: fabric.TPointerEventInfo) {
    if (!this.activePolygon || !this.drawingMode) return;

    const pointer = this.canvas.getScenePoint(options.e);
    const snapPoint = this.snapToGrid(pointer.x, pointer.y);
    
    this.polygonPoints[this.polygonPoints.length - 1] = new fabric.Point(snapPoint.x, snapPoint.y);
    this.activePolygon.set({ points: this.polygonPoints });
    this.canvas.renderAll();
  }

  private snapToGrid(x: number, y: number): { x: number, y: number } {
    const map = (this.mapState as any).currentMapSubject?.value;
    if (!map) return { x, y };
    const grid = map.scale * 0.1;
    return {
      x: Math.round(x / grid) * grid,
      y: Math.round(y / grid) * grid
    };
  }

  private finishPolygon() {
    if (!this.activePolygon || !this.drawingMode) return;

    this.polygonPoints.pop();
    
    if (this.polygonPoints.length > 2) {
      const map = (this.mapState as any).currentMapSubject?.value;
      const scale = map.scale;

      const minX = Math.min(...this.polygonPoints.map(p => p.x));
      const minY = Math.min(...this.polygonPoints.map(p => p.y));
      const maxX = Math.max(...this.polygonPoints.map(p => p.x));
      const maxY = Math.max(...this.polygonPoints.map(p => p.y));

      const newObj: MapObject = {
        id: crypto.randomUUID(),
        type: 'furniture',
        name: 'Mobiliario Poligonal',
        x: minX / scale,
        y: minY / scale,
        width: (maxX - minX) / scale,
        height: (maxY - minY) / scale,
        heightZ: this.drawingMode.heightZ,
        rotation: 0,
        color: '#8b4513',
        points: this.polygonPoints.map(p => ({ x: (p.x - minX) / scale, y: (p.y - minY) / scale }))
      };

      this.mapState.addObject(newObj);
    }

    this.canvas.remove(this.activePolygon);
    this.activePolygon = null;
    this.polygonPoints = [];
    this.mapState.setDrawingMode(null);
    this.canvas.renderAll();
  }

  private updateCanvasSize() {
    const map = (this.mapState as any).currentMapSubject?.value as IndoorMap;
    if (map) {
      const width = map.dimensions.width * map.scale;
      const height = map.dimensions.height * map.scale;
      this.canvas.setDimensions({ width, height });
      this.drawGrid(map.scale);
    }
  }

  private drawGrid(scale: number) {
    const objects = this.canvas.getObjects().filter(obj => (obj as any).isGrid);
    this.canvas.remove(...objects);

    const width = this.canvas.getWidth();
    const height = this.canvas.getHeight();
    const gridStep = scale; 

    const gridLines = [];
    for (let i = 0; i <= width; i += gridStep) {
      gridLines.push(new fabric.Line([i, 0, i, height], { stroke: '#e0e0e0', selectable: false, evented: false, // @ts-ignore
      isGrid: true }));
    }
    for (let i = 0; i <= height; i += gridStep) {
      gridLines.push(new fabric.Line([0, i, width, i], { stroke: '#e0e0e0', selectable: false, evented: false, // @ts-ignore
      isGrid: true }));
    }
    this.canvas.add(...gridLines);
    this.canvas.sendObjectToBack(gridLines[0]);
  }

  private renderMap(map: IndoorMap) {
    this.isInternalUpdate = true;
    this.canvas.clear();
    this.drawGrid(map.scale);

    map.objects.forEach(obj => {
      const fabricObj = this.createFabricObject(obj, map.scale);
      if (fabricObj) {
        this.canvas.add(fabricObj);
      }
    });
    
    this.canvas.renderAll();
    this.isInternalUpdate = false;
  }

  private createFabricObject(obj: MapObject, scale: number): fabric.Object | null {
    let fObj: fabric.Object;
    const left = obj.x * scale;
    const top = obj.y * scale;

    const interactionProps = {
      selectable: !this.readonly,
      evented: !this.readonly
    };

    if (obj.points && obj.points.length > 0) {
      fObj = new fabric.Polygon(obj.points.map(p => ({ x: p.x * scale, y: p.y * scale })), {
        left, top,
        fill: obj.color || '#8b4513',
        stroke: '#5d2906',
        strokeWidth: 2,
        angle: obj.rotation,
        ...interactionProps,
        // @ts-ignore
        data: obj
      });
    } else if (obj.type === 'beacon') {
      const width = (obj.width || 0.3) * scale;
      const height = (obj.height || 0.3) * scale;
      const commonProps = {
        left, top,
        fill: obj.color || '#007bff',
        stroke: '#0056b3',
        strokeWidth: 1,
        angle: obj.rotation,
        originX: 'center' as const,
        originY: 'center' as const,
        ...interactionProps,
        // @ts-ignore
        data: obj
      };

      switch (obj.shape) {
        case 'circle':
          fObj = new fabric.Circle({ 
            ...commonProps, 
            radius: width / 2,
            lockUniScaling: true // Keep circles circular
          });
          break;
        case 'triangle':
          fObj = new fabric.Triangle({ ...commonProps, width, height });
          break;
        case 'star':
          // Adjusted star to use actual width/height
          fObj = new fabric.Polygon([
            {x: 0, y: -height/2}, {x: width/4, y: -height/6}, {x: width/2, y: -height/6},
            {x: width/3, y: height/8}, {x: width/2, y: height/2}, {x: 0, y: height/4},
            {x: -width/2, y: height/2}, {x: -width/3, y: height/8}, {x: -width/2, y: -height/6},
            {x: -width/4, y: -height/6}
          ], commonProps);
          break;
        default:
          fObj = new fabric.Rect({ ...commonProps, width, height });
      }
    } else {
      const width = obj.width * scale;
      const height = obj.height * scale;
      fObj = new fabric.Rect({
        left, top, width, height,
        fill: obj.color || (obj.type === 'wall' ? '#333333' : '#8b4513'),
        stroke: obj.type === 'wall' ? undefined : '#5d2906',
        strokeWidth: obj.type === 'wall' ? 0 : 2,
        angle: obj.rotation,
        originX: 'left',
        originY: obj.type === 'wall' ? 'center' : 'top',
        ...interactionProps,
        // @ts-ignore
        data: obj
      });
    }
    return fObj;
  }

  private handleObjectChange(e: any) {
    const fObj = e.target;
    if (!fObj || !fObj.data) return;
    const map = (this.mapState as any).currentMapSubject?.value;
    if (!map) return;
    const scale = map.scale;

    if (fObj.data.type === 'wall') {
      this.isInternalUpdate = true;
      this.canvas.getObjects().filter(obj => (obj as any).data?.type === 'wall').forEach(wall => {
        const updates: Partial<MapObject> = {
          x: wall.left! / scale,
          y: wall.top! / scale,
          width: (wall.width! * wall.scaleX!) / scale,
          height: (wall.height! * wall.scaleY!) / scale,
          rotation: wall.angle
        };
        this.mapState.updateObject((wall as any).data.id, updates);
      });
      this.isInternalUpdate = false;
    } else {
      const updates: Partial<MapObject> = {
        x: fObj.left / scale,
        y: fObj.top / scale,
        width: (fObj.width * fObj.scaleX) / scale,
        height: (fObj.height * fObj.scaleY) / scale,
        rotation: fObj.angle
      };
      this.isInternalUpdate = true;
      this.mapState.updateObject(fObj.data.id, updates);
      this.isInternalUpdate = false;
    }
  }

  private handleSelection(e: any) {
    const selected = e.selected ? e.selected[0] as any : null;
    if (selected && selected.data) {
      this.mapState.selectObject(selected.data);
    } else {
      this.mapState.selectObject(null);
    }
  }
}
