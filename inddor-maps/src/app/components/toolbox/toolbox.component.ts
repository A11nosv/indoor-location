import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { 
  IonList, 
  IonListHeader, 
  IonLabel, 
  IonItem, 
  IonIcon, 
  IonButton,
  AlertController,
  ActionSheetController 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  removeOutline, 
  shapesOutline, 
  desktopOutline, 
  accessibilityOutline, 
  exitOutline, 
  cloudUploadOutline,
  checkmarkCircleOutline,
  analyticsOutline,
  saveOutline
} from 'ionicons/icons';
import { MapStateService } from '../../services/map-state.service';
import { MapObject, MapObjectType } from '../../models/map.model';

@Component({
  selector: 'app-toolbox',
  standalone: true,
  imports: [
    CommonModule, 
    IonList, 
    IonListHeader, 
    IonLabel, 
    IonItem, 
    IonIcon, 
    IonButton
  ],
  template: `
    <div class="toolbox">
      <ion-list>
        <ion-list-header>
          <ion-label>Herramientas</ion-label>
        </ion-list-header>
        
        <ion-item button (click)="addWall()">
          <ion-icon slot="start" name="remove-outline"></ion-icon>
          <ion-label>Añadir Muro</ion-label>
        </ion-item>

        <ion-item button (click)="startPolygonDrawing()">
          <ion-icon slot="start" name="shapes-outline"></ion-icon>
          <ion-label>Mobiliario (Polígono)</ion-label>
        </ion-item>

        <ion-item button (click)="addFurniture('desk')">
          <ion-icon slot="start" name="desktop-outline"></ion-icon>
          <ion-label>Escritorio</ion-label>
        </ion-item>

        <ion-item button (click)="addFurniture('chair')">
          <ion-icon slot="start" name="accessibility-outline"></ion-icon>
          <ion-label>Silla</ion-label>
        </ion-item>

        <ion-item button (click)="addFurniture('door')">
          <ion-icon slot="start" name="exit-outline"></ion-icon>
          <ion-label>Puerta</ion-label>
        </ion-item>

        <ion-item button (click)="closeRoom()" color="warning">
          <ion-icon slot="start" name="checkmark-circle-outline"></ion-icon>
          <ion-label>Cerrar Habitación</ion-label>
        </ion-item>

        <ion-list-header>
          <ion-label>Importar</ion-label>
        </ion-list-header>

        <ion-item button (click)="triggerFileInput()">
          <ion-icon slot="start" name="cloud-upload-outline"></ion-icon>
          <ion-label>Subir DXF/SVG/GeoJSON</ion-label>
          <input type="file" #fileInput (change)="onFileSelected($event)" style="display: none" accept=".dxf,.svg,.json,.geojson">
        </ion-item>
      </ion-list>

      <div class="actions">
        <ion-button expand="block" color="primary" (click)="saveMap()">
          <ion-icon slot="start" name="save-outline"></ion-icon>
          Guardar Mapa
        </ion-button>
        <ion-button expand="block" color="secondary" (click)="startStudy()">
          <ion-icon slot="start" name="analytics-outline"></ion-icon>
          Iniciar Estudio
        </ion-button>
        <ion-button expand="block" color="success" (click)="exportMap()">
          Exportar JSON
        </ion-button>
      </div>
    </div>
  `,
  styles: [`
    .toolbox {
      width: 250px;
      height: 100%;
      border-right: 1px solid #ddd;
      background: white;
      display: flex;
      flex-direction: column;
    }
    .actions {
      margin-top: auto;
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
  `]
})
export class ToolboxComponent {
  constructor(
    private mapState: MapStateService,
    private alertCtrl: AlertController,
    private actionSheetCtrl: ActionSheetController,
    private router: Router
  ) {
    addIcons({ 
      removeOutline, 
      shapesOutline, 
      desktopOutline, 
      accessibilityOutline, 
      exitOutline, 
      cloudUploadOutline,
      checkmarkCircleOutline,
      analyticsOutline,
      saveOutline
    });
  }

