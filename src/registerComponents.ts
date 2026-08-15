import {Game} from './scripts/game.js';
import {Rotate} from './scripts/rotate.js';
import {Tree} from './scripts/tree.js';

export function registerComponents(app: pc.Application) {
    [Rotate, Game, Tree].forEach(s => app.scripts.add(s));
}
