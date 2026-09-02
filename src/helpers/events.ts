import * as pc from 'playcanvas';
import {Fruit} from '../scripts/fruit.js';

export interface AppEvents {
    'xr:onTrigger': pc.XrInputSource;
    'fruit:collected': Fruit;
}
