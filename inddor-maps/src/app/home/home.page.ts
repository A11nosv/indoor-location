import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonButtons, 
  IonButton, 
  IonMenuButton, 
  IonContent,
  AlertController 
} from '@ionic/angular/standalone';
import { MapEditorComponent } from '../components/map-editor/map-editor.component';
import { ToolboxComponent } from '../components/toolbox/toolbox.component';
import { PropertiesPanelComponent } from '../components/properties-panel/properties-panel.component';
import { MapStateService } from '../services/map-state.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonButtons, 
    IonButton, 
    IonMenuButton, 
    IonContent,
    MapEditorComponent, 
    ToolboxComponent, 
    PropertiesPanelComponent
  ],
})
export class HomePage {
  currentMap$ = this.mapState.currentMap$;

  constructor(
    private mapState: MapStateService,
    private alertCtrl: AlertController
  ) {}

  async newMap() {
    const alert = await this.alertCtrl.create({
      header: 'Nuevo Mapa',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'Nombre del plano', value: 'Plano Nuevo' },
        { name: 'width', type: 'number', placeholder: 'Ancho (m)', value: '20' },
        { name: 'height', type: 'number', placeholder: 'Alto (m)', value: '15' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Crear', 
          handler: (data) => {
            this.mapState.createNewMap(data.name, parseFloat(data.width), parseFloat(data.height));
          }
        }
      ]
    });
    await alert.present();
  }
}
