import ls from 'local-storage';

const CONTROLS_KEY = 'controls';

export function storeControls(controls) {
    ls(CONTROLS_KEY, controls);
}

export function getStoredControls() {
    return ls(CONTROLS_KEY);
}
