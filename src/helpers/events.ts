import * as pc from 'playcanvas';
import {FruitController} from '../scripts/fruit-controller.js';

export interface AppEvents {
    'xr:onTrigger': pc.XrInputSource;
    'fruit:collected': FruitController;
}
