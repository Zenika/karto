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
