import 'playcanvas';
import type {AppEvents} from '../helpers/events.ts';

declare module 'playcanvas' {
    interface EventHandler {
        fire<K extends keyof AppEvents>(name: K, payload: AppEvents[K]): this;

        on<K extends keyof AppEvents>(name: K, callback: (payload: AppEvents[K]) => void, scope?: object): this;

        once<K extends keyof AppEvents>(name: K, callback: (payload: AppEvents[K]) => void, scope?: object): this;

        off<K extends keyof AppEvents>(name: K, callback?: (payload: AppEvents[K]) => void, scope?: object): this;
    }
}
