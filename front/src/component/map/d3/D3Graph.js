import * as d3 from 'd3';
import { FOCUS_THRESHOLD, GRAPH_HEIGHT, GRAPH_WIDTH } from './D3Constants';
import { closestPointTo, closestSegmentTo } from './geometryUtils';

const LINK_ARROW_DEF_ID = 'arrow';
const LINK_ARROW_FADED_DEF_ID = 'arrow-faded';
const LINK_FORCE = 'link';
const CHARGE_FORCE = 'charge';

export default class D3Graph {

    // Main
    init() {
        this.zoomFactor = 1;
        this.initStructure();
        this.initLayers();
        this.initForceSimulation();
    }

    update(dataSet, focusHandlers) {
        this.focusHandlers = focusHandlers;
        const dataChanged = this.updateAllLayers(dataSet);
        this.updateForceSimulation(dataChanged);
        this.restorePreviousFocus();
    }

    // Level 1 - abstract
    initStructure() {
        const svgRoot = this.createContainerLayout();
        this.attachZoomHandlerTo(svgRoot);
        this.attachMouseMouveHandlerTo(svgRoot);
        this.attachSharedDefinitionsTo(svgRoot);
        this.svg = this.createContentLayout(svgRoot);
    }

    initLayers() {
        this.initLinkLayers();
        this.initItemAndLabelLayers();
    }

    initLinkLayers() {
        const linkLayersContainer = this.createLinkLayersContainer();
        this.getLinkLayers().forEach(layer => layer.attachTo(linkLayersContainer));
    }

    initItemAndLabelLayers() {
        const itemLayersContainer = this.createItemLayersContainer();
        const labelLayersContainer = this.createLabelLayersContainer();
        this.getItemLayers().forEach(layer => layer.attachTo(itemLayersContainer, labelLayersContainer));
    }

    updateAllLayers(dataSet) {
        const dataChanged = this.updateAllLayersData(dataSet);
        this.updateLinkLayersElements();
        this.updateItemAndLabelLayersElements();
        return dataChanged;
    }

    updateAllLayersData(dataSet) {
        let atLeastOneChange = false;
        for (const layer of this.getLayers()) {
            const changed = layer.updateData(dataSet);
            atLeastOneChange = atLeastOneChange || changed;
        }
        this.sortLayersDataForNiceDisplay();
        return atLeastOneChange;
    }

    updateLinkLayersElements() {
        const newElementHandler = d3Selection => this.addLinkArrowTo(d3Selection);
        this.getLinkLayers().forEach(layer => layer.updateElements(newElementHandler));
    }

    updateItemAndLabelLayersElements() {
        const newElementHandler = d3Selection => this.attachDragHandlerTo(d3Selection);
        this.getItemLayers().forEach(layer => layer.updateElements(newElementHandler));
    }

    initForceSimulation() {
        const onTick = () => this.renderAllLayers();
        this.simulation = this.createForceSimulationEngine(onTick);
    }

    renderAllLayers() {
        this.getLayers().forEach(layer => layer.updateElementsPositionAndScale(this.zoomFactor));
    }

    updateForceSimulation(dataChanged) {
        this.updateForceSimulationData();
        if (dataChanged) {
            this.restartSimulation();
        }
    }

    restorePreviousFocus() {
        if (this.focusedDatum) {
            this.focusOnDatum(this.focusedDatum.layerName, this.focusedDatum.id);
        }
    }

    // Level 2 - d3 implem
    createContainerLayout() {
        return d3.select('#graph').append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', [-GRAPH_WIDTH / 2, -GRAPH_HEIGHT / 2, GRAPH_WIDTH, GRAPH_HEIGHT]);
    }

    attachZoomHandlerTo(d3Selection) {
        d3Selection.call(d3.zoom().on('zoom', () => this.handleZoom()));
    }

    attachMouseMouveHandlerTo(d3Selection) {
        d3Selection.on('mousemove', () => {
            const mouse = d3.mouse(d3.event.currentTarget);
            const zoomTransform = d3.zoomTransform(d3Selection.node());
            this.handleMouseMove(zoomTransform.invert(mouse));
        });
    }

    attachSharedDefinitionsTo(d3Selection) {
        const defs = d3Selection.append('defs');
        this.defineArrowMarker(defs, LINK_ARROW_DEF_ID, 'link-arrow');
        this.defineArrowMarker(defs, LINK_ARROW_FADED_DEF_ID, 'link-arrow-faded');
    }

    createContentLayout(d3Selection) {
        return d3Selection.append('g');
    }

    createLinkLayersContainer() {
        return this.svg.append('g').attr('id', 'links');
    }

    createItemLayersContainer() {
        return this.svg.append('g').attr('id', 'items');
    }

    createLabelLayersContainer() {
        return this.svg.append('g').attr('id', 'labels');
    }

    attachDragHandlerTo(d3Selection) {
        d3Selection.call(d3.drag()
            .on('start', d => this.handleDragStart(d))
            .on('drag', d => this.handleDragUpdate(d))
            .on('end', d => this.handleDragEnd(d)));
    }

    addLinkArrowTo(d3Selection) {
        return d3Selection.attr('marker-end', `url(#${LINK_ARROW_DEF_ID})`);
    }

