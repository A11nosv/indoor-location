import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BLEModel } from '../models/ble-model.model';

@Injectable({
  providedIn: 'root'
})
export class BleCatalogService {
  private catalogSubject = new BehaviorSubject<BLEModel[]>([]);
  public catalog$ = this.catalogSubject.asObservable();

  constructor() {
    this.loadMarketDatabase();
  }

  private loadMarketDatabase() {
    const marketData: BLEModel[] = [
      {
        id: 'est-pro',
        brand: 'Estimote',
        modelName: 'Proximity Beacon',
        chipset: 'Nordic nRF52',
        defaultTxPower: -59,
        optimalRange: 2.0,
        maxRange: 70,
        precisionScore: 5,
        supportedProtocols: ['iBeacon', 'Eddystone'],
        minInterval: 100,
        maxInterval: 2000,
        estimatedBatteryLife: '2-3 years',
        description: 'Líder en precisión para interiores con acelerómetro incorporado.'
      },
      {
        id: 'kon-smart',
        brand: 'Kontakt.io',
        modelName: 'Smart Beacon SB16-2',
        chipset: 'nRF52832',
        defaultTxPower: -62,
        optimalRange: 3.5,
        maxRange: 50,
        precisionScore: 4,
        supportedProtocols: ['iBeacon', 'Eddystone'],
        minInterval: 200,
        maxInterval: 1000,
        estimatedBatteryLife: '4 years',
        description: 'Alta eficiencia energética y gran estabilidad de señal.'
      },
      {
        id: 'min-i7',
        brand: 'Minew',
        modelName: 'i7 Rugged Beacon',
        chipset: 'nRF52810',
        defaultTxPower: -55,
        optimalRange: 5.0,
        maxRange: 100,
        precisionScore: 3,
        supportedProtocols: ['iBeacon'],
        minInterval: 100,
        maxInterval: 5000,
        estimatedBatteryLife: '5 years',
        description: 'Diseño robusto para entornos industriales o exteriores.'
      },
      {
        id: 'rad-dot',
        brand: 'Radius Networks',
        modelName: 'RadBeacon Dot',
        chipset: 'nRF51822',
        defaultTxPower: -65,
        optimalRange: 1.5,
        maxRange: 20,
        precisionScore: 4,
        supportedProtocols: ['iBeacon', 'Eddystone', 'AltBeacon'],
        minInterval: 100,
        maxInterval: 1000,
        estimatedBatteryLife: '6 months',
        description: 'Ultra compacto, ideal para despliegues temporales o activos móviles.'
      }
    ];
    this.catalogSubject.next(marketData);
  }

  getModelById(id: string): BLEModel | undefined {
    return this.catalogSubject.value.find(m => m.id === id);
  }

  addModel(model: BLEModel) {
    const current = this.catalogSubject.value;
    this.catalogSubject.next([...current, model]);
  }
}
