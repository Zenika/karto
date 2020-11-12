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
    const filteredReplicaSetIds = new Set();

    const podFilter = makePodFilter(controls);
    const podIsolationFilter = makePodIsolationFilter(filteredPodIds);
    const allowedRouteFilter = makeAllowedRouteFilter(filteredPodIds);
    const serviceFilter = makeServiceFilter(filteredPodIds);
    const replicaSetFilter = makeReplicaSetFilter(filteredPodIds);
    const deploymentFilter = makeDeploymentFilter(filteredReplicaSetIds);

    const filteredPods = analysisResult.pods.filter(podFilter);
    filteredPods.forEach(pod => filteredPodIds.add(podId(pod)));
    const filteredPodIsolations = analysisResult.podIsolations.filter(podIsolationFilter);
    const filteredAllowedRoutes = analysisResult.allowedRoutes.filter(allowedRouteFilter);
    const filteredServices = analysisResult.services.filter(serviceFilter);
    const filteredReplicaSets = analysisResult.replicaSets.filter(replicaSetFilter);
    filteredReplicaSets.forEach(replicaSet => filteredReplicaSetIds.add(replicaSetId(replicaSet)));
    const filteredDeployments = analysisResult.deployments.filter(deploymentFilter);
    const { neighborPodIsolations, neighborAllowedRoutes } = computeNeighbors(analysisResult, filteredPodIds,
        podIsolationsIndex, controls);

    return {
        pods: filteredPods,
        podIsolations: [...filteredPodIsolations, ...neighborPodIsolations],
        allowedRoutes: [...filteredAllowedRoutes, ...neighborAllowedRoutes],
        services: filteredServices,
        replicaSets: filteredReplicaSets,
        deployments: filteredDeployments
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
    const podMapper = makePodMapper(controls);
    const podIsolationMapper = makePodIsolationMapper(controls, podMapper, podsIndex);
    const allowedRouteMapper = makeAllowedRouteMapper(controls, podIsolationMapper, podIsolationsIndex);
    const serviceMapper = makeServiceMapper(controls);
    const replicaSetMapper = makeReplicaSetMapper(controls);
    const deploymentMapper = makeDeploymentMapper(controls);

    return {
        pods: filteredAnalysisResult.pods.map(podMapper),
        podIsolations: filteredAnalysisResult.podIsolations.map(podIsolationMapper),
        allowedRoutes: filteredAnalysisResult.allowedRoutes.map(allowedRouteMapper),
        services: filteredAnalysisResult.services.map(serviceMapper),
        replicaSets: filteredAnalysisResult.replicaSets.map(replicaSetMapper),
        deployments: filteredAnalysisResult.deployments.map(deploymentMapper)
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
    let nameRegex;
    try {
        nameRegex = new RegExp(nameFilter);
    } catch (e) {
        nameRegex = new RegExp('.*');
    }
    return pod => nameFilter === '' || nameRegex.test(pod.name);
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

function makeReplicaSetFilter(filteredPodIds) {
    return replicaSet => replicaSet.targetPods.some(pod => filteredPodIds.has(podId(pod)));
}

function makeDeploymentFilter(filteredReplicaSetIds) {
    return deployment => deployment.targetReplicaSets.some(replicaSet =>
        filteredReplicaSetIds.has(replicaSetId(replicaSet)));
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

function makeServiceMapper(controls) {
    const { showNamespacePrefix } = controls;
    return service => ({
        ...service,
        displayName: showNamespacePrefix ? `${service.namespace}/${service.name}` : service.name
    });
}

function makeReplicaSetMapper(controls) {
    const { showNamespacePrefix } = controls;
    return replicaSet => ({
        ...replicaSet,
        displayName: showNamespacePrefix ? `${replicaSet.namespace}/${replicaSet.name}` : replicaSet.name
    });
}

function makeDeploymentMapper(controls) {
    const { showNamespacePrefix } = controls;
    return deployment => ({
        ...deployment,
        displayName: showNamespacePrefix ? `${deployment.namespace}/${deployment.name}` : deployment.name
    });
}

function podId(pod) {
    return `${pod.namespace}/${pod.name}`;
}

function replicaSetId(replicaSet) {
    return `${replicaSet.namespace}/${replicaSet.name}`;
}
