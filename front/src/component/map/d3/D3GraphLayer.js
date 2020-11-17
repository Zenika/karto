export default class D3GraphLayer {

    constructor(layerConfig) {
        this.name = layerConfig.name;
        this.svgElement = layerConfig.svgElement;
        this.dataExtractor = layerConfig.dataExtractor;
        this.d3IdFn = layerConfig.d3IdFn;
        this.d3DatumMapper = layerConfig.d3DatumMapper;
        this.focusHandler = layerConfig.focusHandler;
        this.svgElementAttributesApplier = layerConfig.svgElementAttributesApplier;
        this.data = [];
        this.indexedData = new Map();
    }

    updateData(dataSet) {
        let dataChanged = false;
        const newData = this.dataExtractor(dataSet).map(datum => {
            const oldDatum = this.indexedData.get(this.d3IdFn(datum));
            if (oldDatum) {
                // Datum was already displayed, keep new attributes and patch with d3 data
                return Object.assign(oldDatum, this.d3DatumMapper(datum));
            } else {
                // Datum is new
                dataChanged = true;
                return this.d3DatumMapper(datum);
            }
        });
        if (this.data.length !== newData.length) {
            dataChanged = true;
        }
        this.data.splice(0, this.data.length, ...newData);
        this.indexedData.clear();
        this.data.forEach(datum => this.indexedData.set(datum.id, datum));
        return dataChanged;
    }

    updateElements(newElementAttributesApplier) {

    }

    updateElementsPositionAndScale(zoomFactor) {

    }

    onElementFocused(id, focusHandlers) {
        const focusHandler = focusHandlers[this.focusHandler];
        const datum = this.indexedData.get(id).sourceData;
        focusHandler(datum);
    }

    applyFocus(focusPolicy) {

    }
}
