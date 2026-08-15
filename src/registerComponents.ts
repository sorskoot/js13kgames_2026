import {Game} from './scripts/game.js';
import {Rotate} from './scripts/rotate.js';

export function registerComponents(app: pc.Application) {
    app.scripts.add(Rotate);
    app.scripts.add(Game);
}
