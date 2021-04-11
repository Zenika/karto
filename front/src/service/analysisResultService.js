export async function fetchAnalysisResult() {
    const response = await fetch('./api/analysisResult');
    if (response.status !== 200) {
        console.error(`Could not fetch analysis result: error code : ${response.status}`);
        return;
    }
    const result = await response.json();
    result.allNamespaces = allNamespacesOfPods(result.pods);
    result.allLabels = allLabelsOfPods(result.pods);
    return result;
}

function allNamespacesOfPods(pods) {
    return distinctAndSort(pods.map(pod => pod.namespace));
}

function allLabelsOfPods(pods) {
    const result = {};
    pods.forEach(pod => {
        Object.entries(pod.labels).forEach(([key, value]) => {
            if (result[key] == null) {
                result[key] = [];
            }
            result[key].push(value);
        });
    });
    Object.entries(result).forEach(([key, value]) => {
        result[key] = distinctAndSort(value);
    });
    return result;
}

function distinctAndSort(arr) {
    return [...new Set(arr)].sort();
}

export function computeDataSet(analysisResult, controls) {
    if (analysisResult == null) {
        return null;
    }
    const podsIndex = indexPodsById(analysisResult.pods);
    const podIsolationsIndex = indexPodIsolationsById(analysisResult.podIsolations);
    const filteredAnalysisResult = filterAnalysisResult(analysisResult, podIsolationsIndex, controls);
    return mapAnalysisResult(filteredAnalysisResult, podsIndex, podIsolationsIndex, controls);
}

function indexPodsById(pods) {
    const index = new Map();
    pods.forEach(pod => index.set(podId(pod), pod));
    return index;
}

function indexPodIsolationsById(podIsolations) {
    const index = new Map();
    podIsolations.forEach(podIsolation => index.set(podId(podIsolation.pod), podIsolation));
    return index;
}

function filterAnalysisResult(analysisResult, podIsolationsIndex, controls) {
    const filteredPodIds = new Set();
    const filteredServiceIds = new Set();
    const filteredReplicaSetIds = new Set();

    const podFilter = makePodFilter(controls);
    const podIsolationFilter = makePodIsolationFilter(filteredPodIds);
    const allowedRouteFilter = makeAllowedRouteFilter(filteredPodIds);
    const serviceFilter = makeServiceFilter(filteredPodIds);
    const ingressFilter = makeIngressFilter(filteredServiceIds);
    const replicaSetFilter = makeReplicaSetFilter(filteredPodIds);
    const statefulSetFilter = makeStatefulSetFilter(filteredPodIds);
    const daemonSetFilter = makeDaemonSetFilter(filteredPodIds);
    const deploymentFilter = makeDeploymentFilter(filteredReplicaSetIds);
    const podHealthFilter = makePodHealthFilter(filteredPodIds);

    const filteredPods = analysisResult.pods.filter(podFilter);
    filteredPods.forEach(pod => filteredPodIds.add(podId(pod)));
    const filteredPodIsolations = analysisResult.podIsolations.filter(podIsolationFilter);
    const filteredAllowedRoutes = analysisResult.allowedRoutes.filter(allowedRouteFilter);
    const filteredServices = analysisResult.services.filter(serviceFilter);
    filteredServices.forEach(service => filteredServiceIds.add(serviceId(service)));
    const filteredIngresses = analysisResult.ingresses.filter(ingressFilter);
    const filteredReplicaSets = analysisResult.replicaSets.filter(replicaSetFilter);
    filteredReplicaSets.forEach(replicaSet => filteredReplicaSetIds.add(replicaSetId(replicaSet)));
    const filteredStatefulSets = analysisResult.statefulSets.filter(statefulSetFilter);
    const filteredDaemonSets = analysisResult.daemonSets.filter(daemonSetFilter);
    const filteredDeployments = analysisResult.deployments.filter(deploymentFilter);
    const filteredPodHealths = analysisResult.podHealths.filter(podHealthFilter);
    const { neighborPodIsolations, neighborAllowedRoutes } = computeNeighbors(analysisResult, filteredPodIds,
        podIsolationsIndex, controls);

    return {
        pods: filteredPods,
        podIsolations: [...filteredPodIsolations, ...neighborPodIsolations],
        allowedRoutes: [...filteredAllowedRoutes, ...neighborAllowedRoutes],
        services: filteredServices,
        ingresses: filteredIngresses,
        replicaSets: filteredReplicaSets,
        statefulSets: filteredStatefulSets,
        daemonSets: filteredDaemonSets,
        deployments: filteredDeployments,
        podHealths: filteredPodHealths
    };
}

