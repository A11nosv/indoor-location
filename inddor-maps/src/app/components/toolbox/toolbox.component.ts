import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonList, 
  IonListHeader, 
  IonLabel, 
  IonItem, 
  IonIcon, 
  IonButton,
  AlertController 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  removeOutline, 
  shapesOutline, 
  desktopOutline, 
  accessibilityOutline, 
  exitOutline, 
  cloudUploadOutline 
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
    }
  `]
})
export class ToolboxComponent {
  constructor(
    private mapState: MapStateService,
    private alertCtrl: AlertController
  ) {
    addIcons({ 
      removeOutline, 
      shapesOutline, 
      desktopOutline, 
      accessibilityOutline, 
      exitOutline, 
      cloudUploadOutline 
    });
  }

  addWall() {
    const newWall: MapObject = {
      id: crypto.randomUUID(),
      type: 'wall',
      name: 'Muro',
      x: 2,
      y: 2,
      width: 4,
      height: 0.2,
      heightZ: 2.5,
      rotation: 0,
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
    const alert = await this.alertCtrl.create({
      header: `Nuevo ${type === 'desk' ? 'Escritorio' : 'Objeto'}`,
      message: 'Introduce la altura del objeto en metros',
      inputs: [{ name: 'heightZ', type: 'number', placeholder: 'Altura (m)', value: type === 'desk' ? '0.75' : '0.45' }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Añadir', 
          handler: (data) => {
            const furniture: MapObject = {
              id: crypto.randomUUID(),
              type: 'furniture',
              name: type.charAt(0).toUpperCase() + type.slice(1),
              x: 5,
              y: 5,
              width: 1.2,
              height: 0.8,
              heightZ: parseFloat(data.heightZ),
              rotation: 0,
              color: type === 'door' ? '#ffcc00' : '#8b4513'
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
}
