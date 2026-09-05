import {Controllers} from '@/scripts/controllers.js';
import {FruitController} from '@/scripts/fruit-controller.js';
import {Game} from '@/scripts/game.js';
import {Rotate} from '@/scripts/rotate.js';
import {Tree} from '@/scripts/tree.js';

export function registerComponents(app: pc.Application) {
    [Rotate, Game, Tree, FruitController, Controllers].forEach(s => app.scripts.add(s));
}