function computeNeighbors(analysisResult, filteredPodIds, podIsolationsIndex, controls) {
    const { includeIngressNeighbors, includeEgressNeighbors } = controls;
    const neighborPodIds = new Set();
    const neighborPodIsolations = [];
    const neighborAllowedRoutes = [];
    analysisResult.allowedRoutes.forEach(allowedRoute => {
        const sourcePodId = podId(allowedRoute.sourcePod);
        const targetPodId = podId(allowedRoute.targetPod);
        if (includeIngressNeighbors && !filteredPodIds.has(sourcePodId) && filteredPodIds.has(targetPodId)) {
            if (!neighborPodIds.has(sourcePodId)) {
                neighborPodIds.add(sourcePodId);
                neighborPodIsolations.push(podIsolationsIndex.get(sourcePodId));
            }
            neighborAllowedRoutes.push(allowedRoute);
        }
        if (includeEgressNeighbors && !filteredPodIds.has(targetPodId) && filteredPodIds.has(sourcePodId)) {
            if (!neighborPodIds.has(targetPodId)) {
                neighborPodIds.add(targetPodId);
                neighborPodIsolations.push(podIsolationsIndex.get(targetPodId));
            }
            neighborAllowedRoutes.push(allowedRoute);
        }
    });
    return { neighborPodIsolations, neighborAllowedRoutes };
}

function mapAnalysisResult(filteredAnalysisResult, podsIndex, podIsolationsIndex, controls) {
    const filteredPodIds = new Set();
    filteredAnalysisResult.pods.forEach(pod => filteredPodIds.add(podId(pod)));
    const filteredServiceIds = new Set();
    filteredAnalysisResult.services.forEach(service => filteredServiceIds.add(serviceId(service)));
    const filteredReplicaSetIds = new Set();
    filteredAnalysisResult.replicaSets.forEach(replicaSet => filteredReplicaSetIds.add(replicaSetId(replicaSet)));

    const podMapper = makePodMapper(controls);
    const podIsolationMapper = makePodIsolationMapper(controls, podMapper, podsIndex);
    const allowedRouteMapper = makeAllowedRouteMapper(controls, podIsolationMapper, podIsolationsIndex);
    const serviceMapper = makeServiceMapper(controls, filteredPodIds);
    const ingressMapper = makeIngressMapper(controls, filteredServiceIds);
    const replicaSetMapper = makeReplicaSetMapper(controls, filteredPodIds);
    const statefulSetMapper = makeStatefulSetMapper(controls, filteredPodIds);
    const daemonSetMapper = makeDaemonSetMapper(controls, filteredPodIds);
    const deploymentMapper = makeDeploymentMapper(controls, filteredReplicaSetIds);
    const podHealthMapper = makePodHealthMapper(controls, podMapper, podsIndex);

    return {
        pods: filteredAnalysisResult.pods.map(podMapper),
        podIsolations: filteredAnalysisResult.podIsolations.map(podIsolationMapper),
        allowedRoutes: filteredAnalysisResult.allowedRoutes.map(allowedRouteMapper),
        services: filteredAnalysisResult.services.map(serviceMapper),
        ingresses: filteredAnalysisResult.ingresses.map(ingressMapper),
        replicaSets: filteredAnalysisResult.replicaSets.map(replicaSetMapper),
        statefulSets: filteredAnalysisResult.statefulSets.map(statefulSetMapper),
        daemonSets: filteredAnalysisResult.daemonSets.map(daemonSetMapper),
        deployments: filteredAnalysisResult.deployments.map(deploymentMapper),
        podHealths: filteredAnalysisResult.podHealths.map(podHealthMapper)
    };
}

