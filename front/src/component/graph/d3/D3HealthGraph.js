import D3Graph from './D3Graph';
import D3GraphItemLayer from './D3GraphItemLayer';
import { SPACING } from './D3Constants';

function d3PodId(pod) {
    return `pod/${pod.namespace}/${pod.name}`;
}

function d3Pod(pod) {
    const id = d3PodId(pod);
    return {
        id,
        displayName: pod.displayName,
        highlighted: pod.highlighted,
        namespace: pod.namespace,
        sourceData: pod
    };
}

export default class D3HealthGraph extends D3Graph {

    constructor() {
        super();
        this.podsLayer = new D3GraphItemLayer({
            name: 'pods',
            svgElement: 'circle',
            dataExtractor: dataSet => dataSet.podHealths,
            d3IdFn: d3PodId,
            d3DatumMapper: d3Pod,
            focusHandler: 'onPodFocus',
            svgElementAttributesApplier: (selection, dataChanged) => {
                selection
                    .attr('aria-label', 'pod')
                    .attr('r', 2)
                    .each(d => {
                        if (d.fx == null || (dataChanged & !d.pinned)) {
                            d.fx = d.x = 6 * SPACING * (this.podsToNamespacePositionIndex.get(d.id) - 1/2);
                            d.fy = d.y = SPACING * (this.podsToPositionInNamespaceIndex.get(d.id) - 2);
                        }
                    });
            }
        });
    }

    getItemLayers() {
        return [
            this.podsLayer
        ];
    }

    getLinkLayers() {
        return [];
    }

    sortLayersDataForNiceDisplay() {
        this.sortPodsByName();
        this.allNamespaces = this.buildNamespaceList();
        this.podsToNamespacePositionIndex = this.buildPodsToNamespacePositionIndex();
        this.podsToPositionInNamespaceIndex = this.buildPodsToPositionInNamespaceIndex(
            this.podsToNamespacePositionIndex);
    }

    sortPodsByName() {
        this.podsLayer.data.sort((pod1, pod2) => {
            return pod1.id.localeCompare(pod2.id);
        });
    }

    buildNamespaceList() {
        const allNamespaces = [...new Set(this.podsLayer.data.map(pod => pod.namespace))];
        allNamespaces.sort((ns1, ns2) => ns1.localeCompare(ns2));
        return allNamespaces;
    }

    buildPodsToNamespacePositionIndex() {
        const podsToNamespaceIndex = new Map();
        this.podsLayer.data.forEach(pod => podsToNamespaceIndex.set(pod.id, this.allNamespaces.indexOf(pod.namespace)));
        return podsToNamespaceIndex;
    }

    buildPodsToPositionInNamespaceIndex(podsToNamespacePositionIndex) {
        const podCountByNamespace = this.allNamespaces.map(() => 0);
        const podsToPositionInNamespaceIndex = new Map();
        this.podsLayer.data.forEach(pod => {
            const podNamespacePosition = podsToNamespacePositionIndex.get(pod.id);
            const podPositionInNamespace = podCountByNamespace[podNamespacePosition]++;
            podsToPositionInNamespaceIndex.set(pod.id, podPositionInNamespace);
        });
        return podsToPositionInNamespaceIndex;
    }
}
