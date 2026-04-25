import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
  IonSelect,
  IonSelectOption,
  AlertController,
  ActionSheetController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { analyticsOutline, mapOutline, colorWandOutline, saveOutline, bluetoothOutline, trashOutline, folderOpenOutline, close, constructOutline } from 'ionicons/icons';
import { MapEditorComponent } from '../../components/map-editor/map-editor.component';
import { FilterBeaconsPipe } from '../../pipes/filter-beacons.pipe';
import { MapStateService } from '../../services/map-state.service';
import { StudyEngineService } from '../../services/study-engine.service';
import { BleCatalogService } from '../../services/ble-catalog.service';
import { IndoorMap, MapObject } from '../../models/map.model';
import { BLEModel } from '../../models/ble-model.model';
import { Observable, map } from 'rxjs';

export interface BeaconLegendItem {
  name: string;
  color: string;
  shape: string;
  optimalRange: number | string;
}

@Component({
  selector: 'app-study',
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
    IonSelect,
    IonSelectOption,
    MapEditorComponent,
    FilterBeaconsPipe
  ],
  templateUrl: './study.page.html',
  styleUrls: ['./study.page.scss']
})
export class StudyPage implements OnInit {
  currentMap$ = this.mapState.currentMap$;
  catalog$ = this.catalogService.catalog$;
  showHeatmap = false;

  beaconLegend$: Observable<BeaconLegendItem[]> = this.currentMap$.pipe(
    map(map => {
      if (!map) return [];
      const beacons = map.objects.filter(obj => obj.type === 'beacon');
      const uniqueTypes = new Map<string, BeaconLegendItem>();
      
      beacons.forEach(b => {
        // Use modelId if available, otherwise fallback to name
        const key = b.metadata?.['modelId'] || b.name;
        if (!uniqueTypes.has(key)) {
          // Clean name to remove instance numbering (e.g. "Beacon #1" -> "Beacon")
          const cleanName = b.name.split(' #')[0];
          
          uniqueTypes.set(key, {
            name: cleanName,
            color: b.color || '#007bff',
            shape: b.shape || 'rect',
            optimalRange: b.metadata?.['optimalRange'] || 'N/A'
          });
        }
      });
      return Array.from(uniqueTypes.values());
    })
  );

  constructor(
    private mapState: MapStateService,
    private studyEngine: StudyEngineService,
    private catalogService: BleCatalogService,
    private actionSheetCtrl: ActionSheetController,
    private alertCtrl: AlertController,
    private router: Router
  ) {
    addIcons({ analyticsOutline, mapOutline, colorWandOutline, saveOutline, bluetoothOutline, trashOutline, folderOpenOutline, close, constructOutline });
  }

  ngOnInit() {}

  goToInstallation() {
    this.router.navigate(['/installation']);
  }

  clearBeacons() {
    const map = (this.mapState as any).currentMapSubject.value;
    if (map) {
      const otherObjects = map.objects.filter((obj: MapObject) => obj.type !== 'beacon');
      this.mapState.updateMap({ objects: otherObjects });
      // Reset heatmap if visible
      if (this.showHeatmap) {
        this.mapState.setHeatmapData(null);
        this.showHeatmap = false;
      }
    }
  }

  async saveStudyMap() {
    this.mapState.saveCurrentMap();
    const alert = await this.alertCtrl.create({
      header: 'Estudio Guardado',
      message: 'El mapa con la distribución actual de balizas se ha guardado en tu biblioteca.',
      buttons: ['Entendido']
    });
    await alert.present();
  }

  async importMap() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Importar Mapa',
      buttons: [
        {
          text: 'Mis Mapas Guardados',
          icon: 'folder-open-outline',
          handler: () => {
            this.showSavedMapsFolder();
          }
        },
        {
          text: 'Pegar JSON Manualmente',
          icon: 'map-outline',
          handler: async () => {
            const alert = await this.alertCtrl.create({
              header: 'Pegar JSON',
              message: 'Pega aquí el JSON del mapa generado en el Editor.',
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
      this.showError('No tienes mapas guardados en tu biblioteca.');
      return;
    }

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Mi Biblioteca de Mapas',
      subHeader: 'Selecciona un mapa para cargar',
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

  async addBeaconManually() {
    const catalog = await new Promise<BLEModel[]>(resolve => {
      this.catalog$.subscribe(resolve).unsubscribe();
    });

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Selecciona Modelo de Baliza',
      buttons: [
        ...catalog.map(model => ({
          text: `${model.brand} - ${model.modelName}`,
          handler: () => {
            const map = (this.mapState as any).currentMapSubject.value;
            const centerX = map ? map.dimensions.width / 2 : 1;
            const centerY = map ? map.dimensions.height / 2 : 1;

            const newBeacon: MapObject = {
              id: crypto.randomUUID(),
              type: 'beacon',
              name: `Beacon ${model.modelName}`,
              x: centerX, 
              y: centerY, 
              width: 0.3, 
              height: 0.3, 
              heightZ: 2.2, 
              rotation: 0,
              color: model.defaultColor || '#007bff',
              shape: model.defaultShape || 'circle',
              metadata: {
                modelId: model.id,
                optimalRange: model.optimalRange,
                maxRange: model.maxRange
              }
            };
            this.mapState.addObject(newBeacon);
          }
        })),
        { text: 'Cancelar', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  generateAnalysis() {
    const map = (this.mapState as any).currentMapSubject.value;
    if (!map) return;

    const beacons = map.objects.filter((obj: MapObject) => obj.type === 'beacon');
    
    if (beacons.length < 3) {
      this.showError('Se necesitan al menos 3 balizas para realizar el cálculo de triangulación.');
      return;
    }

    const heatmap = this.studyEngine.generateHeatmap(map, beacons);
    this.mapState.setHeatmapData(null); // Clear old first
    setTimeout(() => {
      this.mapState.setHeatmapData(heatmap);
      this.showHeatmap = true;
    }, 10);
  }

  async proposeOptimization() {
    const catalog = await new Promise<BLEModel[]>(resolve => {
      this.catalog$.subscribe(resolve).unsubscribe();
    });

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Modelo para Optimización',
      buttons: [
        ...catalog.map(model => ({
          text: `${model.brand} - ${model.modelName}`,
          handler: () => {
            const map = (this.mapState as any).currentMapSubject.value;
            const proposal = this.studyEngine.proposePlacement(map, model);
            const otherObjects = map.objects.filter((obj: MapObject) => obj.type !== 'beacon');
            this.mapState.updateMap({ objects: [...otherObjects, ...proposal] });
            this.showHeatmap = true;
            const heatmap = this.studyEngine.generateHeatmap(map, proposal);
            this.mapState.setHeatmapData(heatmap);
          }
        })),
        { text: 'Cancelar', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }
}
