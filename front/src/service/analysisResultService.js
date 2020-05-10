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
        highlightPodsWithoutIngressIsolation, highlightPodsWithoutEgressIsolation
    } = controls;
    const namespaceMatches = (pod) => {
        return namespaceFilters.length === 0 || namespaceFilters.includes(pod.namespace);
    };
    const labelsMatch = (pod) => {
        const labels = labelsToStringList(pod);
        return labelFilters.length === 0 || labelFilters.every(labelFilter => labels.includes(labelFilter));
    };
    const nameRegex = new RegExp(nameFilter);
    const nameMatches = (pod) => {
        return nameFilter === '' || nameRegex.test(pod.name);
    };
    const podFilter = pod => {
        return namespaceMatches(pod) && labelsMatch(pod) && nameMatches(pod);
    };
    const podMapper = pod => ({
        ...pod,
        displayName: showNamespacePrefix ? `${pod.namespace}/${pod.name}` : pod.name,
        highlighted: (highlightPodsWithoutIngressIsolation && !pod.isIngressIsolated)
            || (highlightPodsWithoutEgressIsolation && !pod.isEgressIsolated)
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
