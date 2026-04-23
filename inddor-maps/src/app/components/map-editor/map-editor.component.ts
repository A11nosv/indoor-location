import { Component, ElementRef, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
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
  
  private canvas!: fabric.Canvas;
  private subscriptions: Subscription = new Subscription();
  private isInternalUpdate = false;
  
  // Drawing state
  private activePolygon: fabric.Polyline | null = null;
  private polygonPoints: fabric.Point[] = [];
  private drawingMode: { mode: string, heightZ: number } | null = null;

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
      selection: true,
      preserveObjectStacking: true
    });

    this.updateCanvasSize();

    // Fabric.js Events
    this.canvas.on('mouse:down', (options) => this.handleMouseDown(options));
    this.canvas.on('mouse:move', (options) => this.handleMouseMove(options));
    this.canvas.on('mouse:dblclick', () => this.finishPolygon());

    this.canvas.on('object:moving', (options) => {
      const map = (this.mapState as any).currentMapSubject?.value;
      if (!map) return;
      
      const grid = map.scale * 0.1; // Snap to 0.1m (10cm)
      options.target!.set({
        left: Math.round(options.target!.left! / grid) * grid,
        top: Math.round(options.target!.top! / grid) * grid
      });
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
  }

  private renderHeatmap(data: number[][] | null) {
    // Clear old heatmap
    const objects = this.canvas.getObjects().filter(obj => (obj as any).isHeatmap);
    this.canvas.remove(...objects);

    if (!data) {
      this.canvas.renderAll();
      return;
    }

    const map = (this.mapState as any).currentMapSubject.value;
    const res = 0.5; // Matches StudyEngine resolution
    const scale = map.scale;

    const rects = [];
    for (let r = 0; r < data.length; r++) {
      for (let c = 0; c < data[r].length; c++) {
        const quality = data[r][c];
        if (quality === 0) continue;

        const color = this.getHeatmapColor(quality);
        rects.push(new fabric.Rect({
          left: c * res * scale,
          top: r * res * scale,
          width: res * scale,
          height: res * scale,
          fill: color,
          opacity: 0.4,
          selectable: false,
          evented: false,
          // @ts-ignore
          isHeatmap: true
        }));
      }
    }

    this.canvas.add(...rects);
    // Beacons should be visible above heatmap
    this.canvas.getObjects().filter(o => (o as any).data?.type === 'beacon').forEach(b => b.bringToFront());
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

    if (obj.points && obj.points.length > 0) {
      fObj = new fabric.Polygon(obj.points.map(p => ({ x: p.x * scale, y: p.y * scale })), {
        left, top,
        fill: obj.color || '#8b4513',
        stroke: '#5d2906',
        strokeWidth: 2,
        angle: obj.rotation,
        // @ts-ignore
        data: obj
      });
    } else {
      const width = obj.width * scale;
      const height = obj.height * scale;
      fObj = new fabric.Rect({
        left, top, width, height,
        fill: obj.type === 'wall' ? '#333333' : '#8b4513',
        stroke: obj.type === 'wall' ? undefined : '#5d2906',
        strokeWidth: obj.type === 'wall' ? 0 : 2,
        angle: obj.rotation,
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

  private handleSelection(e: any) {
    const selected = e.selected ? e.selected[0] : null;
    if (selected && selected.data) {
      this.mapState.selectObject(selected.data);
    } else {
      this.mapState.selectObject(null);
    }
  }
}
