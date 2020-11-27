import D3Graph from './D3Graph';
import D3GraphLinkLayer from './D3GraphLinkLayer';
import D3GraphItemLayer from './D3GraphItemLayer';
import { SPACING } from './D3Constants';
import { flatten } from '../../utils/utils';

const CONTROLLER_TYPE = {
    REPLICASET: 'replicaSet',
    STATEFULSET: 'statefulSet',
    DAEMONSET: 'daemonSet'
};

function withControllerType(type, obj) {
    return { type, ...obj };
}

function withoutControllerType(obj) {
    if (obj == null) {
        return null;
    }
    const { type, ...remaining } = obj;
    return remaining;
}

function extractControllers(dataSet) {
    return [
        ...dataSet.replicaSets.map(rs => withControllerType(CONTROLLER_TYPE.REPLICASET, rs)),
        ...dataSet.statefulSets.map(ss => withControllerType(CONTROLLER_TYPE.STATEFULSET, ss)),
        ...dataSet.daemonSets.map(ds => withControllerType(CONTROLLER_TYPE.DAEMONSET, ds))
    ];
}

function controllerFocusHandler(focusHandlers, datum) {
    switch (datum.type) {
        case CONTROLLER_TYPE.REPLICASET:
            return datum => focusHandlers['onReplicaSetFocus'](withoutControllerType(datum));
        case CONTROLLER_TYPE.STATEFULSET:
            return datum => focusHandlers['onStatefulSetFocus'](withoutControllerType(datum));
        case CONTROLLER_TYPE.DAEMONSET:
            return datum => focusHandlers['onDaemonSetFocus'](withoutControllerType(datum));
        default:
            throw new Error('Invalid datum type: ' + datum.type);
    }
}

function controllerSvgPath(datum) {
    switch (datum.type) {
        case CONTROLLER_TYPE.REPLICASET:
            return 'M-2,-2 L2,-2 L2,2 L-2,2 M2.5,-1 L3,-1 L3,3 L-1,3 L-1,2.5 L2.5,2.5 L2.5,-1';
        case CONTROLLER_TYPE.STATEFULSET:
            return 'M-2,-1.75 A2.5,0.75,0,1,1,3,-1.75 A2.5,0.75,0,1,1,-2,-1.75 ' +
                'M-2,-1.25 A2.5,0.75,0,0,0,3,-1.25 L3,0 A2.5,0.75,0,1,1,-2,0 ' +
                'M-2,0.5 A2.5,0.75,0,0,0,3,0.5 L3,1.75 A2.5,0.75,0,1,1,-2,1.75';
        case CONTROLLER_TYPE.DAEMONSET:
            return 'M0,-2.31 L2,-1.155 L2,1.155 L0,2.31 L-2,1.155 L-2,-1.155 ' +
                'M2.5,-0.865 L2.5,1.445 L0.5,2.6 L1,2.89 L3,1.735 L3,-0.575';
        default:
            throw new Error('Invalid datum type: ' + datum.type);
    }
}

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

function d3ControllerId(controller) {
    return `${controller.type}/${controller.namespace}/${controller.name}`;
}

function d3Controller(controller) {
    const id = d3ControllerId(controller);
    const targetPods = controller.targetPods.map(targetPod => d3PodId(targetPod));
    return { id, type: controller.type, displayName: controller.displayName, targetPods, sourceData: controller };
}

function d3ControllerLinkId({ controller, targetPod }) {
    return `${controller.type}Link/${d3ControllerId(controller)}->${d3PodId(targetPod)}`;
}

function d3ControllerLink({ controller, targetPod }) {
    const id = d3ControllerLinkId({ controller, targetPod });
    const source = d3ControllerId(controller);
    const target = d3PodId(targetPod);
    return { id, type: controller.type, source, target, sourceData: controller };
}

function d3DeploymentId(deployment) {
    return `deployment/${deployment.namespace}/${deployment.name}`;
}

function d3Deployment(deployment) {
    const id = d3DeploymentId(deployment);
    const targetReplicaSets = deployment.targetReplicaSets
        .map(targetReplicaSet => d3ControllerId(withControllerType(CONTROLLER_TYPE.REPLICASET, targetReplicaSet)));
    return { id, displayName: deployment.displayName, targetReplicaSets, sourceData: deployment };
}

