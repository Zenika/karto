import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';

const GRAPH_WIDTH = 300;
const GRAPH_HEIGHT = 180;
const SPACING = 20;
const DIAMOND_HEIGHT = 5;
const DIAMOND_WIDTH = 8;
const LINK_WIDTH = 0.2;
const NODE_SIZE = 2;
const NODE_FONT_SIZE = 4;
const NODE_FONT_SPACING = 0.1;

function d3PodId(pod) {
    return `${pod.namespace}/${pod.name}`;
}

function d3ServiceId(service) {
    return `${service.namespace}/${service.name}`;
}

function d3ServiceLinkId(service, targetPod) {
    return `${d3ServiceId(service)}->${d3PodId(targetPod)}`;
}

function d3Pod(pod) {
    const id = d3PodId(pod);
    return { id, displayName: pod.displayName, highlighted: pod.highlighted, podData: pod };
}

function d3Service(service) {
    const id = d3ServiceId(service);
    const targetPods = service.targetPods.map(targetPod => d3PodId(targetPod));
    return { id, displayName: service.displayName, targetPods, serviceData: service };
}

function d3ServiceLink(service, targetPod) {
    const id = d3ServiceLinkId(service, targetPod);
    const source = d3ServiceId(service);
    const target = d3PodId(targetPod);
    return { id, source, target };
}

function ifHighlighted(node, classIfHighlighted, classIfNotHighlighted) {
    return node.highlighted ? classIfHighlighted : classIfNotHighlighted;
}

