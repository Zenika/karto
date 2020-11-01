import D3Graph from './D3Graph';
import D3GraphLinkLayer from './D3GraphLinkLayer';
import D3GraphItemLayer from './D3GraphItemLayer';
import { SPACING } from './D3Constants';

function d3PodId(pod) {
    return `pod/${pod.namespace}/${pod.name}`;
}

function d3ServiceId(service) {
    return `service/${service.namespace}/${service.name}`;
}

function d3ServiceLinkId({ service, targetPod }) {
    return `serviceLink/${d3ServiceId(service)}->${d3PodId(targetPod)}`;
}

function d3ReplicaSetId(replicaSet) {
    return `replicaSet/${replicaSet.namespace}/${replicaSet.name}`;
}

function d3ReplicaSetLinkId({ replicaSet, targetPod }) {
    return `replicaSetLink/${d3ReplicaSetId(replicaSet)}->${d3PodId(targetPod)}`;
}

function d3DeploymentId(deployment) {
    return `deployment/${deployment.namespace}/${deployment.name}`;
}

function d3DeploymentLinkId({ deployment, targetReplicaSet }) {
    return `deploymentLink/${d3DeploymentId(deployment)}->${d3ReplicaSetId(targetReplicaSet)}`;
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

function d3ReplicaSet(replicaSet) {
    const id = d3ReplicaSetId(replicaSet);
    const targetPods = replicaSet.targetPods.map(targetPod => d3PodId(targetPod));
    return { id, displayName: replicaSet.displayName, targetPods, replicaSetData: replicaSet };
}

function d3ReplicaSetLink({ replicaSet, targetPod }) {
    const id = d3ReplicaSetLinkId({ replicaSet, targetPod });
    const source = d3ReplicaSetId(replicaSet);
    const target = d3PodId(targetPod);
    return { id, source, target, replicaSetData: replicaSet };
}

function d3Deployment(deployment) {
    const id = d3DeploymentId(deployment);
    const targetReplicaSets = deployment.targetReplicaSets.map(targetReplicaSet => d3ReplicaSetId(targetReplicaSet));
    return { id, displayName: deployment.displayName, targetReplicaSets, deploymentData: deployment };
}

function d3DeploymentLink({ deployment, targetReplicaSet }) {
    const id = d3DeploymentLinkId({ deployment, targetReplicaSet });
    const source = d3DeploymentId(deployment);
    const target = d3ReplicaSetId(targetReplicaSet);
    return { id, source, target, deploymentData: deployment };
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
                    .attr('r', 2)
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
                    .attr('points', '-4,0 0,-2.5 4,0 0,2.5')
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
        this.replicaSetsLayer = new D3GraphItemLayer({
            name: 'replicaSets',
            element: 'path',
            dataExtractorFn: analysisResult => analysisResult.replicaSets,
            idFn: d3ReplicaSetId,
            d3DatumFn: d3ReplicaSet,
            sourceDatumFn: d3ReplicaSet => d3ReplicaSet.replicaSetData,
            focusHandlerExtractorFn: focusHandlers => focusHandlers.onReplicaSetFocus,
            applyElementCustomAttrs: selection => {
                selection
                    .attr('d', 'M-2,-2 L2,-2 L2,2 L-2,2 M2.5,-1 L3,-1 L3,3 L-1,3 L-1,2.5 L2.5,2.5 L2.5,-1')
                    .each(d => {
                        if (d.fx == null) {
                            const targetPods = d.targetPods.map(targetPodId =>
                                this.podsLayer.indexedData.get(targetPodId));
                            const targetPodsAvgY = targetPods.reduce((acc, p) => acc + p.y, 0) / targetPods.length;
                            d.fx = d.x = 3 * SPACING;
                            d.y = targetPodsAvgY;
                        }
                    });
            }
        });
        this.replicaSetLinksLayer = new D3GraphLinkLayer({
            name: 'replicaSetLinks',
            element: 'line',
            dataExtractorFn: analysisResult => {
                const podIds = new Set();
                analysisResult.pods.forEach(pod => podIds.add(d3PodId(pod)));
                return analysisResult.replicaSets.map(replicaSet => {
                        return replicaSet.targetPods
                            .filter(pod => podIds.has(d3PodId(pod)))
                            .map(targetPod => ({ replicaSet, targetPod }));
                    }
                ).flat();
            },
            idFn: d3ReplicaSetLinkId,
            d3DatumFn: d3ReplicaSetLink,
            sourceDatumFn: d3ReplicaSetLink => d3ReplicaSetLink.replicaSetData,
            focusHandlerExtractorFn: focusHandlers => focusHandlers.onReplicaSetFocus
        });
        this.deploymentsLayer = new D3GraphItemLayer({
            name: 'deployments',
            element: 'path',
            dataExtractorFn: analysisResult => analysisResult.deployments,
            idFn: d3DeploymentId,
            d3DatumFn: d3Deployment,
            sourceDatumFn: d3Deployment => d3Deployment.deploymentData,
            focusHandlerExtractorFn: focusHandlers => focusHandlers.onDeploymentFocus,
            applyElementCustomAttrs: selection => {
                selection
                    .attr('d', 'M0,1 A1,1,0,1,1,1,0 L0.5,0 L1.75,1.25 L3,0 L2.5,0 A2.5,2.5,0,1,0,0,2.5')
                    .each(d => {
                        if (d.fx == null) {
                            const targetReplicaSets = d.targetReplicaSets.map(targetReplicaSetId =>
                                this.replicaSetsLayer.indexedData.get(targetReplicaSetId));
                            const targetReplicaSetsAvgY = targetReplicaSets.reduce((acc, p) => acc + p.y, 0) / targetReplicaSets.length;
                            d.fx = d.x = 5 * SPACING;
                            d.y = targetReplicaSetsAvgY;
                        }
                    });
            }
        });
        this.deploymentLinksLayer = new D3GraphLinkLayer({
            name: 'deploymentLinks',
            element: 'line',
            dataExtractorFn: analysisResult => {
                const replicaSetIds = new Set();
                analysisResult.replicaSets.forEach(replicaSet => replicaSetIds.add(d3ReplicaSetId(replicaSet)));
                return analysisResult.deployments.map(deployment => {
                        return deployment.targetReplicaSets
                            .filter(replicaSet => replicaSetIds.has(d3ReplicaSetId(replicaSet)))
                            .map(targetReplicaSet => ({ deployment, targetReplicaSet }));
                    }
                ).flat();
            },
            idFn: d3DeploymentLinkId,
            d3DatumFn: d3DeploymentLink,
            sourceDatumFn: d3DeploymentLink => d3DeploymentLink.deploymentData,
            focusHandlerExtractorFn: focusHandlers => focusHandlers.onDeploymentFocus
        });
    }

    getItemLayers() {
        return [
            this.podsLayer,
            this.servicesLayer,
            this.replicaSetsLayer,
            this.deploymentsLayer
        ];
    }

    getLinkLayers() {
        return [
            this.serviceLinksLayer,
            this.replicaSetLinksLayer,
            this.deploymentLinksLayer
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
        const isReplicaSetOfPod = (replicaSet, podId) => {
            return replicaSet.targetPods.includes(podId);
        };
        const isPodOfReplicaSet = (pod, replicaSetId) => {
            const replicaSet = this.replicaSetsLayer.indexedData.get(replicaSetId);
            return replicaSet.targetPods.includes(pod.id);
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
        const isReplicaSetLinkOfPod = (replicaSetLink, podId) => {
            return replicaSetLink.target.id === podId;
        };
        const isReplicaSetLinkOfReplicaSet = (replicaSetLink, replicaSetId) => {
            return replicaSetLink.source.id === replicaSetId;
        };
        const isPodOfReplicaSetLink = (pod, replicaSetLinkId) => {
            const replicaSetLink = this.replicaSetLinksLayer.indexedData.get(replicaSetLinkId);
            return replicaSetLink.target.id === pod.id;
        };
        const isReplicaSetOfReplicaSetLink = (replicaSet, replicaSetLinkId) => {
            const replicaSetLink = this.replicaSetLinksLayer.indexedData.get(replicaSetLinkId);
            return replicaSetLink.source.id === replicaSet.id;
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
            } else if (layerName === this.replicaSetsLayer.name) {
                return isReplicaSetOfPod(datum, focusedPodId);
            } else if (layerName === this.replicaSetLinksLayer.name) {
                return isReplicaSetLinkOfPod(datum, focusedPodId);
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
        } else if (this.focusedDatum.layerName === this.replicaSetsLayer.name) {
            // Current focus is on a replicaSet
            const focusedReplicaSetId = this.focusedDatum.id;
            if (layerName === this.replicaSetsLayer.name) {
                return datum.id === focusedReplicaSetId;
            } else if (layerName === this.podsLayer.name) {
                return isPodOfReplicaSet(datum, focusedReplicaSetId);
            } else if (layerName === this.replicaSetLinksLayer.name) {
                return isReplicaSetLinkOfReplicaSet(datum, focusedReplicaSetId);
            }
        } else if (this.focusedDatum.layerName === this.replicaSetLinksLayer.name) {
            // Current focus is on a replicaSet link
            const focusedReplicaSetLinkId = this.focusedDatum.id;
            if (layerName === this.replicaSetLinksLayer.name) {
                return datum.id === focusedReplicaSetLinkId;
            } else if (layerName === this.podsLayer.name) {
                return isPodOfReplicaSetLink(datum, focusedReplicaSetLinkId);
            } else if (layerName === this.replicaSetsLayer.name) {
                return isReplicaSetOfReplicaSetLink(datum, focusedReplicaSetLinkId);
            }
        }
        return false;
    }
}
