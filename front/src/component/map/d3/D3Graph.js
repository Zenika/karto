import * as d3 from 'd3';
import { FOCUS_THRESHOLD, FONT_SIZE, FONT_SPACING, GRAPH_HEIGHT, GRAPH_WIDTH, LINK_WIDTH } from './D3Constants';

function distancePointToSegment(x, y, x1, y1, x2, y2) {
    // https://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment#answer-6853926
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    if (len_sq !== 0) //in case of 0 length line
        param = dot / len_sq;
    let xx, yy;
    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }
    const dx = x - xx;
    const dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

function distancePointToPoint(x, y, x1, y1) {
    const dx = x1 - x;
    const dy = y1 - y;
    return Math.sqrt(dx * dx + dy * dy);
}

function ifHighlighted(item, classIfHighlighted, classIfNotHighlighted) {
    return item.highlighted ? classIfHighlighted : classIfNotHighlighted;
}

export default class D3Graph {

    init() {
        const svgRoot = d3.select('#graph').append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', [-GRAPH_WIDTH / 2, -GRAPH_HEIGHT / 2, GRAPH_WIDTH, GRAPH_HEIGHT])
            .on('mousemove', () => {
                const mouse = d3.mouse(d3.event.currentTarget);
                const zoomTransform = d3.zoomTransform(svgRoot.node());
                this.handleMouseMove(zoomTransform.invert(mouse));
            })
            .call(d3.zoom().on('zoom', () => this.handleZoom()));
        const defs = svgRoot.append('defs');
        const defineArrowMarker = (id, className) => {
            defs.append('marker')
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
        };
        defineArrowMarker('arrow', 'link-arrow');
        defineArrowMarker('arrow-faded', 'link-arrow-faded');
        this.zoomFactor = 1;
        this.focusedDatum = null;
        this.svg = svgRoot.append('g');
        this.svg.append('g').attr('id', 'links');
        this.svg.append('g').attr('id', 'items');
        this.svg.append('g').attr('id', 'labels');
        this.getLinkLayers().forEach(layer => layer.attach(this.svg));
        this.getItemLayers().forEach(layer => layer.attach(this.svg));
        this.simulation = d3.forceSimulation([])
            .force('link', d3.forceLink([]).id(d => d.id))
            .force('charge', d3.forceManyBody());
        this.configureSimulation(this.simulation);
        this.simulation.on('tick', () => {
            this.getItemLayers().forEach(layer => {
                layer.itemSvgContainer
                    .selectAll(layer.svgElement)
                    .attr('transform', d => `translate(${d.x},${d.y}) scale(${1 / this.zoomFactor})`);
                layer.labelSvgContainer
                    .selectAll('text')
                    .attr('transform', d => `translate(${d.x},${d.y})`);
            });
            this.getLinkLayers().forEach(layer => {
                layer.linkSvgContainer
                    .selectAll(layer.svgElement)
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y);
            });
        });
    }

    update(dataSet, focusHandlers) {
        // Update focus handlers
        this.focusHandlers = focusHandlers;

        // Update data
        let atLeastOneChange = false;
        for (const layer of [...this.getItemLayers(), ...this.getLinkLayers()]) {
            const changed = layer.update(dataSet);
            atLeastOneChange = atLeastOneChange || changed;
        }
        this.sortData();

        // Update display
        this.getItemLayers().forEach(layer => {
            layer.itemSvgContainer
                .selectAll(layer.svgElement)
                .data(layer.data, d => d.id)
                .join(layer.svgElement)
                .call(layer.svgElementAttributesApplier)
                .attr('class', item => ifHighlighted(item, 'item-highlight', 'item'))
                .attr('transform', d => {
                    if (d.x || d.y) {
                        return `translate(${d.x},${d.y}) scale(${1 / this.zoomFactor})`;
                    } else {
                        return `scale(${1 / this.zoomFactor})`;
                    }
                })
                .call(d3.drag()
                    .on('start', d => this.handleDragStart(d))
                    .on('drag', d => this.handleDragUpdate(d))
                    .on('end', () => this.handleDragEnd()));
            layer.labelSvgContainer
                .selectAll('text')
                .data(layer.data, d => d.id)
                .join('text')
                .text(d => d.displayName)
                .attr('text-anchor', 'middle')
                .attr('font-size', FONT_SIZE / this.zoomFactor)
                .attr('letter-spacing', FONT_SPACING / this.zoomFactor)
                .attr('dy', -FONT_SIZE / this.zoomFactor)
                .attr('class', 'label');
        });
        this.getLinkLayers().forEach(layer => {
            layer.linkSvgContainer
                .selectAll(layer.svgElement)
                .data(layer.data, d => d.id)
                .join(layer.svgElement)
                .call(layer.svgElementAttributesApplier)
                .attr('marker-end', 'url(#arrow)')
                .attr('class', 'link')
                .attr('stroke-width', LINK_WIDTH / this.zoomFactor);
        });

        // Update simulation
        const itemsData = this.getItemLayers().map(layer => layer.data).flat();
        const linksData = this.getLinkLayers().map(layer => layer.data).flat();
        this.simulation.nodes(itemsData);
        this.simulation.force('link').links(linksData);
        if (atLeastOneChange) {
            this.simulation.alpha(1).restart();
        }

        // Restore highlight if still active
        if (this.focusedDatum) {
            this.focusOnDatum(this.focusedDatum.layerName, this.focusedDatum.id);
        }
    }

    handleZoom() {
        this.zoomFactor = d3.event.transform.k;
        this.svg.attr('transform', d3.event.transform);

        this.getItemLayers().forEach(layer => {
            // Compensate changes to shape size
            layer.itemSvgContainer
                .selectAll(layer.svgElement)
                .attr('transform', d => `translate(${d.x},${d.y}) scale(${1 / this.zoomFactor})`);
            // Compensate changes to label size
            layer.labelSvgContainer
                .selectAll('text')
                .attr('font-size', FONT_SIZE / this.zoomFactor)
                .attr('letter-spacing', FONT_SPACING / this.zoomFactor)
                .attr('dy', -FONT_SIZE / this.zoomFactor);
        });
        this.getLinkLayers().forEach(layer => {
            // Compensate changes to line width
            layer.linkSvgContainer
                .selectAll(layer.svgElement)
                .attr('stroke-width', LINK_WIDTH / this.zoomFactor);
        });
    };

    handleMouseMove([x, y]) {
        // Check if mouse is close enough to an item to focus it
        let closestItemId = null;
        let closestItemLayerName = null;
        let distanceToClosestItem = null;
        for (const layer of this.getItemLayers()) {
            for (const datum of layer.data) {
                const distance = distancePointToPoint(x, y, datum.x, datum.y);
                if (closestItemId == null || distance < distanceToClosestItem) {
                    closestItemId = datum.id;
                    closestItemLayerName = layer.name;
                    distanceToClosestItem = distance;
                }
            }
        }
        if (closestItemId && distanceToClosestItem < FOCUS_THRESHOLD / this.zoomFactor) {
            this.focusOnDatum(closestItemLayerName, closestItemId);
            return;
        }

        // Check if mouse is close enough to a link to focus it
        let closestLinkId = null;
        let closestLinkLayerName = null;
        let distanceToClosestLink = null;
        for (const layer of this.getLinkLayers()) {
            for (const datum of layer.data) {
                const source = datum.source;
                const target = datum.target;
                const distance = distancePointToSegment(x, y, source.x, source.y, target.x, target.y);
                if (closestLinkId == null || distance < distanceToClosestLink) {
                    closestLinkId = datum.id;
                    closestLinkLayerName = layer.name;
                    distanceToClosestLink = distance;
                }
            }
        }
        if (closestLinkId && distanceToClosestLink < FOCUS_THRESHOLD / this.zoomFactor) {
            this.focusOnDatum(closestLinkLayerName, closestLinkId);
            return;
        }

        // Unfocus everything is mouse is not close to anything
        this.unFocus();
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
                .attr('class', d => this.isFocused(this.focusedDatum, layer.name, d)
                    ? ifHighlighted(d, 'item-highlight', 'item')
                    : ifHighlighted(d, 'item-faded-highlight', 'item-faded')
                );
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

    getLayer(name) {
        return [...this.getItemLayers(), ...this.getLinkLayers()].find(layer => layer.name === name);
    }

    getItemLayers() {
        return [];
    }

    getLinkLayers() {
        return [];
    }

    configureSimulation(simulation) {

    }

    sortData() {

    }

    isFocused(currentTarget, candidateLayerName, candidateDatum) {
        return currentTarget == null || currentTarget.id === candidateDatum.id;
    }
}
