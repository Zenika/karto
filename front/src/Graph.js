import React, { useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import * as d3 from 'd3';

const width = 480;
const height = 250;
const linkWidth = 1;
const nodeSize = 2;
let svg, nodesContainer, linksContainer, simulation;
let zoomFactor = 1;
let d3Pods = [];
let d3AllowedRoutes = [];

function fullName(pod) {
    return `${pod.namespace}/${pod.name}`;
}

function d3PodId(pod) {
    return fullName(pod);
}

function d3AllowedRouteId(allowedRoute) {
    return `${fullName(allowedRoute.sourcePod)}->${fullName(allowedRoute.targetPod)}`;
}

function toD3Pod(pod) {
    const id = d3PodId(pod);
    return { id }
}

function toD3AllowedRoute(allowedRoute) {
    const id = d3AllowedRouteId(allowedRoute);
    const source = fullName(allowedRoute.sourcePod);
    const target = fullName(allowedRoute.targetPod);
    return { id, source, target }
}

function update(pods, allowedRoutes) {
    if (!svg) {
        // Create graph on first call
        svg = d3.select('#graph').append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', [-width / 2, -height / 2, width, height])
            .call(d3.zoom().on('zoom', () => {
                zoomFactor = d3.event.transform.k;
                svg.attr('transform', d3.event.transform);
                nodes.attr('r', nodeSize / zoomFactor); // Compensate changes to node radius
                links.attr('stroke-width', linkWidth / zoomFactor); // Compensate changes to link width
            }))
            .append('g');
        linksContainer = svg.append('g').attr('class', 'linksContainer');
        nodesContainer = svg.append('g').attr('class', 'nodesContainer');
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

    // Update links
    const links = linksContainer
        .selectAll('line')
        .data(d3AllowedRoutes)
        .join('line')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', linkWidth / zoomFactor);

    // Update nodes
    const nodes = nodesContainer
        .selectAll('circle')
        .data(d3Pods)
        .join('circle')
        .attr('fill', 'red')
        .attr('r', nodeSize / zoomFactor);

    if (!simulation) {
        // Create simulation on first call
        simulation = d3.forceSimulation(d3Pods)
            .force('link', d3.forceLink(d3AllowedRoutes).id(d => d.id))
            .force('charge', d3.forceManyBody())
            .force('x', d3.forceX())
            .force('y', d3.forceY());

        simulation.on('tick', () => {
            console.log('tick');
            linksContainer
                .selectAll('line')
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            nodesContainer
                .selectAll('circle')
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
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

const useStyles = makeStyles(() => ({
    root: {
        height: '100%',
        width: '100%',
        overflow: 'hidden'
    }
}));

const Graph = ({ analysisResult: { pods, allowedRoutes } }) => {
    const classes = useStyles();

    useEffect(() => {
        update(pods, allowedRoutes);
    });

    return (
        <div id="graph" className={classes.root}/>
    );
};

export default Graph;
