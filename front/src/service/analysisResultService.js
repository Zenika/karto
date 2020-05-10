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

    const nameRegex = new RegExp(nameFilter);
    const podFilter = pod => {
        const namespaceMatches = namespaceFilters.length === 0 || namespaceFilters.includes(pod.namespace);
        const labels = labelsToStringList(pod);
        const labelsMatch = labelFilters.length === 0
            || labelFilters.every(labelFilter => labels.includes(labelFilter));
        const nameMatches = nameFilter === '' || nameRegex.test(pod.name);
        return namespaceMatches && labelsMatch && nameMatches;
    };
    const podMapper = pod => ({
        ...pod,
        displayName: showNamespacePrefix ? `${pod.namespace}/${pod.name}` : pod.name,
        highlighted: (highlightPodsWithoutIngressIsolation && !pod.isIngressIsolated)
            || (highlightPodsWithoutEgressIsolation && !pod.isEgressIsolated)
    });

    // Index pods by id for faster access
    const podsById = new Map();
    analysisResult.pods.forEach(pod => podsById.set(podId(pod), pod));
    const filteredPodsIds = new Set();
    const neighborPodsIds = new Set();

    // Apply filters
    const filteredPods = analysisResult.pods.filter(podFilter);
    filteredPods.forEach(pod => filteredPodsIds.add(podId(pod)));
    const filteredAllowedRoutes = analysisResult.allowedRoutes.filter(allowedRoute =>
        filteredPodsIds.has(podId(allowedRoute.sourcePod)) && filteredPodsIds.has(podId(allowedRoute.targetPod))
    );

    // Include neighbors
    analysisResult.allowedRoutes.forEach(allowedRoute => {
        const sourcePodId = podId(allowedRoute.sourcePod);
        const targetPodId = podId(allowedRoute.targetPod);
        if (includeIngressNeighbors && !filteredPodsIds.has(sourcePodId) && filteredPodsIds.has(targetPodId)) {
            if (!neighborPodsIds.has(sourcePodId)) {
                neighborPodsIds.add(sourcePodId);
                filteredPods.push(podsById.get(sourcePodId));
            }
            filteredAllowedRoutes.push(allowedRoute);
        }
        if (includeEgressNeighbors && !filteredPodsIds.has(targetPodId) && filteredPodsIds.has(sourcePodId)) {
            if (!neighborPodsIds.has(targetPodId)) {
                neighborPodsIds.add(targetPodId);
                filteredPods.push(podsById.get(targetPodId));
            }
            filteredAllowedRoutes.push(allowedRoute);
        }
    });

    return {
        pods: filteredPods.map(podMapper),
        allowedRoutes: filteredAllowedRoutes
    };
}

function allNamespacesOfPods(pods) {
    return distinctAndSort(pods.map(pod => pod.namespace));
}

function allLabelsOfPods(pods) {
    return distinctAndSort(pods.map(labelsToStringList).flat());
}

function distinctAndSort(arr) {
    return [...new Set(arr)].sort();
}

function labelsToStringList(pod) {
    return Object.entries(pod.labels).map(([key, value]) => `${key}=${value}`);
}

function podId(pod) {
    return `${pod.namespace}/${pod.name}`;
}
