import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonList, 
  IonListHeader, 
  IonLabel, 
  IonItem, 
  IonInput, 
  IonButton 
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { MapStateService } from '../../services/map-state.service';
import { MapObject } from '../../models/map.model';

@Component({
  selector: 'app-properties-panel',
  standalone: true,
  imports: [
    CommonModule, 
    IonList, 
    IonListHeader, 
    IonLabel, 
    IonItem, 
    IonInput, 
    IonButton, 
    FormsModule
  ],
  template: `
    <div class="properties-panel" *ngIf="selectedObject$ | async as obj">
      <ion-list>
        <ion-list-header>
          <ion-label>Propiedades: {{obj.name}}</ion-label>
        </ion-list-header>

        <ion-item>
          <ion-label position="stacked">Nombre</ion-label>
          <ion-input [(ngModel)]="obj.name" (ionInput)="update(obj)"></ion-input>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Posición X (m)</ion-label>
          <ion-input type="number" [(ngModel)]="obj.x" (ionInput)="update(obj)"></ion-input>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Posición Y (m)</ion-label>
          <ion-input type="number" [(ngModel)]="obj.y" (ionInput)="update(obj)"></ion-input>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Ancho (m)</ion-label>
          <ion-input type="number" [(ngModel)]="obj.width" (ionInput)="update(obj)"></ion-input>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Alto (m)</ion-label>
          <ion-input type="number" [(ngModel)]="obj.height" (ionInput)="update(obj)"></ion-input>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Rotación (°)</ion-label>
          <ion-input type="number" [(ngModel)]="obj.rotation" (ionInput)="update(obj)"></ion-input>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Altura Z (m)</ion-label>
          <ion-input type="number" [(ngModel)]="obj.heightZ" (ionInput)="update(obj)"></ion-input>
        </ion-item>

        <ion-button expand="block" color="danger" (click)="delete(obj.id)">
          Eliminar Objeto
        </ion-button>
      </ion-list>
    </div>
    <div class="no-selection" *ngIf="!(selectedObject$ | async)">
      <p>Selecciona un objeto para editar sus propiedades</p>
    </div>
  `,
  styles: [`
    .properties-panel {
      width: 250px;
      height: 100%;
      border-left: 1px solid #ddd;
      background: white;
    }
    .no-selection {
      width: 250px;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 20px;
      background: #fafafa;
      color: #666;
    }
  `]
})
export class PropertiesPanelComponent {
  selectedObject$ = this.mapState.selectedObject$;

  constructor(private mapState: MapStateService) {}

  update(obj: MapObject) {
    this.mapState.updateObject(obj.id, obj);
  }

  delete(id: string) {
    this.mapState.removeObject(id);
    this.mapState.selectObject(null);
  }
}
