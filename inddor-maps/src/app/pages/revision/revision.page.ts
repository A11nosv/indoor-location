import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  IonBadge,
  ActionSheetController,
  AlertController,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eyeOutline, mapOutline, folderOpenOutline, close, checkmarkDoneOutline, warningOutline, informationCircleOutline, locationOutline } from 'ionicons/icons';
import { MapEditorComponent } from '../../components/map-editor/map-editor.component';
import { MapStateService } from '../../services/map-state.service';
import { FilterBeaconsPipe } from '../../pipes/filter-beacons.pipe';
import { IndoorMap, MapObject } from '../../models/map.model';
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-revision',
  standalone: true,
  imports: [
    CommonModule,
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
    IonBadge,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    MapEditorComponent,
    FilterBeaconsPipe
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar color="warning">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Revisión de Instalación</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="importMap()">
            <ion-icon slot="start" name="folder-open-outline"></ion-icon>
            Importar Mapa Instalado
          </ion-button>
          <ion-button (click)="validateMap()" color="dark" fill="solid" [disabled]="!(currentMap$ | async)">
            <ion-icon slot="start" name="checkmark-done-outline"></ion-icon>
            Validar Mapa
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" scrollY="false">
      <div class="revision-layout">
        <div class="info-side">
          <div class="summary-card" *ngIf="currentMap$ | async as map">
            <ion-card>
              <ion-card-header>
                <ion-card-title>Resumen de Revisión</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p><strong>Mapa:</strong> {{map.name}}</p>
                <p><strong>Dimensiones:</strong> {{map.dimensions.width}}x{{map.dimensions.height}}m</p>
                <p><strong>Balizas Totales:</strong> {{ (map.objects | filterBeacons).length }}</p>
              </ion-card-content>
            </ion-card>
          </div>

          <ion-list>
            <ion-list-header>
              <ion-label>Estado de Balizas</ion-label>
            </ion-list-header>

            <div class="beacon-list" *ngIf="beacons$ | async as beacons">
              <ion-item *ngFor="let beacon of beacons" 
                        button (click)="selectBeacon(beacon)"
                        [color]="(selectedObject$ | async)?.id === beacon.id ? 'light' : ''">
                <ion-icon slot="start" name="location-outline" [style.color]="beacon.color"></ion-icon>
                <ion-label>
                  <h2>{{beacon.name}}</h2>
                  <p>ID: {{beacon.metadata?.['hardwareId'] || 'N/D'}}</p>
                </ion-label>
                <ion-badge slot="end" [color]="beacon.metadata?.['hardwareId'] ? 'success' : 'danger'">
                  {{ beacon.metadata?.['hardwareId'] ? 'Configurada' : 'Pendiente' }}
                </ion-badge>
              </ion-item>
              
              <ion-item *ngIf="beacons.length === 0">
                <ion-label color="medium">No hay balizas en este mapa.</ion-label>
              </ion-item>
            </div>
          </ion-list>

          <div class="validation-info" *ngIf="selectedObject$ | async as selected">
            <ion-card>
              <ion-card-header>
                <ion-card-title>Detalles de Instalación</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p><strong>Nombre:</strong> {{selected.name}}</p>
                <p><strong>MAC/ID:</strong> {{selected.metadata?.['hardwareId'] || 'No registrada'}}</p>
                <p><strong>UUID:</strong> {{selected.metadata?.['uuid'] || 'N/D'}}</p>
                <p><strong>Major/Minor:</strong> {{selected.metadata?.['major'] || '0'}}/{{selected.metadata?.['minor'] || '0'}}</p>
                <p><strong>Posición:</strong> {{selected.x | number:'1.1-2'}}, {{selected.y | number:'1.1-2'}}, {{selected.heightZ}}m</p>
                <div class="comments-section" *ngIf="selected.metadata?.['comments']">
                  <p><strong>Comentarios:</strong></p>
                  <p class="comment-text">{{selected.metadata?.['comments']}}</p>
                </div>
              </ion-card-content>
            </ion-card>
          </div>
        </div>

        <div class="canvas-area">
          <app-map-editor [readonly]="true"></app-map-editor>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .revision-layout {
      display: flex;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    .info-side {
      width: 400px;
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
      background: #333; /* Darker background for review */
    }

    .beacon-list {
      max-height: 40vh;
      overflow-y: auto;
    }

    .comment-text {
      background: #f9f9f9;
      padding: 8px;
      border-left: 3px solid var(--ion-color-warning);
      font-style: italic;
      font-size: 0.9em;
    }

    .summary-card ion-card {
      margin: 10px;
      background: #fffbe6;
      border: 1px solid #ffe58f;
    }

    app-map-editor {
      width: 100%;
      height: 100%;
    }
  `]
})
export class RevisionPage implements OnInit {
  currentMap$ = this.mapState.currentMap$;
  selectedObject$ = this.mapState.selectedObject$;
  beacons$ = this.currentMap$.pipe(
    map(map => map ? map.objects.filter(obj => obj.type === 'beacon') : [])
  );

  constructor(
    private mapState: MapStateService,
    private actionSheetCtrl: ActionSheetController,
    private alertCtrl: AlertController
  ) {
    addIcons({ 
      eyeOutline, mapOutline, folderOpenOutline, close, 
      checkmarkDoneOutline, warningOutline, informationCircleOutline,
      locationOutline
    });
  }

  ngOnInit() {
    this.mapState.setHeatmapData(null);
  }

  selectBeacon(beacon: MapObject | null) {
    this.mapState.selectObject(beacon);
  }

  async importMap() {
    const maps = this.mapState.getSavedMaps();
    // Prioritize installation maps
    const installationMaps = maps.filter(m => m.name.toLowerCase().includes('instalación'));
    const otherMaps = maps.filter(m => !m.name.toLowerCase().includes('instalación'));

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Importar para Revisión',
      subHeader: 'Selecciona un mapa ya instalado',
      buttons: [
        ...installationMaps.map(map => ({
          text: `[INSTALADO] ${map.name}`,
          icon: 'checkmark-done-outline',
          handler: () => this.mapState.loadFromJson(JSON.stringify(map))
        })),
        ...otherMaps.map(map => ({
          text: map.name,
          icon: 'map-outline',
          handler: () => this.mapState.loadFromJson(JSON.stringify(map))
        })),
        { text: 'Cancelar', role: 'cancel', icon: 'close' }
      ]
    });
    await actionSheet.present();
  }

  async validateMap() {
    const map = (this.mapState as any).currentMapSubject.value;
    if (!map) return;

    const beacons = map.objects.filter((obj: MapObject) => obj.type === 'beacon');
    const configured = beacons.filter((b: MapObject) => b.metadata?.['hardwareId']);
    const pending = beacons.length - configured.length;

    if (pending > 0) {
      const alert = await this.alertCtrl.create({
        header: 'Validación Incompleta',
        message: `Faltan ${pending} balizas por configurar. Es necesario configurar todas las balizas para exportar correctamente a la aplicación Indoor.`,
        buttons: ['Volver a Revisión']
      });
      await alert.present();
    } else {
      this.exportForIndoor(map);
    }
  }

  private async exportForIndoor(map: IndoorMap) {
    // 1. Convert to Indoor App Format
    const indoorData = {
      buildingId: map.id,
      name: map.name,
      floor: {
        id: 'floor_1',
        name: 'Planta Principal',
        width: map.dimensions.width,
        height: map.dimensions.height,
        pois: map.objects
          .filter(obj => obj.type === 'poi' || obj.type === 'room')
          .map(obj => ({
            id: obj.id,
            name: obj.name,
            description: obj.metadata?.['comments'] || '',
            x: obj.x,
            y: obj.y,
            type: obj.type === 'room' ? 'room' : 'landmark'
          })),
        obstacles: map.objects
          .filter(obj => obj.type === 'wall' || obj.type === 'furniture')
          .map(obj => ({
            id: obj.id,
            name: obj.name,
            x: obj.x,
            y: obj.y,
            width: obj.width,
            height: obj.height
          }))
      },
      beacons: map.objects
        .filter(obj => obj.type === 'beacon')
        .map(obj => ({
          id: obj.metadata?.['hardwareId'] || obj.id,
          x: obj.x,
          y: obj.y,
          measuredPower: -59 // Default standard value
        }))
    };

    // 2. Save current state
    this.mapState.saveCurrentMap();

    // 3. Offer Download
    const alert = await this.alertCtrl.create({
      header: 'Mapa Validado con Éxito',
      message: 'La instalación ha sido validada y el mapa está listo para ser utilizado en la aplicación Indoor.',
      buttons: [
        {
          text: 'Exportar para App Indoor',
          handler: () => {
            const json = JSON.stringify(indoorData, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `indoor_config_${map.name.replace(/\s+/g, '_')}.json`;
            a.click();
            window.URL.revokeObjectURL(url);
          }
        },
        { text: 'Finalizar', role: 'confirm' }
      ]
    });
    await alert.present();
  }
}