function makePodFilter(controls) {
    const { nameFilter, namespaceFilters, labelFilters } = controls;
    const podNamespaceFilter = makePodNamespaceFilter(namespaceFilters);
    const podNameFilter = makePodNameFilter(nameFilter);
    const podLabelsFilter = makePodLabelsFilter(labelFilters);
    return pod => podNamespaceFilter(pod) && podNameFilter(pod) && podLabelsFilter(pod);
}

function makePodNameFilter(nameFilter) {
    try {
        const nameRegex = new RegExp(nameFilter);
        return pod => nameFilter === '' || nameRegex.test(pod.name);
    } catch (e) {
        return () => true;
    }
}

function makePodNamespaceFilter(namespaceFilters) {
    return pod => namespaceFilters.length === 0 || namespaceFilters.includes(pod.namespace);
}

function makePodLabelsFilter(labelFilters) {
    return pod => labelFilters
        .filter(labelFilter => labelFilter.key !== null)
        .every(labelFilter => operatorMatches(labelFilter.operator, pod, labelFilter));
}

function operatorMatches(operator, pod, labelFilter) {
    switch (operator.op) {
        case 'eq':
            return pod.labels[labelFilter.key] === labelFilter.value;
        case 'neq':
            return pod.labels[labelFilter.key] !== labelFilter.value;
        case 'in':
            return labelFilter.value.includes(pod.labels[labelFilter.key]);
        case 'notin':
            return !labelFilter.value.includes(pod.labels[labelFilter.key]);
        case 'exists':
            return pod.labels[labelFilter.key] != null;
        case 'notexists':
            return pod.labels[labelFilter.key] == null;
        default:
            throw new Error('Unknown operator: ' + operator.op);
    }
}

function makePodIsolationFilter(filteredPodIds) {
    return podIsolation => filteredPodIds.has(podId(podIsolation.pod));
}

function makeAllowedRouteFilter(filteredPodIds) {
    return allowedRoute => filteredPodIds.has(podId(allowedRoute.sourcePod))
        && filteredPodIds.has(podId(allowedRoute.targetPod));
}

function makeServiceFilter(filteredPodIds) {
    return service => service.targetPods.some(pod => filteredPodIds.has(podId(pod)));
}

function makeIngressFilter(filteredServiceIds) {
    return ingress => ingress.targetServices.some(service =>
        filteredServiceIds.has(serviceId(service)));
}

function makeReplicaSetFilter(filteredPodIds) {
    return replicaSet => replicaSet.targetPods.some(pod => filteredPodIds.has(podId(pod)));
}

function makeStatefulSetFilter(filteredPodIds) {
    return statefulSet => statefulSet.targetPods.some(pod => filteredPodIds.has(podId(pod)));
}

function makeDaemonSetFilter(filteredPodIds) {
    return daemonSet => daemonSet.targetPods.some(pod => filteredPodIds.has(podId(pod)));
}

function makeDeploymentFilter(filteredReplicaSetIds) {
    return deployment => deployment.targetReplicaSets.some(replicaSet =>
        filteredReplicaSetIds.has(replicaSetId(replicaSet)));
}

function makePodHealthFilter(filteredPodIds) {
    return podHealth => filteredPodIds.has(podId(podHealth.pod));
}

function makePodMapper(controls) {
    const { showNamespacePrefix } = controls;
    return pod => ({
        ...pod,
        displayName: showNamespacePrefix ? `${pod.namespace}/${pod.name}` : pod.name
    });
}

