import {Controllers} from './scripts/controllers.js';
import {Fruit} from './scripts/fruit.js';
import {Game} from './scripts/game.js';
import {Horn} from './scripts/horn.js';
import {Rotate} from './scripts/rotate.js';
import {Tree} from './scripts/tree.js';

export function registerComponents(app: pc.Application) {
    [Rotate, Game, Tree, Horn, Fruit, Controllers].forEach(s => app.scripts.add(s));
}
