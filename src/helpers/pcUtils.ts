// src/pc.ts
import * as pc from 'playcanvas';

export function addScript<T extends pc.Script>(entity: pc.Entity, scriptType: string): T {
    if (!entity.script) {
        entity.addComponent('script');
    }

    return entity.script!.create(scriptType)! as unknown as T;
}
