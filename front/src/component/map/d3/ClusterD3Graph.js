import D3Graph from './D3Graph';
import D3GraphLinkLayer from './D3GraphLinkLayer';
import D3GraphItemLayer from './D3GraphItemLayer';
import { SPACING } from './D3Constants';

function d3PodId(pod) {
    return `pod/${pod.namespace}/${pod.name}`;
}

function d3Pod(pod) {
    const id = d3PodId(pod);
    return { id, displayName: pod.displayName, highlighted: pod.highlighted, sourceData: pod };
}

function d3ServiceId(service) {
    return `service/${service.namespace}/${service.name}`;
}

function d3Service(service) {
    const id = d3ServiceId(service);
    const targetPods = service.targetPods.map(targetPod => d3PodId(targetPod));
    return { id, displayName: service.displayName, targetPods, sourceData: service };
}

function d3ServiceLinkId({ service, targetPod }) {
    return `serviceLink/${d3ServiceId(service)}->${d3PodId(targetPod)}`;
}

function d3ServiceLink({ service, targetPod }) {
    const id = d3ServiceLinkId({ service, targetPod });
    const source = d3ServiceId(service);
    const target = d3PodId(targetPod);
    return { id, source, target, sourceData: service };
}

function d3ReplicaSetId(replicaSet) {
    return `replicaSet/${replicaSet.namespace}/${replicaSet.name}`;
}

function d3ReplicaSet(replicaSet) {
    const id = d3ReplicaSetId(replicaSet);
    const targetPods = replicaSet.targetPods.map(targetPod => d3PodId(targetPod));
    return { id, displayName: replicaSet.displayName, targetPods, sourceData: replicaSet };
}

function d3ReplicaSetLinkId({ replicaSet, targetPod }) {
    return `replicaSetLink/${d3ReplicaSetId(replicaSet)}->${d3PodId(targetPod)}`;
}

function d3ReplicaSetLink({ replicaSet, targetPod }) {
    const id = d3ReplicaSetLinkId({ replicaSet, targetPod });
    const source = d3ReplicaSetId(replicaSet);
    const target = d3PodId(targetPod);
    return { id, source, target, sourceData: replicaSet };
}

function d3DeploymentId(deployment) {
    return `deployment/${deployment.namespace}/${deployment.name}`;
}

function d3Deployment(deployment) {
    const id = d3DeploymentId(deployment);
    const targetReplicaSets = deployment.targetReplicaSets.map(targetReplicaSet => d3ReplicaSetId(targetReplicaSet));
    return { id, displayName: deployment.displayName, targetReplicaSets, sourceData: deployment };
}

function d3DeploymentLinkId({ deployment, targetReplicaSet }) {
    return `deploymentLink/${d3DeploymentId(deployment)}->${d3ReplicaSetId(targetReplicaSet)}`;
}

function d3DeploymentLink({ deployment, targetReplicaSet }) {
    const id = d3DeploymentLinkId({ deployment, targetReplicaSet });
    const source = d3DeploymentId(deployment);
    const target = d3ReplicaSetId(targetReplicaSet);
    return { id, source, target, sourceData: deployment };
}

export default class ClusterD3Graph extends D3Graph {

