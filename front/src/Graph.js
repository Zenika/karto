import React, { useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import * as d3 from 'd3';
import PropTypes from 'prop-types';

const useStyles = makeStyles(theme => ({
    root: {
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        '& .node': {
            fill: theme.palette.secondary.main
        },
        '& .label': {
            fill: theme.palette.text.primary,
            fontWeight: 100,
            cursor: 'default'
        },
        '& .link': {
            stroke: theme.palette.primary.main
        }
    }
}));

const width = 300;
const height = 180;
const linkWidth = 0.1;
const nodeSize = 2;
const nodeFontSize = 4;
const nodeFontSpacing = 0.1;
let svg, nodesContainer, linksContainer, labelsContainer, simulation;
let zoomFactor = 1;
let d3Pods = [];
let d3AllowedRoutes = [];

function d3PodId(pod) {
    return `${pod.namespace}/${pod.name}`;
}

function d3AllowedRouteId(allowedRoute) {
    return `${d3PodId(allowedRoute.sourcePod)}->${d3PodId(allowedRoute.targetPod)}`;
}

function toD3Pod(pod) {
    const id = d3PodId(pod);
    return { id, displayName: pod.displayName }
}

function toD3AllowedRoute(allowedRoute) {
    const id = d3AllowedRouteId(allowedRoute);
    const source = d3PodId(allowedRoute.sourcePod);
    const target = d3PodId(allowedRoute.targetPod);
    return { id, source, target }
}

function redraw(pods, allowedRoutes) {
    if (!svg) {
        // Create graph on first call
        svg = d3.select('#graph').append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', [-width / 2, -height / 2, width, height])
            .call(d3.zoom().on('zoom', () => {
                zoomFactor = d3.event.transform.k;
                svg.attr('transform', d3.event.transform);

                // Compensate changes to node radius
                const nodes = nodesContainer.selectAll('circle');
                nodes.attr('r', nodeSize / zoomFactor);

                // Compensate changes to node label
                const labels = labelsContainer.selectAll('text');
                labels.attr('font-size', nodeFontSize / zoomFactor);
                labels.attr('letter-spacing', nodeFontSpacing / zoomFactor);
                labels.attr('dy', -nodeFontSize / zoomFactor);

                // Compensate changes to link width
                const links = linksContainer.selectAll('line');
                links.attr('stroke-width', linkWidth / zoomFactor);
            }))
            .append('g');
        linksContainer = svg.append('g').attr('class', 'linksContainer');
        nodesContainer = svg.append('g').attr('class', 'nodesContainer');
        labelsContainer = svg.append('g').attr('class', 'labelsContainer');
    }

    // Update data
    let atLeastOneChange = false;
    const indexedPods = new Map();
    d3Pods.forEach(pod => indexedPods.set(pod.id, pod));
    const newD3Pods = pods.map(pod => {
        const oldPod = indexedPods.get(d3PodId(pod));
        if (oldPod) {
            // Pod was already displayed, keep new attributes and patch with d3 data
            return Object.assign(oldPod, toD3Pod(pod));
        } else {
            // Pod is new
            atLeastOneChange = true;
            return toD3Pod(pod);
        }
    });
    if (d3Pods.length !== newD3Pods.length) {
        atLeastOneChange = true;
    }
    d3Pods = newD3Pods;

    const indexedAllowedRoutes = new Map();
    d3AllowedRoutes.forEach(allowedRoute => indexedAllowedRoutes.set(allowedRoute.id, allowedRoute));
    let newD3AllowedRoutes = allowedRoutes.map(allowedRoute => {
        const oldAllowedRoute = indexedAllowedRoutes.get(d3AllowedRouteId(allowedRoute));
        if (oldAllowedRoute) {
            // AllowedRoute was already displayed, keep new attributes and patch with d3 data
            return Object.assign(oldAllowedRoute, toD3AllowedRoute(allowedRoute));
        } else {
            // AllowedRoute is new
            atLeastOneChange = true;
            return toD3AllowedRoute(allowedRoute);
        }
    });
    if (d3AllowedRoutes.length !== newD3AllowedRoutes.length) {
        atLeastOneChange = true;
    }
    d3AllowedRoutes = newD3AllowedRoutes;

    // Update nodes
    nodesContainer
        .selectAll('circle')
        .data(d3Pods)
        .join('circle')
        .attr('class', 'node')
        .attr('r', nodeSize / zoomFactor);

    // Update labels
    labelsContainer
        .selectAll('text')
        .data(d3Pods)
        .join('text')
        .text(d => d.displayName)
        .attr('text-anchor', 'middle')
        .attr('font-size', nodeFontSize / zoomFactor)
        .attr('letter-spacing', nodeFontSpacing / zoomFactor)
        .attr('dy', -nodeFontSize / zoomFactor)
        .attr('class', 'label');

    // Update links
    linksContainer
        .selectAll('line')
        .data(d3AllowedRoutes)
        .join('line')
        .attr('class', 'link')
        .attr('stroke-width', linkWidth / zoomFactor);

    if (!simulation) {
        // Create simulation on first call
        simulation = d3.forceSimulation(d3Pods)
            .force('link', d3.forceLink(d3AllowedRoutes).id(d => d.id))
            .force('charge', d3.forceManyBody())
            .force('x', d3.forceX())
            .force('y', d3.forceY());

        simulation.on('tick', () => {
            console.log('tick');
            nodesContainer
                .selectAll('circle')
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
            linksContainer
                .selectAll('line')
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            labelsContainer
                .selectAll('text')
                .attr('x', d => d.x)
                .attr('y', d => d.y);
        });
    } else {
        // Update simulation
        simulation.nodes(d3Pods);
        simulation.force('link').links(d3AllowedRoutes);
        if (atLeastOneChange) {
            simulation.alpha(1).restart();
        }
    }
}

const Graph = ({ analysisResult: { pods, allowedRoutes } }) => {
    const classes = useStyles();

    useEffect(() => {
        redraw(pods, allowedRoutes);
    });

    return (
        <div id="graph" className={classes.root}/>
    );
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
    }).isRequired
};

export default Graph;
