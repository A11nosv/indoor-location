export interface BLEModel {
  id: string;
  brand: string;
  modelName: string;
  chipset?: string;
  batteryType?: string;
  estimatedBatteryLife?: string; // e.g., "2 years"
  
  // Triangulation Specs (Factory Defaults)
  defaultTxPower: number;    // dBm at 1 meter
  optimalRange: number;      // meters (Manufacturer recommended)
  maxRange: number;          // meters (Maximum signal reach)
  precisionScore: number;    // 1-5 (How stable the signal is for triangulation)
  
  // Transmission Specs
  supportedProtocols: ('iBeacon' | 'Eddystone' | 'AltBeacon')[];
  minInterval: number;       // ms (e.g., 100ms)
  maxInterval: number;       // ms (e.g., 2000ms)
  
  imageUrl?: string;
  datasheetUrl?: string;
  description?: string;
}
