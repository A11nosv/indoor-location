import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, 
  IonToolbar, 
  IonButtons, 
  IonMenuButton, 
  IonTitle, 
  IonContent, 
  IonButton, 
  IonIcon,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonBackButton,
  IonInput,
  IonTextarea,
  ActionSheetController,
  AlertController,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { buildOutline, mapOutline, locationOutline, folderOpenOutline, close, saveOutline } from 'ionicons/icons';
import { MapEditorComponent } from '../../components/map-editor/map-editor.component';
import { MapStateService } from '../../services/map-state.service';
import { FilterBeaconsPipe } from '../../pipes/filter-beacons.pipe';
import { IndoorMap, MapObject } from '../../models/map.model';
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-installation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, 
    IonToolbar, 
    IonButtons, 
    IonMenuButton, 
    IonTitle, 
    IonContent, 
    IonButton, 
    IonIcon,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonBackButton,
    IonInput,
    IonTextarea,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    MapEditorComponent,
    FilterBeaconsPipe
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar color="tertiary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/study"></ion-back-button>
        </ion-buttons>
        <ion-title>Guía de Instalación</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="importMap()">
            <ion-icon slot="start" name="folder-open-outline"></ion-icon>
            Importar Estudio
          </ion-button>
          <ion-button (click)="saveInstallation()" color="success">
            <ion-icon slot="start" name="save-outline"></ion-icon>
            Guardar Instalación
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" scrollY="false">
      <div class="installation-layout">
        <div class="info-side">
          <!-- Formulario de Baliza Seleccionada -->
          <div class="selection-detail" *ngIf="selectedObject$ | async as selected">
            <ion-card class="detail-card">
              <ion-card-header>
                <div class="header-with-action">
                  <ion-card-title>Configurar Baliza</ion-card-title>
                  <ion-button fill="clear" size="small" (click)="selectBeacon(null)">
                    <ion-icon name="close"></ion-icon>
                  </ion-button>
                </div>
              </ion-card-header>
              <ion-card-content>
                <p class="subtitle">{{selected.name}}</p>
                
                <ion-list lines="inset">
                  <ion-item>
                    <ion-label position="stacked">MAC / ID Hardware</ion-label>
                    <ion-input [(ngModel)]="beaconData.hardwareId" placeholder="Ej: AA:BB:CC:11:22:33"></ion-input>
                  </ion-item>
                  
                  <ion-item>
                    <ion-label position="stacked">UUID</ion-label>
                    <ion-input [(ngModel)]="beaconData.uuid" placeholder="F7826DA6-..."></ion-input>
                  </ion-item>

                  <div class="row">
                    <ion-item class="col">
                      <ion-label position="stacked">Major</ion-label>
                      <ion-input type="number" [(ngModel)]="beaconData.major"></ion-input>
                    </ion-item>
                    <ion-item class="col">
                      <ion-label position="stacked">Minor</ion-label>
                      <ion-input type="number" [(ngModel)]="beaconData.minor"></ion-input>
                    </ion-item>
                  </div>

                  <ion-item>
                    <ion-label position="stacked">Comentarios de Instalación</ion-label>
                    <ion-textarea [(ngModel)]="beaconData.comments" 
                                  placeholder="Ej: Instalada detrás de la viga, necesita batería extra..."
                                  [autoGrow]="true" rows="3"></ion-textarea>
                  </ion-item>
                </ion-list>

                <ion-button expand="block" (click)="saveBeaconData(selected.id)" class="ion-margin-top">
                  <ion-icon slot="start" name="save-outline"></ion-icon>
                  Guardar Identificación
                </ion-button>
              </ion-card-content>
            </ion-card>
          </div>

          <!-- Vista General (Instrucciones e Inventario) -->
          <div class="general-view" [class.hidden]="(selectedObject$ | async)">
            <ion-list>
              <ion-list-header>
                <ion-label>Instrucciones de Despliegue</ion-label>
              </ion-list-header>
              
              <ion-item lines="none">
                <ion-label class="ion-text-wrap">
                  <p>Sigue el plano para posicionar físicamente las balizas BLE. Selecciona una baliza de la lista o el mapa para registrar sus datos técnicos.</p>
                </ion-label>
              </ion-item>

              <ion-list-header>
                <ion-label>Inventario de Instalación</ion-label>
              </ion-list-header>

              <div class="beacon-list">
                <ion-item *ngFor="let beacon of beacons$ | async; let i = index" 
                          button (click)="selectBeacon(beacon)"
                          [color]="(selectedObject$ | async)?.id === beacon.id ? 'light' : ''">
                  <ion-icon slot="start" name="location-outline" [style.color]="beacon.color"></ion-icon>
                  <ion-label>
                    <h2 [class.completed]="beacon.metadata?.['installed']">{{beacon.name}}</h2>
                    <p>Posición: {{beacon.x | number:'1.2-2'}}, {{beacon.y | number:'1.2-2'}}m</p>
                    <p *ngIf="beacon.metadata?.['hardwareId']">ID: {{beacon.metadata?.['hardwareId']}}</p>
                  </ion-label>
                  <ion-icon slot="end" name="checkmark-circle" color="success" *ngIf="beacon.metadata?.['installed']"></ion-icon>
                </ion-item>
              </div>
            </ion-list>
          </div>
        </div>

        <div class="canvas-area">
          <div class="map-info" *ngIf="currentMap$ | async as map">
            <span>Mapa: {{map.name}} | Total Balizas: {{ (map.objects | filterBeacons).length }}</span>
          </div>
          <app-map-editor [readonly]="true"></app-map-editor>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .installation-layout {
      display: flex;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    .info-side {
      width: 380px;
      height: 100%;
      border-right: 1px solid #ddd;
      background: white;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }

    .canvas-area {
      flex: 1;
      position: relative;
      background: #f4f4f4;
    }

    .map-info {
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(255, 255, 255, 0.9);
      padding: 8px 15px;
      border-radius: 8px;
      font-size: 0.9em;
      z-index: 10;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      border: 1px solid #eee;
    }

    .beacon-list {
      max-height: calc(100vh - 200px);
      overflow-y: auto;
    }

    .detail-card {
      margin: 10px;
      box-shadow: none;
      border: 1px solid #eee;
    }

    .header-with-action {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .subtitle {
      color: var(--ion-color-medium);
      margin-top: -5px;
      margin-bottom: 15px;
    }

    .row {
      display: flex;
      gap: 10px;
    }

    .col {
      flex: 1;
    }

    .general-view.hidden {
      display: none;
    }

    .completed {
      font-weight: bold;
      color: var(--ion-color-success);
    }

    app-map-editor {
      width: 100%;
      height: 100%;
    }
  `]
})
export class InstallationPage implements OnInit {
  currentMap$ = this.mapState.currentMap$;
  selectedObject$ = this.mapState.selectedObject$;
  beacons$ = this.currentMap$.pipe(
    map(map => map ? map.objects.filter(obj => obj.type === 'beacon') : [])
  );

  beaconData = {
    hardwareId: '',
    uuid: '',
    major: '',
    minor: '',
    comments: ''
  };

  constructor(
    private mapState: MapStateService,
    private actionSheetCtrl: ActionSheetController,
    private alertCtrl: AlertController
  ) {
    addIcons({ 
      buildOutline, mapOutline, locationOutline, 
      folderOpenOutline, close, saveOutline,
      checkmarkCircle: 'checkmark-circle' 
    });
  }

  ngOnInit() {
    this.mapState.setHeatmapData(null);
    
    // Subscribe to selection to populate form
    this.selectedObject$.subscribe(obj => {
      if (obj && obj.type === 'beacon') {
        this.beaconData = {
          hardwareId: obj.metadata?.['hardwareId'] || '',
          uuid: obj.metadata?.['uuid'] || '',
          major: obj.metadata?.['major'] || '',
          minor: obj.metadata?.['minor'] || '',
          comments: obj.metadata?.['comments'] || ''
        };
      }
    });
  }

  selectBeacon(beacon: MapObject | null) {
    this.mapState.selectObject(beacon);
  }

  saveBeaconData(objectId: string) {
    const metadata = {
      ...this.beaconData,
      installed: true
    };
    this.mapState.updateObject(objectId, { metadata });
    this.selectBeacon(null); // Return to list
  }

  async saveInstallation() {
    const currentMap = (this.mapState as any).currentMapSubject.value;
    if (!currentMap) return;

    // Optional: Update name to reflect it's an installation
    if (!currentMap.name.includes('Instalación')) {
      const newName = `Instalación: ${currentMap.name}`;
      this.mapState.updateMap({ name: newName });
    }

    this.mapState.saveCurrentMap();

    const alert = await this.alertCtrl.create({
      header: 'Instalación Guardada',
      message: 'El mapa y los datos técnicos de todas las balizas se han guardado en tu biblioteca.',
      buttons: [
        {
          text: 'Descargar JSON',
          handler: () => {
            const json = this.mapState.exportToJson();
            const blob = new Blob([json], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `instalacion_${currentMap.name.replace(/\s+/g, '_')}.json`;
            a.click();
            window.URL.revokeObjectURL(url);
          }
        },
        {
          text: 'Entendido',
          role: 'confirm'
        }
      ]
    });
    await alert.present();
  }

  async importMap() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Importar Estudio Finalizado',
      buttons: [
        {
          text: 'Mi Biblioteca de Mapas',
          icon: 'folder-open-outline',
          handler: () => {
            this.showSavedMapsFolder();
          }
        },
        {
          text: 'Pegar JSON del Mapa',
          icon: 'map-outline',
          handler: async () => {
            const alert = await this.alertCtrl.create({
              header: 'Pegar JSON',
              message: 'Pega aquí el JSON del mapa generado en el Editor o Estudio.',
              inputs: [{ name: 'json', type: 'textarea', placeholder: 'JSON del mapa...' }],
              buttons: [
                { text: 'Cancelar', role: 'cancel' },
                { 
                  text: 'Importar', 
                  handler: (data) => this.mapState.loadFromJson(data.json)
                }
              ]
            });
            await alert.present();
          }
        },
        { text: 'Cancelar', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  private async showSavedMapsFolder() {
    const maps = this.mapState.getSavedMaps();
    
    if (maps.length === 0) {
      this.showError('No tienes estudios guardados en tu biblioteca.');
      return;
    }

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Mi Biblioteca de Estudios',
      subHeader: 'Selecciona el estudio finalizado para instalar',
      buttons: [
        ...maps.map(map => ({
          text: `${map.name} (${new Date(map.updatedAt).toLocaleDateString()})`,
          icon: 'map-outline',
          handler: () => {
            this.mapState.loadFromJson(JSON.stringify(map));
          }
        })),
        {
          text: 'Cancelar',
          role: 'cancel',
          icon: 'close'
        }
      ]
    });
    await actionSheet.present();
  }

  private async showError(message: string) {
    const alert = await this.alertCtrl.create({
      header: 'Error',
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }
}