    createForceSimulationEngine(onTick) {
        const simulation = d3.forceSimulation([])
            .force(LINK_FORCE, d3.forceLink([]).id(d => d.id))
            .force(CHARGE_FORCE, d3.forceManyBody());
        this.configureSimulation(simulation);
        simulation.on('tick', onTick);
        return simulation;
    }

    updateForceSimulationData() {
        const itemsData = this.getItemLayers().map(layer => layer.data).flat();
        const linksData = this.getLinkLayers().map(layer => layer.data).flat();
        this.simulation.nodes(itemsData);
        this.simulation.force(LINK_FORCE).links(linksData);
    }

    restartSimulation() {
        this.simulation.alpha(1).restart();
    }

    // Level 3 - Utils
    handleZoom() {
        this.zoomFactor = d3.event.transform.k;
        this.svg.attr('transform', d3.event.transform);
        this.renderAllLayers();
    };

    handleMouseMove([x, y]) {
        const mousePoint = { x, y };

        // Check if mouse is close enough to an item to focus it
        const itemPoints = this.getItemLayers()
            .map(layer => layer.data.map(item => ({
                ...item,
                layerName: layer.name
            })))
            .flat();
        const closestItem = closestPointTo(mousePoint, itemPoints, FOCUS_THRESHOLD / this.zoomFactor);
        if (closestItem) {
            this.focusOnDatum(closestItem.layerName, closestItem.id);
            return;
        }

        // Check if mouse is close enough to a link to focus it
        const linkSegments = this.getLinkLayers()
            .map(layer => layer.data.map(link => ({
                ...link,
                x1: link.source.x,
                y1: link.source.y,
                x2: link.target.x,
                y2: link.target.y,
                layerName: layer.name
            })))
            .flat();
        const closestLink = closestSegmentTo(mousePoint, linkSegments, FOCUS_THRESHOLD / this.zoomFactor);
        if (closestLink) {
            this.focusOnDatum(closestLink.layerName, closestLink.id);
            return;
        }

        // Unfocus everything is mouse is not close to anything
        this.unFocus();
    }

    defineArrowMarker(d3DefsSelection, id, className) {
        d3DefsSelection.append('marker')
            .attr('id', id)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 20)
            .attr('refY', 0)
            .attr('markerWidth', 10)
            .attr('markerHeight', 10)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5L0,-5')
            .attr('class', className);
    }

    focusOnDatum(layerName, id) {
        if (this.isDragging) {
            // Do not focus during drag
            return;
        }
        const layer = this.getLayer(layerName);
        if (this.focusedDatum == null || this.focusedDatum.layerName !== layerName
            || this.focusedDatum.id !== id) {
            this.unFocus();
            this.focusedDatum = { layerName, id };
            layer.focusDatum(id, this.focusHandlers);
        }
        this.applyFocus();
    };

    unFocus() {
        if (this.focusedDatum == null && this.highlightedLinkId == null) {
            return;
        }
        this.focusedDatum = null;
        Object.values(this.focusHandlers).forEach(focusHandler => focusHandler(null));
        this.applyFocus();
    };

    applyFocus() {
        this.getItemLayers().forEach(layer => {
            layer.itemSvgContainer
                .selectAll(layer.svgElement)
                .attr('class', d => {
                    if (this.isFocused(this.focusedDatum, layer.name, d)) {
                        return d.highlighted ? 'item-highlight' : 'item';
                    } else {
                        return d.highlighted ? 'item-faded-highlight' : 'item-faded';
                    }
                });
            layer.labelSvgContainer
                .selectAll('text')
                .attr('display', d => this.isFocused(this.focusedDatum, layer.name, d) ? 'block' : 'none');
        });
        this.getLinkLayers().forEach(layer => {
            layer.linkSvgContainer
                .selectAll(layer.svgElement)
                .attr('class', d => this.isFocused(this.focusedDatum, layer.name, d) ? 'link' : 'link-faded')
                .attr('marker-end', d => this.isFocused(this.focusedDatum, layer.name, d) ? 'url(#arrow)' : 'url(#arrow-faded)');
        });
    };

    handleDragStart(item) {
        if (d3.event.active === 0) {
            // Start of first concurrent drag event
            this.unFocus();
            this.isDragging = true;
            this.simulation.alphaTarget(0.3).restart();
        }
        item.fx = item.x;
        item.fy = item.y;
    };

    handleDragUpdate(item) {
        item.fx = d3.event.x;
        item.fy = d3.event.y;
    };

    handleDragEnd() {
        if (d3.event.active === 0) {
            // End of last concurrent drag event
            this.isDragging = false;
            this.simulation.alphaTarget(0);
        }
    };

    getLayers() {
        return [...this.getItemLayers(), ...this.getLinkLayers()];
    }

    getLayer(name) {
        return this.getLayers().find(layer => layer.name === name);
    }

    getItemLayers() {
        return [];
    }

    getLinkLayers() {
        return [];
    }

    configureSimulation(simulation) {

    }

    sortLayersDataForNiceDisplay() {

    }

    isFocused(currentTarget, candidateLayerName, candidateDatum) {
        return currentTarget == null || currentTarget.id === candidateDatum.id;
    }
}
