export function flatten(arr) {
    return arr.reduce((acc, toFlatten) => acc.concat(toFlatten), []);
}

export function isFunction(functionToCheck) {
    return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}
