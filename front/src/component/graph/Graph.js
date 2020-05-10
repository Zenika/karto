import React from 'react';
import * as d3 from 'd3';
import PropTypes from 'prop-types';
import { createStyles, withStyles } from '@material-ui/core';

const GRAPH_WIDTH = 300;
const GRAPH_HEIGHT = 180;
const LINK_WIDTH = 0.2;
const NODE_SIZE = 2;
const NODE_FONT_SIZE = 4;
const NODE_FONT_SPACING = 0.1;

function d3PodId(pod) {
    return `${pod.namespace}/${pod.name}`;
}

function d3AllowedRouteId(allowedRoute) {
    return `${d3PodId(allowedRoute.sourcePod)}->${d3PodId(allowedRoute.targetPod)}`;
}

function d3AllowedRouteIdFromNodeIds(pod1Id, pod2Id) {
    return `${pod1Id}->${pod2Id}`;
}

function d3Pod(pod) {
    const id = d3PodId(pod);
    return { id, displayName: pod.displayName, highlighted: pod.highlighted }
}

function d3AllowedRoute(allowedRoute) {
    const id = d3AllowedRouteId(allowedRoute);
    const source = d3PodId(allowedRoute.sourcePod);
    const target = d3PodId(allowedRoute.targetPod);
    return { id, source, target }
}

const styles = createStyles(theme => ({
    root: {
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        '& .node': {
            fill: theme.palette.secondary.main
        },
        '& .node-highlight': {
            fill: theme.palette.warning.main
        },
        '& .node-faded': {
            fill: theme.palette.secondary.dark
        },
        '& .node-faded-highlight': {
            fill: theme.palette.warning.dark
        },
        '& .label': {
            fill: theme.palette.text.primary,
            fontWeight: 100,
            cursor: 'default',
            pointerEvents: 'none'
        },
        '& .link': {
            stroke: theme.palette.primary.main
        },
        '& .link-faded': {
            stroke: theme.palette.primary.dark
        },
        '& .link-arrow': {
            fill: theme.palette.primary.main
        },
        '& .link-arrow-faded': {
            fill: theme.palette.primary.dark
        }
    }
}));

function ifHighlighted(node, classIfHighlighted, classIfNotHighlighted) {
    return node.highlighted ? classIfHighlighted : classIfNotHighlighted;
}

class Graph extends React.Component {

    init() {
        const svgRoot = d3.select('#graph').append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', [-GRAPH_WIDTH / 2, -GRAPH_HEIGHT / 2, GRAPH_WIDTH, GRAPH_HEIGHT])
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
        this.svg = svgRoot.append('g');
        this.linksContainer = this.svg.append('g').attr('class', 'linksContainer');
        this.nodesContainer = this.svg.append('g').attr('class', 'nodesContainer');
        this.labelsContainer = this.svg.append('g').attr('class', 'labelsContainer');
        this.zoomFactor = 1;
        this.indexedPods = new Map();
        this.indexedAllowedRoutes = new Map();
        this.d3Pods = [];
        this.d3AllowedRoutes = [];
        this.highlightedNodeId = null;
        this.simulation = d3.forceSimulation(this.d3Pods)
            .force('link', d3.forceLink(this.d3AllowedRoutes).id(d => d.id))
            .force('charge', d3.forceManyBody())
            .force('x', d3.forceX())
            .force('y', d3.forceY());
        this.simulation.on('tick', () => {
            this.nodesContainer
                .selectAll('circle')
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
            this.linksContainer
                .selectAll('line')
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            this.labelsContainer
                .selectAll('text')
                .attr('x', d => d.x)
                .attr('y', d => d.y);
        });
    }

