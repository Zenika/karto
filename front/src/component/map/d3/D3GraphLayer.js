export default class D3GraphLayer {

    constructor(layerConfig) {
        const { name, element, dataExtractorFn, idFn, d3DatumFn, sourceDatumFn, focusHandlerExtractorFn, applyElementCustomAttrs } = layerConfig;
        this.name = name;
        this.element = element;
        this.dataExtractorFn = dataExtractorFn;
        this.idFn = idFn;
        this.d3DatumFn = d3DatumFn;
        this.sourceDatumFn = sourceDatumFn;
        this.focusHandlerExtractorFn = focusHandlerExtractorFn;
        this.applyElementCustomAttrs = applyElementCustomAttrs || (() => {
        });
    }

    attach(svgElement) {
        this.data = [];
        this.indexedData = new Map();
    }

    update(analysisResult) {
        let dataChanged = false;
        const newData = this.dataExtractorFn(analysisResult).map(datum => {
            const oldDatum = this.indexedData.get(this.idFn(datum));
            if (oldDatum) {
                // Datum was already displayed, keep new attributes and patch with d3 data
                return Object.assign(oldDatum, this.d3DatumFn(datum));
            } else {
                // Datum is new
                dataChanged = true;
                return this.d3DatumFn(datum);
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

    focusDatum(id, focusHandlers) {
        if (!this.focusHandlerExtractorFn) {
            return;
        }
        const focusHandler = this.focusHandlerExtractorFn(focusHandlers);
        const datum = this.sourceDatumFn(this.indexedData.get(id));
        focusHandler(datum);
    }
}
