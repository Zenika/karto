import * as d3 from 'd3';
import {
    CHARGE_FORCE,
    FOCUS_THRESHOLD,
    GRAPH_HEIGHT,
    GRAPH_WIDTH,
    LINK_ARROW_DEF_ID,
    LINK_ARROW_FADED_DEF_ID,
    LINK_FORCE
} from './D3Constants';
import { closestPointTo, closestSegmentTo } from '../geometry/geometryUtils';

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

    getLayers() {
        return [...this.getItemLayers(), ...this.getLinkLayers()];
    }

    getLayer(name) {
        return this.getLayers().find(layer => layer.name === name);
    }

    getItemLayers() {
        // Overridden by children classes
        return [];
    }

    getLinkLayers() {
        // Overridden by children classes
        return [];
    }

    configureSimulation(simulation) {
        // Overridden by children classes
    }

    sortLayersDataForNiceDisplay() {
        // Overridden by children classes
    }

    isFocused(currentTarget, candidateLayerName, candidateDatum) {
        // Overridden by children classes
        return currentTarget == null || currentTarget.id === candidateDatum.id;
    }

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

    initForceSimulation() {
        const onTick = () => this.renderAllLayers();
        this.simulation = this.createForceSimulationEngine(onTick);
    }

    updateAllLayers(dataSet) {
        const dataChanged = this.updateAllLayersData(dataSet);
        this.updateLinkLayersElements();
        this.updateItemAndLabelLayersElements();
        return dataChanged;
    }

    updateAllLayersData(dataSet) {
        let atLeastOneChange = false;
        this.getLayers().forEach(layer => {
            const changed = layer.updateData(dataSet);
            atLeastOneChange = atLeastOneChange || changed;
        });
        this.sortLayersDataForNiceDisplay();
        return atLeastOneChange;
    }

    updateLinkLayersElements() {
        this.getLinkLayers().forEach(layer => layer.updateElements(
            d3Selection => this.addLinkArrowTo(d3Selection))
        );
    }

    updateItemAndLabelLayersElements() {
        this.getItemLayers().forEach(layer => layer.updateElements(
            d3Selection => this.attachDragHandlerTo(layer, d3Selection))
        );
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
        if (this.focusedElement) {
            this.applyFocusRules();
        }
    }

    createContainerLayout() {
        return d3.select('#graph').append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', [-GRAPH_WIDTH / 2, -GRAPH_HEIGHT / 2, GRAPH_WIDTH, GRAPH_HEIGHT]);
    }

    attachZoomHandlerTo(d3Selection) {
        d3Selection.call(d3.zoom().on('zoom', () => this.handleZoom()));
    }

    handleZoom() {
        this.zoomFactor = d3.event.transform.k;
        this.svg.attr('transform', d3.event.transform);
        this.renderAllLayers();
    };

    attachMouseMouveHandlerTo(d3Selection) {
        d3Selection.on('mousemove', () => {
            const mouse = d3.mouse(d3.event.currentTarget);
            const zoomTransform = d3.zoomTransform(d3Selection.node());
            this.handleMouseMove(zoomTransform.invert(mouse));
        });
    }

    handleMouseMove([x, y]) {
        const mousePositionAsPoint = { x, y };
        const focusUpperBound = FOCUS_THRESHOLD / this.zoomFactor;
        const elementToFocus = this.getItemClosestTo(mousePositionAsPoint, focusUpperBound)
            || this.getLinkClosestTo(mousePositionAsPoint, focusUpperBound);
        if (elementToFocus) {
            this.focusOnElement(elementToFocus);
        } else {
            this.unFocus();
        }
    }

    getItemClosestTo(targetPoint, upperBound) {
        const itemPoints = this.getItemLayers().map(layer => layer.getItemsAsPointGeometries()).flat();
        return closestPointTo(targetPoint, itemPoints, upperBound);
    }

    getLinkClosestTo(targetPoint, upperBound) {
        const linkSegments = this.getLinkLayers().map(layer => layer.getLinksAsSegmentGeometries()).flat();
        return closestSegmentTo(targetPoint, linkSegments, upperBound);
    }

    attachSharedDefinitionsTo(d3Selection) {
        const defs = d3Selection.append('defs');
        this.defineArrowMarker(defs, LINK_ARROW_DEF_ID, 'link-arrow');
        this.defineArrowMarker(defs, LINK_ARROW_FADED_DEF_ID, 'link-arrow-faded');
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

    attachDragHandlerTo(layer, d3Selection) {
        d3Selection.call(d3.drag()
            .on('start', d => this.handleDragStart(layer, d))
            .on('drag', d => this.handleDragUpdate(layer, d))
            .on('end', () => this.handleDragEnd()));
    }

    handleDragStart(layer, item) {
        if (this.isFirstOfSimultaneousDragEvents(d3.event)) {
            this.unFocus();
            this.isDragging = true;
            this.maintainSimulationRunning();
        }
        layer.pinItemAtCurrentPosition(item);
    };

    handleDragUpdate(layer, item) {
        layer.pinItemAtPosition(item, d3.event.x, d3.event.y);
    };

    handleDragEnd() {
        if (this.isLastOfSimultaneousDragEvents(d3.event)) {
            this.isDragging = false;
            this.stopMaintainingSimulationRunning();
        }
    };

    isFirstOfSimultaneousDragEvents(d3Event) {
        return d3Event.active === 0;
    }

    isLastOfSimultaneousDragEvents(d3Event) {
        return d3Event.active === 0;
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

    maintainSimulationRunning() {
        this.simulation.alphaTarget(0.3).restart();
    }

    stopMaintainingSimulationRunning() {
        this.simulation.alphaTarget(0);
    }

    addLinkArrowTo(d3Selection) {
        return d3Selection.attr('marker-end', `url(#${LINK_ARROW_DEF_ID})`);
    }

    focusOnElement(element) {
        if (this.isDragging) {
            return;
        }
        if (!this.isAlreadyFocused(element.id)) {
            this.unFocus();
            this.focusedElement = element;
            const layer = this.getLayer(element.layerName);
            layer.onElementFocused(element.id, this.focusHandlers);
        }
        this.applyFocusRules();
    };

    isAlreadyFocused(elementId) {
        return this.focusedElement != null && this.focusedElement.id === elementId;
    }

    unFocus() {
        if (this.focusedElement == null) {
            return;
        }
        this.focusedElement = null;
        Object.values(this.focusHandlers).forEach(focusHandler => focusHandler(null));
        this.applyFocusRules();
    };

    applyFocusRules() {
        if (this.isDragging) {
            return;
        }
        this.getLayers().forEach(layer => layer.applyFocus(
            datum => this.isFocused(this.focusedElement, layer.name, datum))
        );
    };
}