function d3DeploymentLinkId({ deployment, targetReplicaSet }) {
    return `deploymentLink/${d3DeploymentId(deployment)}->${d3ControllerId(targetReplicaSet)}`;
}

function d3DeploymentLink({ deployment, targetReplicaSet }) {
    const id = d3DeploymentLinkId({ deployment, targetReplicaSet });
    const source = d3DeploymentId(deployment);
    const target = d3ControllerId(withControllerType(CONTROLLER_TYPE.REPLICASET, targetReplicaSet));
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
            svgElementAttributesApplier: (selection, dataChanged) => {
                selection
                    .attr('aria-label', 'pod')
                    .attr('r', 2)
                    .each((d, i, c) => {
                        if (d.fx == null || (dataChanged & !d.pinned)) {
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
            svgElementAttributesApplier: (selection, dataChanged) => {
                selection
                    .attr('aria-label', 'service')
                    .attr('points', '-4,0 0,-2.5 4,0 0,2.5')
                    .each(d => {
                        if (d.fx == null || (dataChanged & !d.pinned)) {
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
                return flatten(dataSet.services.map(service => {
                    return service.targetPods
                        .filter(pod => podIds.has(d3PodId(pod)))
                        .map(targetPod => ({ service, targetPod }));
                }));
            },
            d3IdFn: d3ServiceLinkId,
            d3DatumMapper: d3ServiceLink,
            focusHandler: 'onServiceFocus',
            svgElementAttributesApplier: selection => {
                selection
                    .attr('aria-label', 'service link');
            }
        });
        this.controllersLayer = new D3GraphItemLayer({
            name: 'controllers',
            svgElement: 'path',
            dataExtractor: extractControllers,
            d3IdFn: d3ControllerId,
            d3DatumMapper: d3Controller,
            focusHandler: controllerFocusHandler,
            svgElementAttributesApplier: (selection, dataChanged) => {
                selection
                    .attr('aria-label', d => d.type.toLowerCase())
                    .attr('d', controllerSvgPath)
                    .each(d => {
                        if (d.fx == null || (dataChanged & !d.pinned)) {
                            const targetPods = d.targetPods.map(targetPodId =>
                                this.podsLayer.indexedData.get(targetPodId));
                            const targetPodsAvgY = targetPods.reduce((acc, p) => acc + p.y, 0) / targetPods.length;
                            d.fx = d.x = 3 * SPACING;
                            d.y = targetPodsAvgY;
                        }
                    });
            }
        });
        this.controllerLinksLayer = new D3GraphLinkLayer({
            name: 'controllerLinks',
            svgElement: 'line',
            dataExtractor: dataSet => {
                const podIds = new Set();
                dataSet.pods.forEach(pod => podIds.add(d3PodId(pod)));
                const controllers = extractControllers(dataSet);
                return flatten(controllers.map(controller => {
                    return controller.targetPods
                        .filter(pod => podIds.has(d3PodId(pod)))
                        .map(targetPod => ({ controller, targetPod }));
                }));
            },
            d3IdFn: d3ControllerLinkId,
            d3DatumMapper: d3ControllerLink,
            focusHandler: controllerFocusHandler,
            svgElementAttributesApplier: selection => {
                selection
                    .attr('aria-label', d => `${d.type.toLowerCase()} link`);
            }
        });
        this.deploymentsLayer = new D3GraphItemLayer({
            name: 'deployments',
            svgElement: 'path',
            dataExtractor: dataSet => dataSet.deployments,
            d3IdFn: d3DeploymentId,
            d3DatumMapper: d3Deployment,
            focusHandler: 'onDeploymentFocus',
            svgElementAttributesApplier: (selection, dataChanged) => {
                selection
                    .attr('aria-label', 'deployment')
                    .attr('d', 'M0,1 A1,1,0,1,1,1,0 L0.5,0 L1.75,1.25 L3,0 L2.5,0 A2.5,2.5,0,1,0,0,2.5')
                    .each(d => {
                        if (d.fx == null || (dataChanged & !d.pinned)) {
                            const targetReplicaSets = d.targetReplicaSets.map(targetReplicaSetId =>
                                this.controllersLayer.indexedData.get(targetReplicaSetId));
                            const targetReplicaSetsAvgY = targetReplicaSets.reduce((acc, p) => acc + p.y, 0) /
                                targetReplicaSets.length;
                            d.fx = d.x = 6 * SPACING;
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
                dataSet.replicaSets.forEach(replicaSet => replicaSetIds.add(d3ControllerId(replicaSet)));
                return flatten(dataSet.deployments.map(deployment => {
                    return deployment.targetReplicaSets
                        .filter(replicaSet => replicaSetIds.has(d3ControllerId(replicaSet)))
                        .map(targetReplicaSet => ({ deployment, targetReplicaSet }));
                }));
            },
            d3IdFn: d3DeploymentLinkId,
            d3DatumMapper: d3DeploymentLink,
            focusHandler: 'onDeploymentFocus',
            svgElementAttributesApplier: selection => {
                selection
                    .attr('aria-label', 'deployment link');
            }
        });
    }

    getItemLayers() {
        return [
            this.podsLayer,
            this.servicesLayer,
            this.controllersLayer,
            this.deploymentsLayer
        ];
    }

    getLinkLayers() {
        return [
            this.serviceLinksLayer,
            this.controllerLinksLayer,
            this.deploymentLinksLayer
        ];
    }

    sortLayersDataForNiceDisplay() {
        this.sortServicesByName();
        const indexedPodsToService = this.buildPodsToServiceIndex();
        const indexedPodsToReplicaSet = this.buildPodsToControllerIndex(CONTROLLER_TYPE.REPLICASET);
        const indexedPodsToStatefulSet = this.buildPodsToControllerIndex(CONTROLLER_TYPE.STATEFULSET);
        const indexedPodsToDaemonSet = this.buildPodsToControllerIndex(CONTROLLER_TYPE.DAEMONSET);
        this.sortPodsByServiceAndController(indexedPodsToService, indexedPodsToReplicaSet, indexedPodsToStatefulSet,
            indexedPodsToDaemonSet);
        const indexedPods = this.buildPodsIndex();
        this.sortControllersByPodIndex(indexedPods);
        const indexedReplicaSets = this.buildReplicaSetsIndex();
        this.sortDeploymentsByReplicaSet(indexedReplicaSets);
    }

    buildPodsToServiceIndex() {
        const indexedPodsToService = new Map();
        this.servicesLayer.data.forEach((service, i) => {
            service.index = i;
            service.targetPods.forEach(podId => {
                indexedPodsToService.set(podId, service);
            });
        });
        return indexedPodsToService;
    }

    buildPodsToControllerIndex(controllerType) {
        const indexedPodsToController = new Map();
        this.controllersLayer.data
            .filter(controller => controller.type === controllerType)
            .forEach((controller, i) => {
                controller.index = i;
                controller.targetPods.forEach(podId => {
                    indexedPodsToController.set(podId, controller);
                });
            });
        return indexedPodsToController;
    }

    sortServicesByName() {
        this.servicesLayer.data.sort((service1, service2) => {
            return service1.id.localeCompare(service2.id);
        });
    }

    sortPodsByServiceAndController(indexedPodsToService, indexedPodsToReplicaSet, indexedPodsToStatefulSet,
                                   indexedPodsToDaemonSet) {
        this.podsLayer.data.sort((pod1, pod2) => this.comparePodsByIndices(pod1, pod2,
            [indexedPodsToService, indexedPodsToReplicaSet, indexedPodsToStatefulSet, indexedPodsToDaemonSet]));

    }

    comparePodsByIndices(pod1, pod2, indices) {
        const [currentIndex, ...nextIndices] = indices;
        const lookup1 = currentIndex.get(pod1.id);
        const lookup2 = currentIndex.get(pod2.id);
        const index1 = lookup1 ? lookup1.index : Number.MAX_VALUE;
        const index2 = lookup2 ? lookup2.index : Number.MAX_VALUE;
        if (index1 < index2) {
            return -1;
        } else if (index1 > index2) {
            return 1;
        } else if (nextIndices.length === 0) {
            return pod1.id.localeCompare(pod2.id);
        } else {
            return this.comparePodsByIndices(pod1, pod2, nextIndices);
        }
    }

    buildPodsIndex() {
        const indexedPods = new Map();
        this.podsLayer.data.forEach((pod, i) => {
            pod.index = i;
            indexedPods.set(pod.id, pod);
        });
        return indexedPods;
    }

    sortControllersByPodIndex(indexedPods) {
        this.controllersLayer.data.sort((controller1, controller2) => {
            const podIndex1 = indexedPods.get(controller1.targetPods[0]).index;
            const podIndex2 = indexedPods.get(controller2.targetPods[0]).index;
            return podIndex1 - podIndex2;
        });
    }

    buildReplicaSetsIndex() {
        const indexedReplicaSets = new Map();
        this.controllersLayer.data
            .filter(controller => controller.type === CONTROLLER_TYPE.REPLICASET)
            .forEach((replicaSet, i) => {
                replicaSet.index = i;
                indexedReplicaSets.set(replicaSet.id, replicaSet);
            });
        return indexedReplicaSets;
    }

    sortDeploymentsByReplicaSet(indexedReplicaSets) {
        this.deploymentsLayer.data.sort((deployment1, deployment2) => {
            const replicaSetIndex1 = indexedReplicaSets.get(deployment1.targetReplicaSets[0]).index;
            const replicaSetIndex2 = indexedReplicaSets.get(deployment2.targetReplicaSets[0]).index;
            return replicaSetIndex1 - replicaSetIndex2;
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
        } else if (currentTargetLayerName === this.controllersLayer.name) {
            return this.isFocusedWhenTargetIsController(currentTargetId, candidateLayerName, candidateDatumId);
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
        } else if (candidateLayerName === this.controllersLayer.name) {
            return this.isPodOfController(podId, candidateDatumId);
        } else if (candidateLayerName === this.deploymentsLayer.name) {
            return this.isPodOfDeployment(podId, candidateDatumId);
        } else if (candidateLayerName === this.serviceLinksLayer.name) {
            return this.isServiceLinkOfPod(candidateDatumId, podId);
        } else if (candidateLayerName === this.controllerLinksLayer.name) {
            return this.isControllerLinkOfPod(candidateDatumId, podId);
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

    isFocusedWhenTargetIsController(controllerId, candidateLayerName, candidateDatumId) {
        if (candidateLayerName === this.podsLayer.name) {
            return this.isPodOfController(candidateDatumId, controllerId);
        } else if (candidateLayerName === this.deploymentsLayer.name) {
            return this.isReplicaSetOfDeployment(controllerId, candidateDatumId);
        } else if (candidateLayerName === this.controllerLinksLayer.name) {
            return this.isLinkOfController(candidateDatumId, controllerId);
        } else if (candidateLayerName === this.deploymentLinksLayer.name) {
            return this.isDeploymentLinkOfReplicaSet(candidateDatumId, controllerId);
        }
        return false;
    }

    isFocusedWhenTargetIsDeployment(deploymentId, candidateLayerName, candidateDatumId) {
        if (candidateLayerName === this.controllersLayer.name) {
            return this.isReplicaSetOfDeployment(candidateDatumId, deploymentId);
        } else if (candidateLayerName === this.podsLayer.name) {
            return this.isPodOfDeployment(candidateDatumId, deploymentId);
        } else if (candidateLayerName === this.deploymentLinksLayer.name) {
            return this.isLinkOfDeployment(candidateDatumId, deploymentId);
        } else if (candidateLayerName === this.controllerLinksLayer.name) {
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

    isPodOfController(podId, controllerId) {
        const controller = this.controllersLayer.indexedData.get(controllerId);
        return controller.targetPods.includes(podId);
    }

    isControllerLinkOfPod(controllerLinkId, podId) {
        const controllerLink = this.controllerLinksLayer.indexedData.get(controllerLinkId);
        return controllerLink.target.id === podId;
    }

    isLinkOfController(controllerLinkId, controller) {
        const controllerLink = this.controllerLinksLayer.indexedData.get(controllerLinkId);
        return controllerLink.source.id === controller;
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
            const replicaSet = this.controllersLayer.indexedData.get(targetReplicaSetId);
            return replicaSet.targetPods.includes(podId);
        });
    }

    isDeploymentLinkOfPod(candidateDatumId, podId) {
        const deploymentLink = this.deploymentLinksLayer.indexedData.get(candidateDatumId);
        return deploymentLink.target.targetPods.includes(podId);
    }

    isReplicaSetLinkOfDeployment(replicaSetLinkId, deploymentId) {
        const deployment = this.deploymentsLayer.indexedData.get(deploymentId);
        const replicaSetLink = this.controllerLinksLayer.indexedData.get(replicaSetLinkId);
        return deployment.targetReplicaSets.includes(replicaSetLink.source.id);
    }
}
