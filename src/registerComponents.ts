import {Game} from './components/game.js';
import {Rotate} from './components/rotate.js';

export function registerComponents(app: pc.Application) {
    app.scripts.add(Rotate);
    app.scripts.add(Game);
}
