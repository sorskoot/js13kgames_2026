import {Game} from './components/Game.js';
import {Rotate} from './components/Rotate.js';

export function registerComponents(app: pc.Application) {
    app.scripts.add(Rotate);
    app.scripts.add(Game);
}
