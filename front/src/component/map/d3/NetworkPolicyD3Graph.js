import * as d3 from 'd3';
import D3Graph from './D3Graph';
import D3GraphLinkLayer from './D3GraphLinkLayer';
import D3GraphItemLayer from './D3GraphItemLayer';

function d3PodId(pod) {
    return `${pod.namespace}/${pod.name}`;
}

function d3Pod(pod) {
    const id = d3PodId(pod);
    return { id, displayName: pod.displayName, highlighted: pod.highlighted, sourceData: pod };
}

function d3AllowedRouteId(allowedRoute) {
    return `${d3PodId(allowedRoute.sourcePod)}->${d3PodId(allowedRoute.targetPod)}`;
}

function d3AllowedRoute(allowedRoute) {
    const id = d3AllowedRouteId(allowedRoute);
    const source = d3PodId(allowedRoute.sourcePod);
    const target = d3PodId(allowedRoute.targetPod);
    return { id, source, target, sourceData: allowedRoute };
}

function d3AllowedRouteIdFromPodIds(pod1Id, pod2Id) {
    return `${pod1Id}->${pod2Id}`;
}

export default class NetworkPolicyD3Graph extends D3Graph {

    constructor() {
        super();
        this.podsLayer = new D3GraphItemLayer({
            name: 'pods',
            svgElement: 'circle',
            dataExtractor: dataSet => dataSet.podIsolations,
            d3IdFn: d3PodId,
            d3DatumMapper: d3Pod,
            focusHandler: 'onPodFocus',
            svgElementAttributesApplier: selection => {
                selection
                    .attr('aria-label', 'pod')
                    .attr('r', 2);
            }
        });
        this.allowedRoutesLayer = new D3GraphLinkLayer({
            name: 'allowedRoutes',
            svgElement: 'line',
            dataExtractor: dataSet => dataSet.allowedRoutes,
            d3IdFn: d3AllowedRouteId,
            d3DatumMapper: d3AllowedRoute,
            focusHandler: 'onAllowedRouteFocus',
            svgElementAttributesApplier: selection => {
                selection
                    .attr('aria-label', 'allowed route');
            }
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

    isFocused(currentTarget, candidateLayerName, candidateDatum) {
        if (super.isFocused(currentTarget, candidateLayerName, candidateDatum)) {
            return true;
        }
        const currentTargetId = currentTarget.id;
        const currentTargetLayerName = currentTarget.layerName;
        const candidateDatumId = candidateDatum.id;
        if (currentTargetLayerName === this.podsLayer.name) {
            return this.isFocusedWhenTargetIsPod(currentTargetId, candidateLayerName, candidateDatumId);
        } else if (currentTargetLayerName === this.allowedRoutesLayer.name) {
            return this.isFocusedWhenTargetIsAllowedRoute(currentTargetId, candidateLayerName, candidateDatumId);
        }
        return false;
    }

    isFocusedWhenTargetIsPod(targetPodId, candidateLayer, candidateDatumId) {
        if (candidateLayer === this.podsLayer.name) {
            return this.isNeighbor(candidateDatumId, targetPodId);
        } else if (candidateLayer === this.allowedRoutesLayer.name) {
            return this.isPodOfRoute(targetPodId, candidateDatumId);
        }
        return false;
    }

    isFocusedWhenTargetIsAllowedRoute(allowedRouteId, candidateLayer, candidateDatumId) {
        if (candidateLayer === this.podsLayer.name) {
            return this.isPodOfRoute(candidateDatumId, allowedRouteId);
        }
        return false;
    }

    isNeighbor(pod1Id, pod2Id) {
        return this.allowedRoutesLayer.indexedData.has(d3AllowedRouteIdFromPodIds(pod1Id, pod2Id))
            || this.allowedRoutesLayer.indexedData.has(d3AllowedRouteIdFromPodIds(pod2Id, pod1Id));
    };

    isPodOfRoute(podId, allowedRouteId) {
        const allowedRoute = this.allowedRoutesLayer.indexedData.get(allowedRouteId);
        return allowedRoute.source.id === podId || allowedRoute.target.id === podId;
    };
}
