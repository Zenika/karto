export const labelSelectorOperators = [
    { op: 'eq', label: '=', args: 'single' },
    { op: 'neq', label: '!=', args: 'single' },
    { op: 'in', label: 'in', args: 'multiple' },
    { op: 'notin', label: 'not in', args: 'multiple' },
    { op: 'exists', label: 'exists', args: 'none' },
    { op: 'notexists', label: 'not exists', args: 'none' }
];

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

export function computeAnalysisResultView(analysisResult, controls) {
    if (analysisResult == null) {
        return null;
    }
    const {
        namespaceFilters, labelFilters, nameFilter, showNamespacePrefix,
        highlightPodsWithoutIngressIsolation, highlightPodsWithoutEgressIsolation,
        includeIngressNeighbors, includeEgressNeighbors
    } = controls;

    // Index pods by id for faster access
    const podsById = new Map();
    analysisResult.pods.forEach(pod => podsById.set(podId(pod), pod));
    const filteredPodIds = new Set();
    const neighborPodIds = new Set();

    let nameRegex;
    try {
        nameRegex = new RegExp(nameFilter);
    } catch (e) {
        nameRegex = new RegExp('.*');
    }

    const podFilter = pod => {
        const namespaceMatches = namespaceFilters.length === 0 || namespaceFilters.includes(pod.namespace);
        const labelsMatch = labelFilters.filter(labelFilter => labelFilter.key !== null).every(labelFilter => {
            const podLabelValue = pod.labels[labelFilter.key];
            switch (labelFilter.operator.op) {
                case 'eq':
                    return podLabelValue === labelFilter.value;
                case 'neq':
                    return podLabelValue !== labelFilter.value;
                case 'exists':
                    return podLabelValue != null;
                case 'notexists':
                    return podLabelValue == null;
                case 'in':
                    return labelFilter.value.includes(podLabelValue);
                case 'notin':
                    return !labelFilter.value.includes(podLabelValue);
                default:
                    throw new Error(`invalid operator ${labelFilter.operator.op}`);
            }
        });
        const nameMatches = nameFilter === '' || nameRegex.test(pod.name);
        return namespaceMatches && labelsMatch && nameMatches;
    };
    const podMapper = pod => ({
        ...pod,
        displayName: showNamespacePrefix ? `${pod.namespace}/${pod.name}` : pod.name,
        highlighted: (highlightPodsWithoutIngressIsolation && !pod.isIngressIsolated)
            || (highlightPodsWithoutEgressIsolation && !pod.isEgressIsolated)
    });
    const allowedRouteMapper = allowedRoute => ({
        ...allowedRoute,
        sourcePod: podsById.get(podId(allowedRoute.sourcePod)),
        targetPod: podsById.get(podId(allowedRoute.targetPod))
    });
    const serviceMapper = service => ({
        ...service,
        displayName: showNamespacePrefix ? `${service.namespace}/${service.name}` : service.name
    });
    const replicaSetMapper = replicaSet => ({
        ...replicaSet,
        displayName: showNamespacePrefix ? `${replicaSet.namespace}/${replicaSet.name}` : replicaSet.name
    });

    // Apply filters
    const filteredPods = analysisResult.pods.filter(podFilter);
    filteredPods.forEach(pod => filteredPodIds.add(podId(pod)));
    const filteredAllowedRoutes = analysisResult.allowedRoutes.filter(allowedRoute =>
        filteredPodIds.has(podId(allowedRoute.sourcePod)) && filteredPodIds.has(podId(allowedRoute.targetPod))
    );
    const filteredServices = analysisResult.services.filter(service =>
        service.targetPods.some(pod => filteredPodIds.has(podId(pod)))
    );
    const filteredReplicaSets = analysisResult.replicaSets.filter(replicaSet =>
        replicaSet.targetPods.some(pod => filteredPodIds.has(podId(pod)))
    );

    // Include neighbors
    analysisResult.allowedRoutes.forEach(allowedRoute => {
        const sourcePodId = podId(allowedRoute.sourcePod);
        const targetPodId = podId(allowedRoute.targetPod);
        if (includeIngressNeighbors && !filteredPodIds.has(sourcePodId) && filteredPodIds.has(targetPodId)) {
            if (!neighborPodIds.has(sourcePodId)) {
                neighborPodIds.add(sourcePodId);
                filteredPods.push(podsById.get(sourcePodId));
            }
            filteredAllowedRoutes.push(allowedRoute);
        }
        if (includeEgressNeighbors && !filteredPodIds.has(targetPodId) && filteredPodIds.has(sourcePodId)) {
            if (!neighborPodIds.has(targetPodId)) {
                neighborPodIds.add(targetPodId);
                filteredPods.push(podsById.get(targetPodId));
            }
            filteredAllowedRoutes.push(allowedRoute);
        }
    });

    return {
        pods: filteredPods.map(podMapper),
        allowedRoutes: filteredAllowedRoutes.map(allowedRouteMapper),
        services: filteredServices.map(serviceMapper),
        replicaSets: filteredReplicaSets.map(replicaSetMapper)
    };
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

function podId(pod) {
    return `${pod.namespace}/${pod.name}`;
}
