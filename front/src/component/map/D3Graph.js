import * as d3 from 'd3';

const GRAPH_WIDTH = 300;
const GRAPH_HEIGHT = 180;
const LINK_WIDTH = 0.2;
const LINK_FOCUS_AREA_SIZE = 1;
const CIRCLE_FOCUS_AREA_SIZE = 2;
const FONT_SIZE = 4;
const FONT_SPACING = 0.1;

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

function d3AllowedRouteIdFromNodeIds(pod1Id, pod2Id) {
    return `${pod1Id}->${pod2Id}`;
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
        this.highlightedNodeId = null;
        this.svg = svgRoot.append('g');
        this.initInternal();
        this.simulation = this.configureSimulation();
        this.simulation.on('tick', () => {
            this.getContent().forEach(({ type, itemSvgContainer, labelSvgContainer }) => {
                if (type === 'line') {
                    itemSvgContainer
                        .selectAll(type)
                        .attr('x1', d => d.source.x)
                        .attr('y1', d => d.source.y)
                        .attr('x2', d => d.target.x)
                        .attr('y2', d => d.target.y);
                } else {
                    itemSvgContainer
                        .selectAll(type)
                        .attr('transform', d => `translate(${d.x},${d.y}) scale(${1 / this.zoomFactor})`);
                    labelSvgContainer
                        .selectAll('text')
                        .attr('transform', d => `translate(${d.x},${d.y})`);
                }
            });
        });
    }

    update(analysisResult, onItemFocus, onLinkFocus) {
        this.onItemFocus = onItemFocus;
        this.onLinkFocus = onLinkFocus;

        // Update data
        let atLeastOneChange = false;

        this.getContent().forEach(({ data, indexedData, extractorFn, idFn, datumFn }) => {
            let dataChanged = false;
            const newData = extractorFn(analysisResult).map(datum => {
                const oldDatum = indexedData.get(idFn(datum));
                if (oldDatum) {
                    // Datum was already displayed, keep new attributes and patch with d3 data
                    return Object.assign(oldDatum, datumFn(datum));
                } else {
                    // Datum is new
                    dataChanged = true;
                    return datumFn(datum);
                }
            });
            if (data.length !== newData.length) {
                dataChanged = true;
            }
            data.splice(0, data.length, ...newData);
            indexedData.clear();
            data.forEach(datum => indexedData.set(datum.id, datum));
            if (dataChanged) {
                atLeastOneChange = true;
            }
        });

        this.sortData();

        // Update display
        this.getContent().forEach(({ type, data, itemSvgContainer, labelSvgContainer, applyCustomAttributes }) => {
            if (type === 'line') {
                itemSvgContainer
                    .selectAll(type)
                    .data(data)
                    .join(type)
                    .attr('marker-end', 'url(#arrow)')
                    .attr('class', 'link')
                    .attr('stroke-width', LINK_WIDTH / this.zoomFactor);
            } else {
                itemSvgContainer
                    .selectAll(type)
                    .data(data)
                    .join(type)
                    .call(applyCustomAttributes)
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
                labelSvgContainer
                    .selectAll('text')
                    .data(data)
                    .join('text')
                    .text(d => d.displayName)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', FONT_SIZE / this.zoomFactor)
                    .attr('letter-spacing', FONT_SPACING / this.zoomFactor)
                    .attr('dy', -FONT_SIZE / this.zoomFactor)
                    .attr('class', 'label');
            }
        });

        // Update simulation
        const itemsData = this.getContent()
            .filter(c => c.type !== 'line')
            .map(c => c.data)
            .flat();
        const linksData = this.getContent()
            .filter(c => c.type === 'line')
            .map(c => c.data)
            .flat();
        this.simulation.nodes(itemsData);
        this.simulation.force('link').links(linksData);
        if (atLeastOneChange) {
            this.simulation.alpha(1).restart();
        }

        // Restore highlight if still active
        if (this.highlightedNodeId) {
            this.focusOnNode(this.highlightedNodeId);
        }
        if (this.highlightedLinkId) {
            this.focusOnLink(this.highlightedLinkId);
        }
    }

    handleMouseMove([x, y]) {
        // Check if mouse is close enough to an item to focus it
        // let closestNode = null;
        // let distanceToClosestNode = null;
        // this.indexedPods.forEach(pod => {
        //     const distance = distancePointToPoint(x, y, pod.x, pod.y);
        //     if (closestNode == null || distance < distanceToClosestNode) {
        //         closestNode = pod;
        //         distanceToClosestNode = distance;
        //     }
        // });
        // if (closestNode && distanceToClosestNode < CIRCLE_FOCUS_AREA_SIZE / this.zoomFactor) {
        //     this.focusOnNode(closestNode.id);
        //     return;
        // }
        //
        // // Check if mouse is close enough to a link to focus it
        // let closestLink = null;
        // let distanceToClosestLink = null;
        // this.indexedAllowedRoutes.forEach(allowedRoute => {
        //     const source = allowedRoute.source;
        //     const target = allowedRoute.target;
        //     const distance = distancePointToSegment(x, y, source.x, source.y, target.x, target.y);
        //     if (closestLink == null || distance < distanceToClosestLink) {
        //         closestLink = allowedRoute;
        //         distanceToClosestLink = distance;
        //     }
        // });
        // if (closestLink && distanceToClosestLink < LINK_FOCUS_AREA_SIZE / this.zoomFactor) {
        //     this.focusOnLink(closestLink.id);
        //     return;
        // }
        //
        // // Unfocus everything is mouse is not close to anything
        // this.unFocus();
    }

    handleZoom() {
        this.zoomFactor = d3.event.transform.k;
        this.svg.attr('transform', d3.event.transform);

        this.getContent().forEach(({ type, itemSvgContainer, labelSvgContainer }) => {
            if (type === 'line') {
                // Compensate changes to line width
                itemSvgContainer
                    .selectAll(type)
                    .attr('stroke-width', LINK_WIDTH / this.zoomFactor);
            } else {
                // Compensate changes to shape size
                itemSvgContainer
                    .selectAll(type)
                    .attr('transform', d => `translate(${d.x},${d.y}) scale(${1 / this.zoomFactor})`);

                // Compensate changes to label size
                labelSvgContainer
                    .selectAll('text')
                    .attr('font-size', FONT_SIZE / this.zoomFactor)
                    .attr('letter-spacing', FONT_SPACING / this.zoomFactor)
                    .attr('dy', -FONT_SIZE / this.zoomFactor);
            }
        });
    };

    focusOnNode(nodeId) {
        // if (this.isDragging) {
        //     // Do not focus during drag
        //     return;
        // }
        // if (this.highlightedNodeId !== nodeId) {
        //     this.unFocus();
        //     this.highlightedNodeId = nodeId;
        //     this.onItemFocus(this.indexedPods.get(nodeId).podData);
        // }
        // const isInNeighborhood = (node1Id, node2Id) => {
        //     return node1Id === node2Id
        //         || this.indexedAllowedRoutes.has(d3AllowedRouteIdFromNodeIds(node1Id, node2Id))
        //         || this.indexedAllowedRoutes.has(d3AllowedRouteIdFromNodeIds(node2Id, node1Id));
        // };
        // const isLinkOfNode = (nodeId, link) => {
        //     return link.source.id === nodeId || link.target.id === nodeId;
        // };
        // this.applyFocus(item => isInNeighborhood(itemId, item.id), link => isLinkOfNode(itemId, link));
    };

    focusOnLink(linkId) {
        // if (this.isDragging) {
        //     // Do not focus during drag
        //     return;
        // }
        // const link = this.indexedAllowedRoutes.get(linkId);
        // if (this.highlightedLinkId !== linkId) {
        //     this.unFocus();
        //     this.highlightedLinkId = linkId;
        //     this.onLinkFocus(link.allowedRouteData);
        // }
        // const isNodeOfLink = (itemId, link) => {
        //     return link.source.id === itemId || link.target.id === itemId;
        // };
        // this.applyFocus(item => isNodeOfLink(item.id, link), link => link.id === linkId);
    };

    unFocus() {
        // if (this.highlightedNodeId == null && this.highlightedLinkId == null) {
        //     return;
        // }
        // this.onItemFocus(null);
        // this.onLinkFocus(null);
        // this.highlightedNodeId = null;
        // this.highlightedLinkId = null;
        // this.applyFocus(() => true, () => true);
    };

    applyFocus(shouldFocusNode, shouldFocusLink) {
        // this.itemsContainer.selectAll('circle')
        //     .attr('class', item => shouldFocusNode(item)
        //         ? ifHighlighted(item, 'item-highlight', 'item')
        //         : ifHighlighted(item, 'item-faded-highlight', 'item-faded')
        //     );
        // this.labelsContainer.selectAll('text')
        //     .attr('display', item => shouldFocusNode(item) ? 'block' : 'none');
        // this.serviceLinksContainer.selectAll('line')
        //     .attr('class', link => shouldFocusLink(link) ? 'link' : 'link-faded')
        //     .attr('marker-end', link => shouldFocusLink(link) ? 'url(#arrow)' : 'url(#arrow-faded)');
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
}
