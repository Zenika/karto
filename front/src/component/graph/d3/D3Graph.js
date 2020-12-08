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
import { closestPointTo, closestSegmentTo } from '../utils/geometryUtils';
import { flatten } from '../../utils/utils';
import { saveSvgAsPng } from 'save-svg-as-png';

export default class D3Graph {

    init() {
        this.zoomFactor = 1;
        this.initStructure();
        this.initLayers();
        this.initForceSimulation();
    }

    update(dataSet, focusHandlers) {
        const dataChanged = this.updateAllLayers(dataSet, focusHandlers);
        this.updateForceSimulation(dataChanged);
        this.restorePreviousFocus();
    }

    destroy() {
        if (this.simulation) {
            this.simulation.stop();
        }
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

    updateAllLayers(dataSet, focusHandlers) {
        this.updateAllLayersFocusHandlers(focusHandlers);
        const dataChanged = this.updateAllLayersData(dataSet);
        this.updateLinkLayersElements(dataChanged);
        this.updateItemAndLabelLayersElements(dataChanged);
        return dataChanged;
    }

    updateAllLayersFocusHandlers(focusHandlers) {
        this.getLayers().forEach(layer => layer.updateFocusHandlers(focusHandlers));
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

    updateLinkLayersElements(dataChanged) {
        this.getLinkLayers().forEach(layer => layer.updateElements(dataChanged,
            d3Selection => this.addLinkArrowTo(d3Selection))
        );
    }

    updateItemAndLabelLayersElements(dataChanged) {
        this.getItemLayers().forEach(layer => layer.updateElements(dataChanged,
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
        if (this.isInDataSet(this.focusedElement)) {
            this.applyFocusRules();
        }
    }

    createContainerLayout() {
        const svg = d3.select('#graph');
        svg
            .selectAll('*')
            .remove();
        return svg
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', [-GRAPH_WIDTH / 2, -GRAPH_HEIGHT / 2, GRAPH_WIDTH, GRAPH_HEIGHT])
            .attr('aria-label', 'graph');
    }

    attachZoomHandlerTo(d3Selection) {
        d3Selection.call(d3.zoom().on('zoom', event => this.handleZoom(event)));
    }

    handleZoom(event) {
        this.zoomFactor = event.transform.k;
        this.svg.attr('transform', event.transform);
        this.renderAllLayers();
    };

    attachMouseMouveHandlerTo(d3Selection) {
        d3Selection.on('mousemove', event => {
            const mouse = d3.pointer(event);
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
        const itemPoints = flatten(this.getItemLayers().map(layer => layer.getItemsAsPointGeometries()));
        return closestPointTo(targetPoint, itemPoints, upperBound);
    }

    getLinkClosestTo(targetPoint, upperBound) {
        const linkSegments = flatten(this.getLinkLayers().map(layer => layer.getLinksAsSegmentGeometries()));
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
        return d3Selection
            .append('g')
            .attr('aria-label', 'layers container');
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
            .on('start', (event, d) => this.handleDragStart(event, layer, d))
            .on('drag', (event, d) => this.handleDragUpdate(event, layer, d))
            .on('end', event => this.handleDragEnd(event)));
    }

    handleDragStart(event, layer, item) {
        if (this.isFirstOfSimultaneousDragEvents(event)) {
            this.unFocus();
            this.isDragging = true;
            this.maintainSimulationRunning();
        }
        layer.pinItemAtPosition(item, event.x, event.y);
    };

    handleDragUpdate(event, layer, item) {
        layer.pinItemAtPosition(item, event.x, event.y);
    };

    handleDragEnd(event) {
        if (this.isLastOfSimultaneousDragEvents(event)) {
            this.isDragging = false;
            this.stopMaintainingSimulationRunning();
        }
    };

    isFirstOfSimultaneousDragEvents(event) {
        return event.active === 0;
    }

    isLastOfSimultaneousDragEvents(event) {
        return event.active === 0;
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
        const itemsData = flatten(this.getItemLayers().map(layer => layer.data));
        const linksData = flatten(this.getLinkLayers().map(layer => layer.data));
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
        saveSvgAsPng(document.querySelector('#graph'), 'test.png',
            {
                top: -GRAPH_HEIGHT / 2,
                left: -GRAPH_WIDTH / 2,
                scale: 10,
                encoderOptions: 1,
                modifyStyle: s => {
                    return s
                        .replace('rgb(255, 255, 255)', 'black')
                        .replace('font-weight: 100', 'font-weight: 300');
                }
            });
        if (this.isDragging || this.isAlreadyFocused(element)) {
            return;
        }
        if (this.focusedElement) {
            this.getLayer(this.focusedElement.layerName).onElementUnFocused(this.focusedElement);
        }
        this.getLayer(element.layerName).onElementFocused(element);
        this.focusedElement = element;
        this.applyFocusRules();
    };

    unFocus() {
        if (this.focusedElement == null) {
            return;
        }
        this.getLayer(this.focusedElement.layerName).onElementUnFocused(this.focusedElement);
        this.focusedElement = null;
        this.applyFocusRules();
    };

    isAlreadyFocused(element) {
        return this.focusedElement != null && this.focusedElement.id === element.id;
    }

    applyFocusRules() {
        if (this.isDragging) {
            return;
        }
        this.getLayers().forEach(layer => layer.applyFocus(
            datum => this.isFocused(this.focusedElement, layer.name, datum))
        );
    };

    isInDataSet(element) {
        if (!element) {
            return;
        }
        const layer = this.getLayer(element.layerName);
        return layer.indexedData.has(element.id);
    }
}
