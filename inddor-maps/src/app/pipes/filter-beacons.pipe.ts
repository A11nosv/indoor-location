import { Pipe, PipeTransform } from '@angular/core';
import { MapObject } from '../models/map.model';

@Pipe({
  name: 'filterBeacons',
  standalone: true
})
export class FilterBeaconsPipe implements PipeTransform {
  transform(objects: MapObject[]): MapObject[] {
    if (!objects) return [];
    return objects.filter(obj => obj.type === 'beacon');
  }
}
