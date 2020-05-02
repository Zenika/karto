import React from 'react';
import * as d3 from 'd3';
import PropTypes from 'prop-types';
import { createStyles, withStyles } from '@material-ui/core';

const GRAPH_WIDTH = 300;
const GRAPH_HEIGHT = 180;
const LINK_WIDTH = 0.1;
const NODE_SIZE = 2;
const NODE_FONT_SIZE = 4;
const NODE_FONT_SPACING = 0.1;

const styles = createStyles(theme => ({
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

class Graph extends React.Component {

    init() {
        this.svg = d3.select('#graph').append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', [-GRAPH_WIDTH / 2, -GRAPH_HEIGHT / 2, GRAPH_WIDTH, GRAPH_HEIGHT])
            .call(d3.zoom().on('zoom', () => this.handleZoom()))
            .append('g');
        this.linksContainer = this.svg.append('g').attr('class', 'linksContainer');
        this.nodesContainer = this.svg.append('g').attr('class', 'nodesContainer');
        this.labelsContainer = this.svg.append('g').attr('class', 'labelsContainer');
        this.zoomFactor = 1;
        this.d3Pods = [];
        this.d3AllowedRoutes = [];
        this.simulation = d3.forceSimulation(this.d3Pods)
            .force('link', d3.forceLink(this.d3AllowedRoutes).id(d => d.id))
            .force('charge', d3.forceManyBody())
            .force('x', d3.forceX())
            .force('y', d3.forceY());
        this.simulation.on('tick', () => {
            console.log('tick');
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
        const indexedPods = new Map();
        this.d3Pods.forEach(pod => indexedPods.set(pod.id, pod));
        const newD3Pods = this.props.analysisResult.pods.map(pod => {
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
        if (this.d3Pods.length !== newD3Pods.length) {
            atLeastOneChange = true;
        }
        this.d3Pods = newD3Pods;

        const indexedAllowedRoutes = new Map();
        this.d3AllowedRoutes.forEach(allowedRoute => indexedAllowedRoutes.set(allowedRoute.id, allowedRoute));
        let newD3AllowedRoutes = this.props.analysisResult.allowedRoutes.map(allowedRoute => {
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
        if (this.d3AllowedRoutes.length !== newD3AllowedRoutes.length) {
            atLeastOneChange = true;
        }
        this.d3AllowedRoutes = newD3AllowedRoutes;

        // Update nodes
        this.nodesContainer
            .selectAll('circle')
            .data(this.d3Pods)
            .join('circle')
            .attr('class', 'node')
            .attr('r', NODE_SIZE / this.zoomFactor);

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
            .attr('class', 'link')
            .attr('stroke-width', LINK_WIDTH / this.zoomFactor);

        // Update simulation
        this.simulation.nodes(this.d3Pods);
        this.simulation.force('link').links(this.d3AllowedRoutes);
        if (atLeastOneChange) {
            this.simulation.alpha(1).restart();
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

    componentDidMount() {
        this.init();
        this.update();
    }

    componentDidUpdate() {
        console.log('update');
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