function makePodIsolationMapper(controls, podMapper, podsIndex) {
    const { highlightPodsWithoutIngressIsolation, highlightPodsWithoutEgressIsolation } = controls;
    return podIsolation => ({
        ...podMapper(podsIndex.get(podId(podIsolation.pod))),
        isIngressIsolated: podIsolation.isIngressIsolated,
        isEgressIsolated: podIsolation.isEgressIsolated,
        highlighted: (highlightPodsWithoutIngressIsolation && !podIsolation.isIngressIsolated)
            || (highlightPodsWithoutEgressIsolation && !podIsolation.isEgressIsolated)
    });
}

function makeAllowedRouteMapper(controls, podIsolationMapper, podIsolationsIndex) {
    return allowedRoute => ({
        ...allowedRoute,
        sourcePod: podIsolationMapper(podIsolationsIndex.get(podId(allowedRoute.sourcePod))),
        targetPod: podIsolationMapper(podIsolationsIndex.get(podId(allowedRoute.targetPod)))
    });
}

function makeServiceMapper(controls, filteredPodIds) {
    const { showNamespacePrefix } = controls;
    return service => ({
        ...service,
        targetPods: service.targetPods.filter(pod => filteredPodIds.has(podId(pod))),
        displayName: showNamespacePrefix ? `${service.namespace}/${service.name}` : service.name
    });
}

function makeIngressMapper(controls, filteredServiceIds) {
    const { showNamespacePrefix } = controls;
    return ingress => ({
        ...ingress,
        targetServices: ingress.targetServices.filter(svc => filteredServiceIds.has(serviceId(svc))),
        displayName: showNamespacePrefix ? `${ingress.namespace}/${ingress.name}` : ingress.name
    });
}

function makeReplicaSetMapper(controls, filteredPodIds) {
    const { showNamespacePrefix } = controls;
    return replicaSet => ({
        ...replicaSet,
        targetPods: replicaSet.targetPods.filter(pod => filteredPodIds.has(podId(pod))),
        displayName: showNamespacePrefix ? `${replicaSet.namespace}/${replicaSet.name}` : replicaSet.name
    });
}

function makeStatefulSetMapper(controls, filteredPodIds) {
    const { showNamespacePrefix } = controls;
    return statefulSet => ({
        ...statefulSet,
        targetPods: statefulSet.targetPods.filter(pod => filteredPodIds.has(podId(pod))),
        displayName: showNamespacePrefix ? `${statefulSet.namespace}/${statefulSet.name}` : statefulSet.name
    });
}

function makeDaemonSetMapper(controls, filteredPodIds) {
    const { showNamespacePrefix } = controls;
    return daemonSet => ({
        ...daemonSet,
        targetPods: daemonSet.targetPods.filter(pod => filteredPodIds.has(podId(pod))),
        displayName: showNamespacePrefix ? `${daemonSet.namespace}/${daemonSet.name}` : daemonSet.name
    });
}

function makeDeploymentMapper(controls, filteredReplicaSetIds) {
    const { showNamespacePrefix } = controls;
    return deployment => ({
        ...deployment,
        targetReplicaSets: deployment.targetReplicaSets.filter(rs => filteredReplicaSetIds.has(replicaSetId(rs))),
        displayName: showNamespacePrefix ? `${deployment.namespace}/${deployment.name}` : deployment.name
    });
}

function makePodHealthMapper(controls, podMapper, podsIndex) {
    // const { highlightPodsWithoutIngressIsolation, highlightPodsWithoutEgressIsolation } = controls;
    return podHealth => ({
        ...podMapper(podsIndex.get(podId(podHealth.pod))),
        containers: podHealth.containers,
        containersRunning: podHealth.containersRunning,
        containersReady: podHealth.containersReady,
        containersWithoutRestart: podHealth.containersWithoutRestart
    });
}

function podId(pod) {
    return `${pod.namespace}/${pod.name}`;
}

function serviceId(service) {
    return `${service.namespace}/${service.name}`;
}

function replicaSetId(replicaSet) {
    return `${replicaSet.namespace}/${replicaSet.name}`;
}
