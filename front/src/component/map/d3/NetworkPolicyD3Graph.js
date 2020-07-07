import * as d3 from 'd3';
import D3Graph from './D3Graph';
import D3GraphLinkLayer from './D3GraphLinkLayer';
import D3GraphItemLayer from './D3GraphItemLayer';
import { CIRCLE_SIZE } from './D3Constants';

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

function d3AllowedRouteIdFromPodIds(pod1Id, pod2Id) {
    return `${pod1Id}->${pod2Id}`;
}

export default class NetworkPolicyD3Graph extends D3Graph {

    constructor() {
        super();
        this.podsLayer = new D3GraphItemLayer({
            name: 'pods',
            element: 'circle',
            dataExtractorFn: analysisResult => analysisResult.pods,
            idFn: d3PodId,
            d3DatumFn: d3Pod,
            sourceDatumFn: d3Pod => d3Pod.podData,
            focusHandlerExtractorFn: focusHandlers => focusHandlers.onPodFocus,
            applyElementCustomAttrs: selection => {
                selection
                    .attr('r', CIRCLE_SIZE);
            }
        });
        this.allowedRoutesLayer = new D3GraphLinkLayer({
            name: 'allowedRoutes',
            element: 'line',
            dataExtractorFn: analysisResult => analysisResult.allowedRoutes,
            idFn: d3AllowedRouteId,
            d3DatumFn: d3AllowedRoute,
            sourceDatumFn: d3AllowedRoute => d3AllowedRoute.allowedRouteData,
            focusHandlerExtractorFn: focusHandlers => focusHandlers.onAllowedRouteFocus
        });
    }

    getItemLayers() {
        return [
            this.podsLayer
        ];
    }

    getLinkLayers() {
        return [
            this.allowedRoutesLayer
        ];
    }

    configureSimulation(simulation) {
        simulation
            .force('x', d3.forceX())
            .force('y', d3.forceY());
    }

    isFocused(layerName, datum) {
        const isNeighbor = (pod1Id, pod2Id) => {
            return this.allowedRoutesLayer.indexedData.has(d3AllowedRouteIdFromPodIds(pod1Id, pod2Id))
                || this.allowedRoutesLayer.indexedData.has(d3AllowedRouteIdFromPodIds(pod2Id, pod1Id));
        };
        const isRouteOfPod = (allowedRoute, podId) => {
            return allowedRoute.source.id === podId || allowedRoute.target.id === podId;
        };
        const isPodOfRoute = (podId, allowedRouteId) => {
            const allowedRoute = this.allowedRoutesLayer.indexedData.get(allowedRouteId);
            return allowedRoute.source.id === podId || allowedRoute.target.id === podId;
        };
        if (!this.focusedDatum) {
            return true;
        }
        if (this.focusedDatum.layerName === this.podsLayer.name) {
            // Current focus is on a pod
            const focusedPodId = this.focusedDatum.id;
            if (layerName === this.podsLayer.name) {
                return datum.id === focusedPodId || isNeighbor(datum.id, focusedPodId);
            } else if (layerName === this.allowedRoutesLayer.name) {
                return isRouteOfPod(datum, focusedPodId);
            }
        } else if (this.focusedDatum.layerName === this.allowedRoutesLayer.name) {
            // Current focus is on a route
            const focusedAllowedRouteId = this.focusedDatum.id;
            if (layerName === this.podsLayer.name) {
                return isPodOfRoute(datum.id, focusedAllowedRouteId);
            } else if (layerName === this.allowedRoutesLayer.name) {
                return datum.id === focusedAllowedRouteId;
            }
        }
        return false;
    }
}
