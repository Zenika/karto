import * as d3 from 'd3';
import D3Graph from './D3Graph';

const CIRCLE_SIZE = 2;
const SPACING = 20;

function d3PodId(pod) {
    return `${pod.namespace}/${pod.name}`;
}

function d3Pod(pod) {
    const id = d3PodId(pod);
    return { id, displayName: pod.displayName, highlighted: pod.highlighted, podData: pod };
}

function d3AllowedRouteId(allowedRoute) {
    return `${d3PodId(allowedRoute.sourcePod)}->${d3PodId(allowedRoute.targetPod)}`;
}

function d3AllowedRoute(allowedRoute) {
    const id = d3AllowedRouteId(allowedRoute);
    const source = d3PodId(allowedRoute.sourcePod);
    const target = d3PodId(allowedRoute.targetPod);
    return { id, source, target, allowedRouteData: allowedRoute };
}

export default class D3NetworkPolicyGraph extends D3Graph {

    initInternal() {
        this.allowedRoutes = {
            type: 'line',
            data: [],
            indexedData: new Map(),
            extractorFn: analysisResult => analysisResult.allowedRoutes,
            idFn: d3AllowedRouteId,
            datumFn: d3AllowedRoute,
            itemSvgContainer: this.svg.append('g').attr('class', 'allowedRoutesContainer')
        };
        this.pods = {
            type: 'circle',
            data: [],
            indexedData: new Map(),
            extractorFn: analysisResult => analysisResult.pods,
            idFn: d3PodId,
            datumFn: d3Pod,
            itemSvgContainer: this.svg.append('g').attr('class', 'podsContainer'),
            labelSvgContainer: this.svg.append('g').attr('class', 'podLabelsContainer'),
            applyCustomAttributes: selection => {
                selection
                    .attr('r', CIRCLE_SIZE);
            }
        };
    }

    getContent() {
        return [
            this.pods,
            this.allowedRoutes
        ];
    }

    configureSimulation() {
        return d3.forceSimulation([])
            .force('link', d3.forceLink([]).id(d => d.id))
            .force('charge', d3.forceManyBody())
            .force('x', d3.forceX())
            .force('y', d3.forceY());
    }

    sortData() {
        // Nothing to do
    }
}
