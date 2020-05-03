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
    const { namespaceFilters, labelFilters, showNamespacePrefix, highlightNonIsolatedPods } = controls;
    const podFilter = pod => {
        const namespaceMatches = namespaceFilters.length === 0 || namespaceFilters.includes(pod.namespace);
        const labels = labelsToStringList(pod);
        const labelsMatch = labelFilters.length === 0
            || labelFilters.every(labelFilter => labels.includes(labelFilter));
        return namespaceMatches && labelsMatch;
    };
    const podMapper = pod => ({
        ...pod,
        displayName: showNamespacePrefix ? `${pod.namespace}/${pod.name}` : pod.name,
        highlighted: highlightNonIsolatedPods && !pod.isIngressIsolated && !pod.isEgressIsolated
    });
    return {
        pods: analysisResult.pods.filter(podFilter).map(podMapper),
        allowedRoutes: analysisResult.allowedRoutes
            .filter(allowedRoute => podFilter(allowedRoute.sourcePod) && podFilter(allowedRoute.targetPod))
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
