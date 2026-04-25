import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonHeader, 
  IonToolbar, 
  IonButtons, 
  IonMenuButton, 
  IonTitle, 
  IonContent, 
  IonList, 
  IonItem, 
  IonLabel, 
  IonBadge, 
  IonGrid, 
  IonRow, 
  IonCol, 
  IonCard, 
  IonCardHeader, 
  IonCardSubtitle, 
  IonCardTitle, 
  IonCardContent,
  IonIcon,
  IonSearchbar,
  IonChip,
  IonButton,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { star, bluetoothOutline, flashOutline, resizeOutline, batteryDeadOutline, add } from 'ionicons/icons';
import { BleCatalogService } from '../../services/ble-catalog.service';
import { BLEModel } from '../../models/ble-model.model';
import { map, Observable, startWith, combineLatest } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-ble-devices',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader, 
    IonToolbar, 
    IonButtons, 
    IonMenuButton, 
    IonTitle, 
    IonContent, 
    IonList, 
    IonItem, 
    IonLabel, 
    IonBadge,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonCardContent,
    IonIcon,
    IonSearchbar,
    IonChip,
    IonButton
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Catálogo de Dispositivos BLE</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="addNewModel()">
            <ion-icon slot="icon-only" name="add"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar color="primary">
        <ion-searchbar [formControl]="searchControl" placeholder="Buscar marca o modelo..."></ion-searchbar>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="header-container">
        <p class="intro-text">Base de datos de dispositivos comerciales para triangulación en interiores.</p>
      </div>
      
      <ion-grid>
        <ion-row>
          <ion-col size="12" size-md="6" *ngFor="let device of filteredCatalog$ | async">
            <ion-card class="device-card">
              <ion-card-header>
                <div class="header-flex">
                  <div>
                    <ion-card-subtitle>{{device.brand}}</ion-card-subtitle>
                    <ion-card-title>{{device.modelName}}</ion-card-title>
                  </div>
                  <ion-badge color="tertiary">
                    Precisión: {{device.precisionScore}}/5
                  </ion-badge>
                </div>
              </ion-card-header>

              <ion-card-content>
                <p class="description">{{device.description || 'Sin descripción técnica disponible.'}}</p>
                
                <div class="specs-grid">
                  <div class="spec-item">
                    <ion-icon name="flash-outline" color="primary"></ion-icon>
                    <div class="spec-label">TxPower @ 1m</div>
                    <div class="spec-value">{{device.defaultTxPower}} dBm</div>
                  </div>
                  <div class="spec-item">
                    <ion-icon name="resize-outline" color="success"></ion-icon>
                    <div class="spec-label">Distancia Óptima</div>
                    <div class="spec-value">{{device.optimalRange}} m</div>
                  </div>
                  <div class="spec-item">
                    <ion-icon name="bluetooth-outline" color="warning"></ion-icon>
                    <div class="spec-label">Rango Máximo</div>
                    <div class="spec-value">{{device.maxRange}} m</div>
                  </div>
                  <div class="spec-item">
                    <ion-icon name="battery-dead-outline" color="danger"></ion-icon>
                    <div class="spec-label">Batería Est.</div>
                    <div class="spec-value">{{device.estimatedBatteryLife || 'N/A'}}</div>
                  </div>
                </div>

                <div class="protocols">
                  <ion-chip *ngFor="let proto of device.supportedProtocols" outline color="primary">
                    {{proto}}
                  </ion-chip>
                </div>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  `,
  styles: [`
    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .intro-text {
      color: #666;
      margin: 0;
    }
    .header-flex {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .device-card {
      margin: 0;
      height: 100%;
    }
    .description {
      margin-bottom: 15px;
      font-style: italic;
      min-height: 3em;
    }
    .specs-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 15px;
      background: #f9f9f9;
      padding: 10px;
      border-radius: 8px;
    }
    .spec-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .spec-label {
      font-size: 0.75em;
      color: #888;
      margin: 4px 0;
    }
    .spec-value {
      font-weight: bold;
      font-size: 0.9em;
    }
    .protocols {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }
  `]
})
export class BleDevicesPage {
  searchControl = new FormControl('');
  filteredCatalog$: Observable<BLEModel[]>;

  constructor(
    private catalogService: BleCatalogService,
    private alertCtrl: AlertController
  ) {
    addIcons({ star, bluetoothOutline, flashOutline, resizeOutline, batteryDeadOutline, add });

    this.filteredCatalog$ = combineLatest([
      this.catalogService.catalog$,
      this.searchControl.valueChanges.pipe(startWith(''))
    ]).pipe(
      map(([catalog, searchTerm]) => {
        const term = searchTerm?.toLowerCase() || '';
        return catalog.filter(m => 
          m.brand.toLowerCase().includes(term) || 
          m.modelName.toLowerCase().includes(term)
        );
      })
    );
  }

  async addNewModel() {
    const alert = await this.alertCtrl.create({
      header: 'Añadir Nuevo Modelo BLE',
      message: 'Paso 1: Especificaciones Técnicas',
      inputs: [
        { name: 'brand', type: 'text', placeholder: 'Marca (ej: BlueCats)' },
        { name: 'modelName', type: 'text', placeholder: 'Nombre del Modelo' },
        { name: 'defaultTxPower', type: 'number', placeholder: 'TxPower @ 1m (dBm)', value: '-59' },
        { name: 'optimalRange', type: 'number', placeholder: 'Distancia Óptima (m)', value: '2.5' },
        { name: 'maxRange', type: 'number', placeholder: 'Distancia Máxima (m)', value: '20' },
        { name: 'precisionScore', type: 'number', placeholder: 'Precisión (1-5)', value: '4' },
        { name: 'description', type: 'textarea', placeholder: 'Breve descripción técnica' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Siguiente', 
          handler: (techData) => {
            this.showVisualCustomization(techData);
          }
        }
      ]
    });
    await alert.present();
  }

  private async showVisualCustomization(techData: any) {
    const alert = await this.alertCtrl.create({
      header: 'Personalización Visual',
      message: 'Paso 2: Identificación en el Mapa',
      inputs: [
        { name: 'color', type: 'text', placeholder: 'Color (Hex, ej: #FF0000)', value: '#007bff' },
        { name: 'shape', type: 'radio', label: 'Círculo', value: 'circle', checked: true },
        { name: 'shape', type: 'radio', label: 'Cuadrado', value: 'rect' },
        { name: 'shape', type: 'radio', label: 'Triángulo', value: 'triangle' },
        { name: 'shape', type: 'radio', label: 'Estrella', value: 'star' }
      ],
      buttons: [
        { text: 'Atrás', handler: () => this.addNewModel() },
        {
          text: 'Guardar Modelo',
          handler: (visualData) => {
            const newModel: BLEModel = {
              id: crypto.randomUUID(),
              brand: techData.brand,
              modelName: techData.modelName,
              defaultTxPower: parseFloat(techData.defaultTxPower),
              optimalRange: parseFloat(techData.optimalRange),
              maxRange: parseFloat(techData.maxRange),
              precisionScore: parseInt(techData.precisionScore),
              minInterval: 100,
              maxInterval: 1000,
              description: techData.description,
              supportedProtocols: ['iBeacon'],
              estimatedBatteryLife: 'Variable',
              defaultColor: visualData.color || '#007bff',
              defaultShape: visualData.shape || 'circle'
            };
            this.catalogService.addModel(newModel);
          }
        }
      ]
    });
    await alert.present();
  }
}