  saveMap() {
    this.mapState.saveCurrentMap();
    this.alertCtrl.create({
      header: 'Mapa Guardado',
      message: 'El mapa se ha guardado correctamente en tu biblioteca.',
      buttons: ['OK']
    }).then(a => a.present());
  }

  async closeRoom() {
    const currentMap = (this.mapState as any).currentMapSubject.value;
    const walls = currentMap?.objects.filter((obj: MapObject) => obj.type === 'wall') || [];
    
    if (walls.length < 2) return;

    // Detect free ends (points that don't match any other end)
    const points: { x: number, y: number, wallId: string, isStart: boolean }[] = [];
    walls.forEach((w: MapObject) => {
      const rad = (w.rotation * Math.PI) / 180;
      points.push({ x: w.x, y: w.y, wallId: w.id, isStart: true });
      points.push({ 
        x: w.x + w.width * Math.cos(rad), 
        y: w.y + w.width * Math.sin(rad), 
        wallId: w.id, 
        isStart: false 
      });
    });

    const freePoints = points.filter(p1 => {
      const matches = points.filter(p2 => {
        const dist = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
        return dist < 0.05; // 5cm margin
      });
      return matches.length === 1;
    });

    if (freePoints.length === 2) {
      const p1 = freePoints[0];
      const p2 = freePoints[1];

      const length = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
      const rotation = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);

      this.createAndAddWall(length, rotation, p1.x, p1.y);
    } else {
      const alert = await this.alertCtrl.create({
        header: 'Cerrar Habitación',
        message: 'No se han podido detectar exactamente dos puntas libres para cerrar la habitación automáticamente.',
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  async addWall() {
    const currentMap = (this.mapState as any).currentMapSubject.value;
    const walls = currentMap?.objects.filter((obj: MapObject) => obj.type === 'wall') || [];
    const lastWall = walls.length > 0 ? walls[walls.length - 1] : null;

    const alert = await this.alertCtrl.create({
      header: 'Nuevo Muro',
      message: 'Introduce las propiedades del muro',
      inputs: [
        { 
          name: 'lengthCm', 
          type: 'number', 
          placeholder: 'Longitud (cm)', 
          value: '300',
          label: 'Longitud (cm)'
        },
        {
          name: 'rotation',
          type: 'number',
          placeholder: 'Orientación (°)',
          value: lastWall ? lastWall.rotation.toString() : '0',
          label: 'Orientación (°)'
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Continuar', 
          handler: async (data) => {
            const length = parseFloat(data.lengthCm) / 100;
            const rotation = parseFloat(data.rotation) || 0;
            
            let posX = 2;
            let posY = 2;

            if (lastWall) {
              const actionSheet = await this.actionSheetCtrl.create({
                header: '¿Dónde conectar el nuevo muro?',
                buttons: [
                  {
                    text: 'Al FINAL del anterior',
                    handler: () => {
                      const rad = (lastWall.rotation * Math.PI) / 180;
                      // Conexión por el extremo del eje central
                      posX = lastWall.x + lastWall.width * Math.cos(rad);
                      posY = lastWall.y + lastWall.width * Math.sin(rad);
                      this.createAndAddWall(length, rotation, posX, posY);
                    }
                  },
                  {
                    text: 'Al INICIO del anterior',
                    handler: () => {
                      posX = lastWall.x;
                      posY = lastWall.y;
                      this.createAndAddWall(length, rotation, posX, posY);
                    }
                  },
                  {
                    text: 'Suelto (Posición 2,2)',
                    handler: () => {
                      this.createAndAddWall(length, rotation, 2, 2);
                    }
                  },
                  { text: 'Cancelar', role: 'cancel' }
                ]
              });
              await actionSheet.present();
            } else {
              this.createAndAddWall(length, rotation, posX, posY);
            }
          }
        }
      ]
    });
    await alert.present();
  }

  private createAndAddWall(width: number, rotation: number, x: number, y: number) {
    const newWall: MapObject = {
      id: crypto.randomUUID(),
      type: 'wall',
      name: 'Muro',
      x,
      y,
      width,
      height: 0.15,
      heightZ: 2.5,
      rotation,
      color: '#333333'
    };
    this.mapState.addObject(newWall);
  }

  async startPolygonDrawing() {
    const alert = await this.alertCtrl.create({
      header: 'Nuevo Mobiliario (Polígono)',
      message: 'Introduce la altura del objeto en metros',
      inputs: [{ name: 'heightZ', type: 'number', placeholder: 'Altura (m)', value: '0.8' }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Dibujar', 
          handler: (data) => {
            this.mapState.setDrawingMode('polygon', parseFloat(data.heightZ));
          }
        }
      ]
    });
    await alert.present();
  }

  async addFurniture(type: string) {
    const isDoor = type === 'door';
    const currentMap = (this.mapState as any).currentMapSubject.value;
    const walls = currentMap?.objects.filter((obj: MapObject) => obj.type === 'wall') || [];
    const lastWall = walls.length > 0 ? walls[walls.length - 1] : null;

    const inputs: any[] = [
      { 
        name: 'widthCm', 
        type: 'number', 
        placeholder: 'Anchura (cm)', 
        value: isDoor ? '90' : (type === 'desk' ? '120' : '45'),
        label: 'Anchura (cm)'
      }
    ];

    if (!isDoor) {
      inputs.push(
        { 
          name: 'depthCm', 
          type: 'number', 
          placeholder: 'Grosor/Fondo (cm)', 
          value: type === 'desk' ? '80' : '45',
          label: 'Grosor (cm)'
        },
        { 
          name: 'heightZCm', 
          type: 'number', 
          placeholder: 'Altura (cm)', 
          value: type === 'desk' ? '75' : '45',
          label: 'Altura (cm)'
        }
      );
    }

    const alert = await this.alertCtrl.create({
      header: `Nuevo ${isDoor ? 'Puerta' : (type === 'desk' ? 'Escritorio' : 'Objeto')}`,
      message: isDoor && lastWall 
        ? `La puerta se añadirá al final del último muro.` 
        : `Introduce las dimensiones en centímetros`,
      inputs: inputs,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Añadir', 
          handler: (data) => {
            const width = parseFloat(data.widthCm) / 100;
            const height = isDoor ? 0.05 : parseFloat(data.depthCm) / 100;
            const heightZ = isDoor ? 2.1 : parseFloat(data.heightZCm) / 100;

            let posX = 5;
            let posY = 5;
            let rotation = 0;

            if (isDoor && lastWall) {
              const rad = (lastWall.rotation * Math.PI) / 180;
              posX = lastWall.x + lastWall.width * Math.cos(rad);
              posY = lastWall.y + lastWall.width * Math.sin(rad);
              rotation = lastWall.rotation;
            }

            const furniture: MapObject = {
              id: crypto.randomUUID(),
              type: isDoor ? 'wall' : 'furniture', 
              name: type.charAt(0).toUpperCase() + type.slice(1),
              x: posX,
              y: posY,
              width: width,
              height: height,
              heightZ: heightZ,
              rotation: rotation,
              color: isDoor ? '#ffcc00' : '#8b4513'
            };
            this.mapState.addObject(furniture);
          }
        }
      ]
    });
    await alert.present();
  }

  triggerFileInput() {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    input?.click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      console.log('File selected:', file.name);
    }
  }

  exportMap() {
    const json = this.mapState.exportToJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'indoor-map.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  startStudy() {
    // The map is already "saved" in MapStateService which persists to localStorage
    this.router.navigate(['/study']);
  }
}