    update() {
        // Update data
        let atLeastOneChange = false;

        const newD3Pods = this.props.analysisResult.pods.map(pod => {
            const oldPod = this.indexedPods.get(d3PodId(pod));
            if (oldPod) {
                // Pod was already displayed, keep new attributes and patch with d3 data
                return Object.assign(oldPod, d3Pod(pod));
            } else {
                // Pod is new
                atLeastOneChange = true;
                return d3Pod(pod);
            }
        });
        if (this.d3Pods.length !== newD3Pods.length) {
            atLeastOneChange = true;
        }
        this.d3Pods = newD3Pods;
        this.indexedPods.clear();
        this.d3Pods.forEach(pod => this.indexedPods.set(pod.id, pod));

        const newD3AllowedRoutes = this.props.analysisResult.allowedRoutes.map(allowedRoute => {
            const oldAllowedRoute = this.indexedAllowedRoutes.get(d3AllowedRouteId(allowedRoute));
            if (oldAllowedRoute) {
                // AllowedRoute was already displayed, keep new attributes and patch with d3 data
                return Object.assign(oldAllowedRoute, d3AllowedRoute(allowedRoute));
            } else {
                // AllowedRoute is new
                atLeastOneChange = true;
                return d3AllowedRoute(allowedRoute);
            }
        });
        if (this.d3AllowedRoutes.length !== newD3AllowedRoutes.length) {
            atLeastOneChange = true;
        }
        this.d3AllowedRoutes = newD3AllowedRoutes;
        this.indexedAllowedRoutes.clear();
        this.d3AllowedRoutes.forEach(allowedRoute => this.indexedAllowedRoutes.set(allowedRoute.id, allowedRoute));

        // Update nodes
        this.nodesContainer
            .selectAll('circle')
            .data(this.d3Pods)
            .join('circle')
            .attr('class', node => ifHighlighted(node, 'node-highlight', 'node'))
            .attr('r', NODE_SIZE / this.zoomFactor)
            .on('mouseover', () => this.focus(d3.select(d3.event.target).datum().id))
            .on('mouseout', () => this.unFocus());

        // Update labels
        this.labelsContainer
            .selectAll('text')
            .data(this.d3Pods)
            .join('text')
            .text(d => d.displayName)
            .attr('text-anchor', 'middle')
            .attr('font-size', NODE_FONT_SIZE / this.zoomFactor)
            .attr('letter-spacing', NODE_FONT_SPACING / this.zoomFactor)
            .attr('dy', -NODE_FONT_SIZE / this.zoomFactor)
            .attr('class', 'label');

        // Update links
        this.linksContainer
            .selectAll('line')
            .data(this.d3AllowedRoutes)
            .join('line')
            .attr('marker-end', 'url(#arrow)')
            .attr('class', 'link')
            .attr('stroke-width', LINK_WIDTH / this.zoomFactor);

        // Update simulation
        this.simulation.nodes(this.d3Pods);
        this.simulation.force('link').links(this.d3AllowedRoutes);
        if (atLeastOneChange) {
            this.simulation.alpha(1).restart();
        }

        // Restore highlight if still active
        if (this.highlightedNodeId) {
            this.focus(this.highlightedNodeId);
        }
    }

    handleZoom() {
        this.zoomFactor = d3.event.transform.k;
        this.svg.attr('transform', d3.event.transform);

        // Compensate changes to node radius
        const nodes = this.nodesContainer.selectAll('circle');
        nodes.attr('r', NODE_SIZE / this.zoomFactor);

        // Compensate changes to node label
        const labels = this.labelsContainer.selectAll('text');
        labels.attr('font-size', NODE_FONT_SIZE / this.zoomFactor);
        labels.attr('letter-spacing', NODE_FONT_SPACING / this.zoomFactor);
        labels.attr('dy', -NODE_FONT_SIZE / this.zoomFactor);

        // Compensate changes to link width
        const links = this.linksContainer.selectAll('line');
        links.attr('stroke-width', LINK_WIDTH / this.zoomFactor);
    }

    focus(nodeId) {
        this.highlightedNodeId = nodeId;
        const isInNeighborhood = (node1Id, node2Id) => {
            return node1Id === node2Id || this.indexedAllowedRoutes.has(d3AllowedRouteIdFromNodeIds(node1Id, node2Id))
                || this.indexedAllowedRoutes.has(d3AllowedRouteIdFromNodeIds(node2Id, node1Id));
        };
        const isLinkOfNode = (nodeId, link) => {
            return link.source.id === nodeId || link.target.id === nodeId;
        };
        this.nodesContainer.selectAll('circle')
            .attr('class', node => isInNeighborhood(nodeId, node.id)
                ? ifHighlighted(node, 'node-highlight', 'node')
                : ifHighlighted(node, 'node-faded-highlight', 'node-faded')
            );
        this.labelsContainer.selectAll('text')
            .attr('display', node => isInNeighborhood(nodeId, node.id) ? 'block' : 'none');
        this.linksContainer.selectAll('line')
            .attr('class', link => isLinkOfNode(nodeId, link) ? 'link' : 'link-faded')
            .attr('marker-end', link => isLinkOfNode(nodeId, link) ? 'url(#arrow)' : 'url(#arrow-faded)');
    }

    unFocus() {
        this.highlightedNodeId = null;
        this.nodesContainer.selectAll('circle')
            .attr('class', node => ifHighlighted(node, 'node-highlight', 'node'));
        this.labelsContainer.selectAll('text')
            .attr('display', 'block');
        this.linksContainer.selectAll('line')
            .attr('class', 'link')
            .attr('marker-end', 'url(#arrow)');
    }

    componentDidMount() {
        this.init();
        this.update();
    }

    componentDidUpdate() {
        this.update();
    }

    render() {
        const { classes } = this.props;
        return <div id="graph" className={classes.root}/>;
    }
}

Graph.propTypes = {
    analysisResult: PropTypes.shape({
        pods: PropTypes.arrayOf(PropTypes.shape({
            displayName: PropTypes.string.isRequired,
            name: PropTypes.string.isRequired,
            namespace: PropTypes.string.isRequired
        })).isRequired,
        allowedRoutes: PropTypes.arrayOf(PropTypes.shape({
            sourcePod: PropTypes.shape({
                name: PropTypes.string.isRequired,
                namespace: PropTypes.string.isRequired
            }).isRequired,
            targetPod: PropTypes.shape({
                name: PropTypes.string.isRequired,
                namespace: PropTypes.string.isRequired
            }).isRequired
        })).isRequired
    }).isRequired
};

export default withStyles(styles, { withTheme: true })(Graph);
