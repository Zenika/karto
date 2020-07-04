import D3Graph from './d3/D3Graph';
import D3GraphLinkLayer from './d3/D3GraphLinkLayer';
import D3GraphItemLayer from './d3/D3GraphItemLayer';
import { CIRCLE_SIZE, DIAMOND_HEIGHT, DIAMOND_WIDTH, SPACING } from './d3/D3Constants';

function d3PodId(pod) {
    return `${pod.namespace}/${pod.name}`;
}

function d3ServiceId(service) {
    return `${service.namespace}/${service.name}`;
}

function d3ServiceLinkId({ service, targetPod }) {
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

function d3ServiceLink({ service, targetPod }) {
    const id = d3ServiceLinkId({ service, targetPod });
    const source = d3ServiceId(service);
    const target = d3PodId(targetPod);
    return { id, source, target, serviceData: service };
}

export default class ClusterD3Graph extends D3Graph {

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
                    .attr('r', CIRCLE_SIZE)
                    .each((d, i, c) => {
                        d.fx = d.x = 0;
                        d.fy = d.y = SPACING * (i - (c.length - 1) / 2);
                    });
            }
        });
        this.servicesLayer = new D3GraphItemLayer({
            name: 'services',
            element: 'polygon',
            dataExtractorFn: analysisResult => analysisResult.services,
            idFn: d3ServiceId,
            d3DatumFn: d3Service,
            sourceDatumFn: d3Service => d3Service.serviceData,
            focusHandlerExtractorFn: focusHandlers => focusHandlers.onServiceFocus,
            applyElementCustomAttrs: selection => {
                selection
                    .attr('points', `${-DIAMOND_WIDTH / 2},0 0,${-DIAMOND_HEIGHT / 2} ` +
                        `${DIAMOND_WIDTH / 2},0 0,${DIAMOND_HEIGHT / 2}`)
                    .each(d => {
                        if (d.fx == null) {
                            const targetPods = d.targetPods.map(targetPodId =>
                                this.podsLayer.indexedData.get(targetPodId));
                            const targetPodsAvgY = targetPods.reduce((acc, p) => acc + p.y, 0) / targetPods.length;
                            d.fx = d.x = -3 * SPACING;
                            d.y = targetPodsAvgY;
                        }
                    });
            }
        });
        this.serviceLinksLayer = new D3GraphLinkLayer({
            name: 'serviceLinks',
            element: 'line',
            dataExtractorFn: analysisResult => {
                const podIds = new Set();
                analysisResult.pods.forEach(pod => podIds.add(d3PodId(pod)));
                return analysisResult.services.map(service => {
                    return service.targetPods
                        .filter(pod => podIds.has(d3PodId(pod)))
                        .map(targetPod => ({ service, targetPod }));
                    }
                ).flat();
            },
            idFn: d3ServiceLinkId,
            d3DatumFn: d3ServiceLink,
            sourceDatumFn: d3ServiceLink => d3ServiceLink.serviceData,
            focusHandlerExtractorFn: focusHandlers => focusHandlers.onServiceFocus
        });
    }

    getItemLayers() {
        return [
            this.podsLayer,
            this.servicesLayer
        ];
    }

    getLinkLayers() {
        return [
            this.serviceLinksLayer
        ];
    }

    sortData() {
        const indexedPodsToService = new Map();
        this.servicesLayer.data.forEach((service, i) => {
            service.index = i;
            service.targetPods.forEach(podId => {
                indexedPodsToService.set(podId, service);
            });
        });
        this.podsLayer.data.sort((pod1, pod2) => {
            const service1 = indexedPodsToService.get(pod1.id);
            const service2 = indexedPodsToService.get(pod2.id);
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

    isFocused(layerName, datum) {
        const isServiceOfPod = (service, podId) => {
            return service.targetPods.includes(podId);
        };
        const isPodOfService = (pod, serviceId) => {
            const service = this.servicesLayer.indexedData.get(serviceId);
            return service.targetPods.includes(pod.id);
        };
        const isServiceLinkOfPod = (serviceLink, podId) => {
            return serviceLink.target.id === podId;
        };
        const isServiceLinkOfService = (serviceLink, serviceId) => {
            return serviceLink.source.id === serviceId;
        };
        const isPodOfServiceLink = (pod, serviceLinkId) => {
            const serviceLink = this.serviceLinksLayer.indexedData.get(serviceLinkId);
            return serviceLink.target.id === pod.id;
        };
        const isServiceOfServiceLink = (service, serviceLinkId) => {
            const serviceLink = this.serviceLinksLayer.indexedData.get(serviceLinkId);
            return serviceLink.source.id === service.id;
        };
        if (!this.focusedDatum) {
            return true;
        }
        if (this.focusedDatum.layerName === this.podsLayer.name) {
            // Current focus is on a pod
            const focusedPodId = this.focusedDatum.id;
            if (layerName === this.podsLayer.name) {
                return datum.id === focusedPodId;
            } else if (layerName === this.servicesLayer.name) {
                return isServiceOfPod(datum, focusedPodId);
            } else if (layerName === this.serviceLinksLayer.name) {
                return isServiceLinkOfPod(datum, focusedPodId);
            }
        } else if (this.focusedDatum.layerName === this.servicesLayer.name) {
            // Current focus is on a service
            const focusedServiceId = this.focusedDatum.id;
            if (layerName === this.servicesLayer.name) {
                return datum.id === focusedServiceId;
            } else if (layerName === this.podsLayer.name) {
                return isPodOfService(datum, focusedServiceId);
            } else if (layerName === this.serviceLinksLayer.name) {
                return isServiceLinkOfService(datum, focusedServiceId);
            }
        } else if (this.focusedDatum.layerName === this.serviceLinksLayer.name) {
            // Current focus is on a service link
            const focusedServiceLinkId = this.focusedDatum.id;
            if (layerName === this.serviceLinksLayer.name) {
                return datum.id === focusedServiceLinkId;
            } else if (layerName === this.podsLayer.name) {
                return isPodOfServiceLink(datum, focusedServiceLinkId);
            } else if (layerName === this.servicesLayer.name) {
                return isServiceOfServiceLink(datum, focusedServiceLinkId);
            }
        }
        return false;
    }
}
