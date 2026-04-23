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
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  AlertController,
  ActionSheetController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { analyticsOutline, mapOutline, colorWandOutline, saveOutline, bluetoothOutline } from 'ionicons/icons';
import { MapEditorComponent } from '../../components/map-editor/map-editor.component';
import { FilterBeaconsPipe } from '../../pipes/filter-beacons.pipe';
import { MapStateService } from '../../services/map-state.service';
import { StudyEngineService } from '../../services/study-engine.service';
import { BleCatalogService } from '../../services/ble-catalog.service';
import { IndoorMap, MapObject } from '../../models/map.model';
import { BLEModel } from '../../models/ble-model.model';

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

  constructor(
    private mapState: MapStateService,
    private studyEngine: StudyEngineService,
    private catalogService: BleCatalogService,
    private actionSheetCtrl: ActionSheetController,
    private alertCtrl: AlertController
  ) {
    addIcons({ analyticsOutline, mapOutline, colorWandOutline, saveOutline, bluetoothOutline });
  }

  ngOnInit() {}

  async importMap() {
    const alert = await this.alertCtrl.create({
      header: 'Importar Mapa',
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
            const newBeacon: MapObject = {
              id: crypto.randomUUID(),
              type: 'beacon',
              name: `Beacon ${model.modelName}`,
              x: 1, y: 1, width: 0.3, height: 0.3, heightZ: 2.2, rotation: 0,
              color: '#007bff',
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
    this.showHeatmap = !this.showHeatmap;
    const map = (this.mapState as any).currentMapSubject.value;
    const beacons = map.objects.filter((obj: MapObject) => obj.type === 'beacon');
    const heatmap = this.studyEngine.generateHeatmap(map, beacons);
    this.mapState.setHeatmapData(this.showHeatmap ? heatmap : null);
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