class D3Graph {

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
        this.svg = svgRoot.append('g');
        this.serviceLinksContainer = this.svg.append('g').attr('class', 'linksContainer');
        this.nodesContainer = this.svg.append('g').attr('class', 'nodesContainer');
        this.servicesContainer = this.svg.append('g').attr('class', 'servicesContainer');
        this.podLabelsContainer = this.svg.append('g').attr('class', 'podLabelsContainer');
        this.serviceLabelsContainer = this.svg.append('g').attr('class', 'serviceLabelsContainer');
        this.zoomFactor = 1;
        this.indexedPods = new Map();
        this.indexedPodsToService = new Map();
        this.indexedServices = new Map();
        this.indexedServiceLinks = new Map();
        this.d3Pods = [];
        this.d3Services = [];
        this.d3ServiceLinks = [];
        this.highlightedNodeId = null;
        this.simulation = d3.forceSimulation([])
            .force('link', d3.forceLink([]).id(d => d.id))
            .force('charge', d3.forceManyBody());
        this.simulation.on('tick', () => {
            this.servicesContainer
                .selectAll('polygon')
                .attr('transform', d => `translate(${d.x},${d.y}) scale(${1 / this.zoomFactor})`);
            this.serviceLabelsContainer
                .selectAll('text')
                .attr('transform', d => `translate(${d.x},${d.y})`);
            this.nodesContainer
                .selectAll('circle')
                .attr('transform', d => `translate(${d.x},${d.y}) scale(${1 / this.zoomFactor})`);
            this.podLabelsContainer
                .selectAll('text')
                .attr('transform', d => `translate(${d.x},${d.y})`);
            this.serviceLinksContainer
                .selectAll('line')
                .each(d => {
                    const service = this.indexedServices.get(d.source.id);
                    const pod = this.indexedPods.get(d.target.id);
                    d.x1 = service.x;
                    d.y1 = service.y;
                    d.x2 = pod.x;
                    d.y2 = pod.y;
                })
                .attr('x1', d => d.x1)
                .attr('y1', d => d.y1)
                .attr('x2', d => d.x2)
                .attr('y2', d => d.y2);
        });
    }

    update(analysisResult) {
        // Update data
        this.indexedPodsToService.clear();
        analysisResult.services.forEach((service, i) => {
            service.index = i;
            service.targetPods.forEach(pod => {
                this.indexedPodsToService.set(d3PodId(pod), service);
            });
        });

        let atLeastOneChange = false;

        const newD3Pods = analysisResult.pods.map(pod => {
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

        const newD3Services = analysisResult.services.map(service => {
            const oldService = this.indexedServices.get(d3ServiceId(service));
            if (oldService) {
                // Service was already displayed, keep new attributes and patch with d3 data
                return Object.assign(oldService, d3Service(service));
            } else {
                // Service is new
                atLeastOneChange = true;
                return d3Service(service);
            }
        });
        if (this.d3Services.length !== newD3Services.length) {
            atLeastOneChange = true;
        }
        this.d3Services = newD3Services;
        this.indexedServices.clear();
        this.d3Services.forEach(service =>
            this.indexedServices.set(service.id, service));

        const newD3ServiceLinks = analysisResult.services.map(service => {
            return service.targetPods.map(targetPod => {
                const oldServiceLink = this.indexedServiceLinks.get(d3ServiceLinkId(service, targetPod));
                if (oldServiceLink) {
                    // Service target was already displayed, keep new attributes and patch with d3 data
                    return Object.assign(oldServiceLink, d3ServiceLink(service, targetPod));
                } else {
                    // Service is new
                    atLeastOneChange = true;
                    return d3ServiceLink(service, targetPod);
                }
            });
        }).flat();
        if (this.d3ServiceLinks.length !== newD3ServiceLinks.length) {
            atLeastOneChange = true;
        }
        this.d3ServiceLinks = newD3ServiceLinks;
        this.indexedServiceLinks.clear();
        this.d3ServiceLinks.forEach(serviceLink =>
            this.indexedServiceLinks.set(serviceLink.id, serviceLink));

        if (atLeastOneChange) {
            this.d3Pods.sort((pod1, pod2) => {
                const service1 = this.indexedPodsToService.get(pod1.id);
                const service2 = this.indexedPodsToService.get(pod2.id);
                const service1Index = service1 ? service1.index : -1;
                const service2Index = service2 ? service2.index : -1;
                if (service1Index > service2Index) {
                    return -1;
                } else if (service1Index < service2Index) {
                    return 1;
                } else {
                    return pod1.id.localeCompare(pod2.id);
                }
            });
        }

        // Update circles
        this.nodesContainer
            .selectAll('circle')
            .data(this.d3Pods)
            .join('circle')
            .each((d, i, c) => {
                d.fx = d.x = 5 * SPACING;
                d.fy = d.y = SPACING * (i - (c.length - 1) / 2);
            })
            .attr('class', node => ifHighlighted(node, 'node-highlight', 'node'))
            .attr('r', NODE_SIZE)
            .attr('transform', `scale(${1 / this.zoomFactor})`);

        // Update diamonds
        this.servicesContainer
            .selectAll('polygon')
            .data(this.d3Services)
            .join('polygon')
            .each(d => {
                const targetPods = d.targetPods
                    .map(targetPodId => this.indexedPods.get(targetPodId))
                    .filter(pod => pod != null);
                const targetPodsAvgY = targetPods.reduce((acc, p) => acc + p.y, 0) / targetPods.length;
                d.fx = d.x = 0;
                d.y = targetPodsAvgY;
            })
            .attr('transform', `scale(${1 / this.zoomFactor})`)
            .attr('class', node => ifHighlighted(node, 'node-highlight', 'node'))
            .attr('points', `${-DIAMOND_WIDTH / 2},0 0,${-DIAMOND_HEIGHT / 2} ` +
                `${DIAMOND_WIDTH / 2},0 0,${DIAMOND_HEIGHT / 2}`);

        // Update pod labels
        this.podLabelsContainer
            .selectAll('text')
            .data(this.d3Pods)
            .join('text')
            .text(d => d.displayName)
            .attr('text-anchor', 'middle')
            .attr('font-size', NODE_FONT_SIZE / this.zoomFactor)
            .attr('letter-spacing', NODE_FONT_SPACING / this.zoomFactor)
            .attr('dy', -NODE_FONT_SIZE / this.zoomFactor)
            .attr('class', 'label');

        // Update service labels
        this.serviceLabelsContainer
            // FIXME duplicate with above
            .selectAll('text')
            .data(this.d3Services)
            .join('text')
            .text(d => d.displayName)
            .attr('text-anchor', 'middle')
            .attr('font-size', NODE_FONT_SIZE / this.zoomFactor)
            .attr('letter-spacing', NODE_FONT_SPACING / this.zoomFactor)
            .attr('dy', -NODE_FONT_SIZE / this.zoomFactor)
            .attr('class', 'label');

        // Update links
        this.serviceLinksContainer
            .selectAll('line')
            .data(this.d3ServiceLinks)
            .join('line')
            .attr('marker-end', 'url(#arrow)')
            .attr('class', 'link')
            .attr('stroke-width', LINK_WIDTH / this.zoomFactor);

        // Update simulation
        this.simulation.nodes([...this.d3Pods, ...this.d3Services]);
        this.simulation.force('link').links(this.d3ServiceLinks);
        if (atLeastOneChange) {
            this.simulation.alpha(1).restart();
        }
    }

    handleMouseMove([x, y]) {
        //
    }

    handleZoom() {
        this.zoomFactor = d3.event.transform.k;
        this.svg.attr('transform', d3.event.transform);

        // Compensate changes to node radius
        const nodes = this.nodesContainer.selectAll('circle');
        nodes.attr('transform', d => `translate(${d.x},${d.y}) scale(${1 / this.zoomFactor})`);

        // Compensate changes to circle labels
        const circleLabels = this.podLabelsContainer.selectAll('text');
        circleLabels.attr('font-size', NODE_FONT_SIZE / this.zoomFactor);
        circleLabels.attr('letter-spacing', NODE_FONT_SPACING / this.zoomFactor);
        circleLabels.attr('dy', -NODE_FONT_SIZE / this.zoomFactor);

        // Compensate changes to diamond scale
        const diamonds = this.servicesContainer.selectAll('polygon');
        diamonds.attr('transform', d => `translate(${d.x},${d.y}) scale(${1 / this.zoomFactor})`);

        // Compensate changes to diamond label
        const labels = this.serviceLabelsContainer.selectAll('text');
        labels.attr('font-size', NODE_FONT_SIZE / this.zoomFactor);
        labels.attr('letter-spacing', NODE_FONT_SPACING / this.zoomFactor);
        labels.attr('dy', -NODE_FONT_SIZE / this.zoomFactor);

        // Compensate changes to link width
        const links = this.serviceLinksContainer.selectAll('line');
        links.attr('stroke-width', LINK_WIDTH / this.zoomFactor);
    };
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

const ClusterMap = ({ analysisResult }) => {
    const classes = useStyles();
    const d3Graph = useRef(new D3Graph());

    useEffect(() => d3Graph.current.init(), []);

    useEffect(() => d3Graph.current.update(analysisResult));

    return <div id="graph" className={classes.root}/>;
};

ClusterMap.propTypes = {
    analysisResult: PropTypes.shape({
        pods: PropTypes.arrayOf(PropTypes.shape({
            displayName: PropTypes.string.isRequired,
            name: PropTypes.string.isRequired,
            namespace: PropTypes.string.isRequired
        })).isRequired,
        services: PropTypes.arrayOf(PropTypes.shape({
            name: PropTypes.string.isRequired,
            namespace: PropTypes.string.isRequired,
            targetPods: PropTypes.arrayOf(PropTypes.shape({
                name: PropTypes.string.isRequired,
                namespace: PropTypes.string.isRequired
            })).isRequired
        }))
    }).isRequired
};

export default ClusterMap;
