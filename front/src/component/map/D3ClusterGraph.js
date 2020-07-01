import * as d3 from 'd3';
import D3Graph from './D3Graph';

const CIRCLE_SIZE = 2;
const DIAMOND_HEIGHT = 5;
const DIAMOND_WIDTH = 8;
const SPACING = 20;

function d3PodId(pod) {
    return `${pod.namespace}/${pod.name}`;
}

function d3ServiceId(service) {
    return `${service.namespace}/${service.name}`;
}

function d3ServiceLinkId({ service, targetPod }) {
    return `${d3ServiceId(service)}->${d3PodId(targetPod)}`;
}

function d3Pod(pod) {
    const id = d3PodId(pod);
    return { id, displayName: pod.displayName, highlighted: pod.highlighted, podData: pod };
}

function d3Service(service) {
    const id = d3ServiceId(service);
    const targetPods = service.targetPods.map(targetPod => d3PodId(targetPod));
    return { id, displayName: service.displayName, targetPods, serviceData: service };
}

function d3ServiceLink({ service, targetPod }) {
    const id = d3ServiceLinkId({ service, targetPod });
    const source = d3ServiceId(service);
    const target = d3PodId(targetPod);
    return { id, source, target };
}

export default class D3ClusterGraph extends D3Graph {

    initInternal() {
        this.serviceLinks = {
            type: 'line',
            data: [],
            indexedData: new Map(),
            extractorFn: analysisResult => analysisResult.services.map(
                service => service.targetPods.map(
                    targetPod => ({ service, targetPod })
                )
            ).flat(),
            idFn: d3ServiceLinkId,
            datumFn: d3ServiceLink,
            itemSvgContainer: this.svg.append('g').attr('class', 'serviceLinksContainer')
        };
        this.pods = {
            type: 'circle',
            data: [],
            indexedData: new Map(),
            extractorFn: analysisResult => analysisResult.pods,
            idFn: d3PodId,
            datumFn: d3Pod,
            itemSvgContainer: this.svg.append('g').attr('class', 'podsContainer'),
            labelSvgContainer: this.svg.append('g').attr('class', 'podLabelsContainer'),
            applyCustomAttributes: selection => {
                selection
                    .attr('r', CIRCLE_SIZE)
                    .each((d, i, c) => {
                        d.fx = d.x = 5 * SPACING;
                        d.fy = d.y = SPACING * (i - (c.length - 1) / 2);
                    });
            }
        };
        this.services = {
            type: 'polygon',
            data: [],
            indexedData: new Map(),
            extractorFn: analysisResult => analysisResult.services,
            idFn: d3ServiceId,
            datumFn: d3Service,
            itemSvgContainer: this.svg.append('g').attr('class', 'servicesContainer'),
            labelSvgContainer: this.svg.append('g').attr('class', 'serviceLabelsContainer'),
            applyCustomAttributes: selection => {
                selection
                    .attr('points', `${-DIAMOND_WIDTH / 2},0 0,${-DIAMOND_HEIGHT / 2} ` +
                        `${DIAMOND_WIDTH / 2},0 0,${DIAMOND_HEIGHT / 2}`)
                    .each(d => {
                        if (d.fx == null) {
                            const targetPods = d.targetPods.map(targetPodId => this.pods.indexedData.get(targetPodId));
                            const targetPodsAvgY = targetPods.reduce((acc, p) => acc + p.y, 0) / targetPods.length;
                            d.fx = d.x = 0;
                            d.y = targetPodsAvgY;
                        }
                    });
            }
        };
    }

    getContent() {
        return [
            this.pods,
            this.services,
            this.serviceLinks
        ];
    }

    configureSimulation() {
        return d3.forceSimulation([])
            .force('link', d3.forceLink([]).id(d => d.id))
            .force('charge', d3.forceManyBody());
    }

    sortData() {
        const indexedPodsToService = new Map();
        this.services.data.forEach((service, i) => {
            service.index = i;
            service.targetPods.forEach(podId => {
                indexedPodsToService.set(podId, service);
            });
        });
        this.pods.data.sort((pod1, pod2) => {
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
}
