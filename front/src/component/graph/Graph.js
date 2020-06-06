import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';

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
    return { id, displayName: pod.displayName, highlighted: pod.highlighted, podData: pod };
}

function d3AllowedRoute(allowedRoute) {
    const id = d3AllowedRouteId(allowedRoute);
    const source = d3PodId(allowedRoute.sourcePod);
    const target = d3PodId(allowedRoute.targetPod);
    return { id, source, target };
}

function ifHighlighted(node, classIfHighlighted, classIfNotHighlighted) {
    return node.highlighted ? classIfHighlighted : classIfNotHighlighted;
}

const useStyles = makeStyles(theme => ({
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

const Graph = ({ analysisResult, onPodFocus }) => {
    const classes = useStyles();
    const svg = useRef();
    const linksContainer = useRef();
    const nodesContainer = useRef();
    const labelsContainer = useRef();
    const zoomFactor = useRef();
    const indexedPods = useRef();
    const indexedAllowedRoutes = useRef();
    const d3Pods = useRef();
    const d3AllowedRoutes = useRef();
    const highlightedNodeId = useRef();
    const isDragging = useRef(false);
    const simulation = useRef();

    const handleZoom = () => {
        zoomFactor.current = d3.event.transform.k;
        svg.current.attr('transform', d3.event.transform);

        // Compensate changes to node radius
        const nodes = nodesContainer.current.selectAll('circle');
        nodes.attr('r', NODE_SIZE / zoomFactor.current);

        // Compensate changes to node label
        const labels = labelsContainer.current.selectAll('text');
        labels.attr('font-size', NODE_FONT_SIZE / zoomFactor.current);
        labels.attr('letter-spacing', NODE_FONT_SPACING / zoomFactor.current);
        labels.attr('dy', -NODE_FONT_SIZE / zoomFactor.current);

        // Compensate changes to link width
        const links = linksContainer.current.selectAll('line');
        links.attr('stroke-width', LINK_WIDTH / zoomFactor.current);
    };

    const enableNodeFocus = (nodeId) => {
        if (isDragging.current) {
            // Do not focus during drag
            return;
        }
        if (highlightedNodeId.current !== nodeId) {
            highlightedNodeId.current = nodeId;
            onPodFocus(indexedPods.current.get(nodeId).podData);
        }
        const isInNeighborhood = (node1Id, node2Id) => {
            return node1Id === node2Id || indexedAllowedRoutes.current.has(d3AllowedRouteIdFromNodeIds(node1Id, node2Id))
                || indexedAllowedRoutes.current.has(d3AllowedRouteIdFromNodeIds(node2Id, node1Id));
        };
        const isLinkOfNode = (nodeId, link) => {
            return link.source.id === nodeId || link.target.id === nodeId;
        };
        nodesContainer.current.selectAll('circle')
            .attr('class', node => isInNeighborhood(nodeId, node.id)
                ? ifHighlighted(node, 'node-highlight', 'node')
                : ifHighlighted(node, 'node-faded-highlight', 'node-faded')
            );
        labelsContainer.current.selectAll('text')
            .attr('display', node => isInNeighborhood(nodeId, node.id) ? 'block' : 'none');
        linksContainer.current.selectAll('line')
            .attr('class', link => isLinkOfNode(nodeId, link) ? 'link' : 'link-faded')
            .attr('marker-end', link => isLinkOfNode(nodeId, link) ? 'url(#arrow)' : 'url(#arrow-faded)');
    };
    const disableNodeFocus = () => {
        onPodFocus(null);
        highlightedNodeId.current = null;
        nodesContainer.current.selectAll('circle')
            .attr('class', node => ifHighlighted(node, 'node-highlight', 'node'));
        labelsContainer.current.selectAll('text')
            .attr('display', 'block');
        linksContainer.current.selectAll('line')
            .attr('class', 'link')
            .attr('marker-end', 'url(#arrow)');
    };

    const handleDragStart = (node) => {
        if (d3.event.active === 0) {
            // Start of first concurrent drag event
            disableNodeFocus();
            isDragging.current = true;
            simulation.current.alphaTarget(0.3).restart();
        }
        node.fx = node.x;
        node.fy = node.y;
    };
    const handleDragUpdate = (node) => {
        node.fx = d3.event.x;
        node.fy = d3.event.y;
    };
    const handleDragEnd = () => {
        if (d3.event.active === 0) {
            // End of last concurrent drag event
            isDragging.current = false;
            simulation.current.alphaTarget(0);
        }
    };

    useEffect(() => {
        const svgRoot = d3.select('#graph').append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', [-GRAPH_WIDTH / 2, -GRAPH_HEIGHT / 2, GRAPH_WIDTH, GRAPH_HEIGHT])
            .call(d3.zoom().on('zoom', () => handleZoom()));
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
        svg.current = svgRoot.append('g');
        linksContainer.current = svg.current.append('g').attr('class', 'linksContainer');
        nodesContainer.current = svg.current.append('g').attr('class', 'nodesContainer');
        labelsContainer.current = svg.current.append('g').attr('class', 'labelsContainer');
        zoomFactor.current = 1;
        indexedPods.current = new Map();
        indexedAllowedRoutes.current = new Map();
        d3Pods.current = [];
        d3AllowedRoutes.current = [];
        highlightedNodeId.current = null;
        simulation.current = d3.forceSimulation(d3Pods.current)
            .force('link', d3.forceLink(d3AllowedRoutes.current).id(d => d.id))
            .force('charge', d3.forceManyBody())
            .force('x', d3.forceX())
            .force('y', d3.forceY());
        simulation.current.on('tick', () => {
            nodesContainer.current
                .selectAll('circle')
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
            linksContainer.current
                .selectAll('line')
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            labelsContainer.current
                .selectAll('text')
                .attr('x', d => d.x)
                .attr('y', d => d.y);
        });
    }, []);

    useEffect(() => {
        // Update data
        let atLeastOneChange = false;

        const newD3Pods = analysisResult.pods.map(pod => {
            const oldPod = indexedPods.current.get(d3PodId(pod));
            if (oldPod) {
                // Pod was already displayed, keep new attributes and patch with d3 data
                return Object.assign(oldPod, d3Pod(pod));
            } else {
                // Pod is new
                atLeastOneChange = true;
                return d3Pod(pod);
            }
        });
        if (d3Pods.current.length !== newD3Pods.length) {
            atLeastOneChange = true;
        }
        d3Pods.current = newD3Pods;
        indexedPods.current.clear();
        d3Pods.current.forEach(pod => indexedPods.current.set(pod.id, pod));

        const newD3AllowedRoutes = analysisResult.allowedRoutes.map(allowedRoute => {
            const oldAllowedRoute = indexedAllowedRoutes.current.get(d3AllowedRouteId(allowedRoute));
            if (oldAllowedRoute) {
                // AllowedRoute was already displayed, keep new attributes and patch with d3 data
                return Object.assign(oldAllowedRoute, d3AllowedRoute(allowedRoute));
            } else {
                // AllowedRoute is new
                atLeastOneChange = true;
                return d3AllowedRoute(allowedRoute);
            }
        });
        if (d3AllowedRoutes.current.length !== newD3AllowedRoutes.length) {
            atLeastOneChange = true;
        }
        d3AllowedRoutes.current = newD3AllowedRoutes;
        indexedAllowedRoutes.current.clear();
        d3AllowedRoutes.current.forEach(allowedRoute => indexedAllowedRoutes.current.set(allowedRoute.id, allowedRoute));

        // Update nodes
        nodesContainer.current
            .selectAll('circle')
            .data(d3Pods.current)
            .join('circle')
            .attr('class', node => ifHighlighted(node, 'node-highlight', 'node'))
            .attr('r', NODE_SIZE / zoomFactor.current)
            .on('mouseover', d => enableNodeFocus(d.id))
            .on('mouseout', () => disableNodeFocus())
            .call(d3.drag()
                .on('start', d => handleDragStart(d))
                .on('drag', d => handleDragUpdate(d))
                .on('end', () => handleDragEnd()));

        // Update labels
        labelsContainer.current
            .selectAll('text')
            .data(d3Pods.current)
            .join('text')
            .text(d => d.displayName)
            .attr('text-anchor', 'middle')
            .attr('font-size', NODE_FONT_SIZE / zoomFactor.current)
            .attr('letter-spacing', NODE_FONT_SPACING / zoomFactor.current)
            .attr('dy', -NODE_FONT_SIZE / zoomFactor.current)
            .attr('class', 'label');

        // Update links
        linksContainer.current
            .selectAll('line')
            .data(d3AllowedRoutes.current)
            .join('line')
            .attr('marker-end', 'url(#arrow)')
            .attr('class', 'link')
            .attr('stroke-width', LINK_WIDTH / zoomFactor.current);

        // Update simulation
        simulation.current.nodes(d3Pods.current);
        simulation.current.force('link').links(d3AllowedRoutes.current);
        if (atLeastOneChange) {
            simulation.current.alpha(1).restart();
        }

        // Restore highlight if still active
        if (highlightedNodeId.current) {
            enableNodeFocus(highlightedNodeId.current);
        }
    });

    return <div id="graph" className={classes.root}/>;
};

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
    }).isRequired,
    onPodFocus: PropTypes.func.isRequired
};

export default Graph;
