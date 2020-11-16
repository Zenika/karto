export default function flatten(arr) {
    return arr.reduce((acc, toFlatten) => acc.concat(toFlatten));
}