    constructor() {
        super();
        this.podsLayer = new D3GraphItemLayer({
            name: 'pods',
            svgElement: 'circle',
            dataExtractor: dataSet => dataSet.pods,
            d3IdFn: d3PodId,
            d3DatumMapper: d3Pod,
            focusHandler: 'onPodFocus',
            svgElementAttributesApplier: selection => {
                selection
                    .attr('r', 2)
                    .each((d, i, c) => {
                        if (d.fx == null) {
                            d.fx = d.x = 0;
                            d.fy = d.y = SPACING * (i - (c.length - 1) / 2);
                        }
                    });
            }
        });
        this.servicesLayer = new D3GraphItemLayer({
            name: 'services',
            svgElement: 'polygon',
            dataExtractor: dataSet => dataSet.services,
            d3IdFn: d3ServiceId,
            d3DatumMapper: d3Service,
            focusHandler: 'onServiceFocus',
            svgElementAttributesApplier: selection => {
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
            svgElement: 'line',
            dataExtractor: dataSet => {
                const podIds = new Set();
                dataSet.pods.forEach(pod => podIds.add(d3PodId(pod)));
                return dataSet.services.map(service => {
                        return service.targetPods
                            .filter(pod => podIds.has(d3PodId(pod)))
                            .map(targetPod => ({ service, targetPod }));
                    }
                ).flat();
            },
            d3IdFn: d3ServiceLinkId,
            d3DatumMapper: d3ServiceLink,
            focusHandler: 'onServiceFocus'
        });
        this.replicaSetsLayer = new D3GraphItemLayer({
            name: 'replicaSets',
            svgElement: 'path',
            dataExtractor: dataSet => dataSet.replicaSets,
            d3IdFn: d3ReplicaSetId,
            d3DatumMapper: d3ReplicaSet,
            focusHandler: 'onReplicaSetFocus',
            svgElementAttributesApplier: selection => {
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
            svgElement: 'line',
            dataExtractor: dataSet => {
                const podIds = new Set();
                dataSet.pods.forEach(pod => podIds.add(d3PodId(pod)));
                return dataSet.replicaSets.map(replicaSet => {
                        return replicaSet.targetPods
                            .filter(pod => podIds.has(d3PodId(pod)))
                            .map(targetPod => ({ replicaSet, targetPod }));
                    }
                ).flat();
            },
            d3IdFn: d3ReplicaSetLinkId,
            d3DatumMapper: d3ReplicaSetLink,
            focusHandler: 'onReplicaSetFocus'
        });
        this.deploymentsLayer = new D3GraphItemLayer({
            name: 'deployments',
            svgElement: 'path',
            dataExtractor: dataSet => dataSet.deployments,
            d3IdFn: d3DeploymentId,
            d3DatumMapper: d3Deployment,
            focusHandler: 'onDeploymentFocus',
            svgElementAttributesApplier: selection => {
                selection
                    .attr('d', 'M0,1 A1,1,0,1,1,1,0 L0.5,0 L1.75,1.25 L3,0 L2.5,0 A2.5,2.5,0,1,0,0,2.5')
                    .each(d => {
                        if (d.fx == null) {
                            const targetReplicaSets = d.targetReplicaSets.map(targetReplicaSetId =>
                                this.replicaSetsLayer.indexedData.get(targetReplicaSetId));
                            const targetReplicaSetsAvgY = targetReplicaSets.reduce((acc, p) => acc + p.y, 0) /
                                targetReplicaSets.length;
                            d.fx = d.x = 5 * SPACING;
                            d.y = targetReplicaSetsAvgY;
                        }
                    });
            }
        });
        this.deploymentLinksLayer = new D3GraphLinkLayer({
            name: 'deploymentLinks',
            svgElement: 'line',
            dataExtractor: dataSet => {
                const replicaSetIds = new Set();
                dataSet.replicaSets.forEach(replicaSet => replicaSetIds.add(d3ReplicaSetId(replicaSet)));
                return dataSet.deployments.map(deployment => {
                        return deployment.targetReplicaSets
                            .filter(replicaSet => replicaSetIds.has(d3ReplicaSetId(replicaSet)))
                            .map(targetReplicaSet => ({ deployment, targetReplicaSet }));
                    }
                ).flat();
            },
            d3IdFn: d3DeploymentLinkId,
            d3DatumMapper: d3DeploymentLink,
            focusHandler: 'onDeploymentFocus'
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

    sortLayersDataForNiceDisplay() {
        return this.sortPodsFollowingOrderOfTheirService();
    }

    sortPodsFollowingOrderOfTheirService() {
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

    isFocused(currentTarget, candidateLayerName, candidateDatum) {
        if (super.isFocused(currentTarget, candidateLayerName, candidateDatum)) {
            return true;
        }
        const currentTargetId = currentTarget.id;
        const currentTargetLayerName = currentTarget.layerName;
        const candidateDatumId = candidateDatum.id;
        if (this.isLinkLayer(currentTargetLayerName)) {
            return this.isFocusedWhenTargetIsLink(currentTargetLayerName, currentTargetId, candidateDatumId);
        } else if (currentTargetLayerName === this.podsLayer.name) {
            return this.isFocusedWhenTargetIsPod(currentTargetId, candidateLayerName, candidateDatumId);
        } else if (currentTargetLayerName === this.servicesLayer.name) {
            return this.isFocusedWhenTargetIsService(currentTargetId, candidateLayerName, candidateDatumId);
        } else if (currentTargetLayerName === this.replicaSetsLayer.name) {
            return this.isFocusedWhenTargetIsReplicaSet(currentTargetId, candidateLayerName, candidateDatumId);
        } else if (currentTargetLayerName === this.deploymentsLayer.name) {
            return this.isFocusedWhenTargetIsDeployment(currentTargetId, candidateLayerName, candidateDatumId);
        }
        return false;
    }

    isLinkLayer(layerName) {
        return this.getLinkLayers().map(layer => layer.name).includes(layerName);
    }

    isFocusedWhenTargetIsLink(targetLinkLayerName, targetLinkId, candidateDatumId) {
        const linkLayer = this.getLayer(targetLinkLayerName);
        const link = linkLayer.indexedData.get(targetLinkId);
        return link.source.id === candidateDatumId || link.target.id === candidateDatumId;
    }

    isFocusedWhenTargetIsPod(podId, candidateLayerName, candidateDatumId) {
        if (candidateLayerName === this.servicesLayer.name) {
            return this.isPodOfService(podId, candidateDatumId);
        } else if (candidateLayerName === this.replicaSetsLayer.name) {
            return this.isPodOfReplicaSet(podId, candidateDatumId);
        } else if (candidateLayerName === this.deploymentsLayer) {
            return this.isPodOfDeployment(podId, candidateDatumId);
        } else if (candidateLayerName === this.serviceLinksLayer.name) {
            return this.isServiceLinkOfPod(candidateDatumId, podId);
        } else if (candidateLayerName === this.replicaSetLinksLayer.name) {
            return this.isReplicaSetLinkOfPod(candidateDatumId, podId);
        } else if (candidateLayerName === this.deploymentLinksLayer.name) {
            return this.isDeploymentLinkOfPod(candidateDatumId, podId);
        }
        return false;
    }

    isFocusedWhenTargetIsService(serviceId, candidateLayerName, candidateDatumId) {
        if (candidateLayerName === this.podsLayer.name) {
            return this.isPodOfService(candidateDatumId, serviceId);
        } else if (candidateLayerName === this.serviceLinksLayer.name) {
            return this.isLinkOfService(candidateDatumId, serviceId);
        }
        return false;
    }

    isFocusedWhenTargetIsReplicaSet(replicaSetId, candidateLayerName, candidateDatumId) {
        if (candidateLayerName === this.podsLayer.name) {
            return this.isPodOfReplicaSet(candidateDatumId, replicaSetId);
        } else if (candidateLayerName === this.deploymentsLayer.name) {
            return this.isReplicaSetOfDeployment(replicaSetId, candidateDatumId);
        } else if (candidateLayerName === this.replicaSetLinksLayer.name) {
            return this.isLinkOfReplicaSet(candidateDatumId, replicaSetId);
        } else if (candidateLayerName === this.deploymentLinksLayer.name) {
            return this.isDeploymentLinkOfReplicaSet(candidateDatumId, replicaSetId);
        }
        return false;
    }

    isFocusedWhenTargetIsDeployment(deploymentId, candidateLayerName, candidateDatumId) {
        if (candidateLayerName === this.replicaSetsLayer.name) {
            return this.isReplicaSetOfDeployment(candidateDatumId, deploymentId);
        } else if (candidateLayerName === this.podsLayer.name) {
            return this.isPodOfDeployment(candidateDatumId, deploymentId);
        } else if (candidateLayerName === this.deploymentLinksLayer.name) {
            return this.isLinkOfDeployment(candidateDatumId, deploymentId);
        } else if (candidateLayerName === this.replicaSetLinksLayer.name) {
            return this.isReplicaSetLinkOfDeployment(candidateDatumId, deploymentId);
        }
        return false;
    }

    isPodOfService(podId, serviceId) {
        const service = this.servicesLayer.indexedData.get(serviceId);
        return service.targetPods.includes(podId);
    }

    isServiceLinkOfPod(serviceLinkId, podId) {
        const serviceLink = this.serviceLinksLayer.indexedData.get(serviceLinkId);
        return serviceLink.target.id === podId;
    }

    isLinkOfService(serviceLinkId, serviceId) {
        const serviceLink = this.serviceLinksLayer.indexedData.get(serviceLinkId);
        return serviceLink.source.id === serviceId;
    }

    isPodOfReplicaSet(podId, replicaSetId) {
        const replicaSet = this.replicaSetsLayer.indexedData.get(replicaSetId);
        return replicaSet.targetPods.includes(podId);
    }

    isReplicaSetLinkOfPod(replicaSetLinkId, podId) {
        const replicaSetLink = this.replicaSetLinksLayer.indexedData.get(replicaSetLinkId);
        return replicaSetLink.target.id === podId;
    }

    isLinkOfReplicaSet(replicaSetLinkId, replicaSetId) {
        const replicaSetLink = this.replicaSetLinksLayer.indexedData.get(replicaSetLinkId);
        return replicaSetLink.source.id === replicaSetId;
    }

    isReplicaSetOfDeployment(replicaSetId, deploymentId) {
        const deployment = this.deploymentsLayer.indexedData.get(deploymentId);
        return deployment.targetReplicaSets.includes(replicaSetId);
    }

    isDeploymentLinkOfReplicaSet(deploymentLinkId, replicaSetId) {
        const deploymentLink = this.deploymentLinksLayer.indexedData.get(deploymentLinkId);
        return deploymentLink.target.id === replicaSetId;
    }

    isLinkOfDeployment(deploymentLinkId, deploymentId) {
        const deploymentLink = this.deploymentLinksLayer.indexedData.get(deploymentLinkId);
        return deploymentLink.source.id === deploymentId;
    }

    isPodOfDeployment(podId, deploymentId) {
        const deployment = this.deploymentsLayer.indexedData.get(deploymentId);
        return deployment.targetReplicaSets.some(targetReplicaSetId => {
            const replicaSet = this.replicaSetsLayer.indexedData.get(targetReplicaSetId);
            return replicaSet.targetPods.includes(podId);
        });
    }

    isDeploymentLinkOfPod(candidateDatumId, podId) {
        const deploymentLink = this.deploymentLinksLayer.indexedData.get(candidateDatumId);
        return deploymentLink.target.targetPods.includes(podId);
    }

    isReplicaSetLinkOfDeployment(replicaSetLinkId, deploymentId) {
        const deployment = this.deploymentsLayer.indexedData.get(deploymentId);
        const replicaSetLink = this.replicaSetLinksLayer.indexedData.get(replicaSetLinkId);
        return deployment.targetReplicaSets.includes(replicaSetLink.source.id);
    }
}
