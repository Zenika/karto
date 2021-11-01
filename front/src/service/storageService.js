import { get, set } from 'local-storage';

const CONTROLS_KEY = 'controls';

export function storeControls(controls) {
    set(CONTROLS_KEY, controls);
}

export function getControls() {
    return get(CONTROLS_KEY);
}
