import * as pc from 'playcanvas';
import {Tree} from '@/scripts/tree.js';

export interface AppEvents {
    'xr:onTrigger': pc.XrInputSource;
    'tree:healed': Tree;
}
