import { computeDataSet, fetchAnalysisResult } from './analysisResultService';

describe('fetchAnalysisResult', () => {

    const mockGlobalFetch = (value) => {
        global.fetch = jest.fn(() => {
            return Promise.resolve({
                status: 200,
                json: () => Promise.resolve(value)
            });
        });
    };

    it('should fetch analysis results and return body content', async () => {
        const analysisResult = {
            pods: [{ name: 'pod1', labels: {} }],
            podIsolations: [{ pod: { name: 'pod1' } }],
            allowedRoutes: [{ sourcePod: { name: 'pod1' }, targetPod: { name: 'pod2' } }],
            services: [{ name: 'service1' }],
            replicaSets: [{ name: 'replicaSet1' }],
            deployments: [{ name: 'deployment1' }]
        };
        mockGlobalFetch(analysisResult);

        const actual = await fetchAnalysisResult();

        expect(actual.pods).toEqual(analysisResult.pods);
        expect(actual.podIsolations).toEqual(analysisResult.podIsolations);
        expect(actual.allowedRoutes).toEqual(analysisResult.allowedRoutes);
        expect(actual.services).toEqual(analysisResult.services);
        expect(actual.replicaSets).toEqual(analysisResult.replicaSets);
        expect(actual.deployments).toEqual(analysisResult.deployments);
    });

    it('should aggregate all namespaces', async () => {
        const analysisResult = {
            pods: [
                { name: 'pod1', namespace: 'ns2', labels: {} },
                { name: 'pod2', namespace: 'ns2', labels: {} },
                { name: 'pod3', namespace: 'ns1', labels: {} }
            ]
        };
        mockGlobalFetch(analysisResult);

        const actual = await fetchAnalysisResult();

        expect(actual.allNamespaces).toEqual(['ns1', 'ns2']);
    });

    it('should aggregate all pod labels', async () => {
        const analysisResult = {
            pods: [
                { name: 'pod2', labels: { k2: 'v3' } },
                { name: 'pod1', labels: { k1: 'v1', k2: 'v2' } },
                { name: 'pod3', labels: { k1: 'v1' } }
            ]
        };
        mockGlobalFetch(analysisResult);

        const actual = await fetchAnalysisResult();

        expect(actual.allLabels).toEqual({ k1: ['v1'], k2: ['v2', 'v3'] });
    });
});

describe('computeDataSet', () => {
    const emptyAnalysisResult = {
        pods: [],
        podIsolations: [],
        allowedRoutes: [],
        services: [],
        replicaSets: [],
        deployments: []
    };
    const defaultNamespace = 'ns';
    const defaultControls = {
        showNamespacePrefix: false,
        namespaceFilters: [defaultNamespace],
        nameFilter: '',
        labelFilters: [],
        highlightPodsWithoutIngressIsolation: false,
        highlightPodsWithoutEgressIsolation: false,
        includeIngressNeighbors: false,
        includeEgressNeighbors: false
    };

    it('should filter pods by namespace', () => {
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { name: 'pod1', namespace: 'ns1' },
                { name: 'pod2', namespace: 'ns2' },
                { name: 'pod3', namespace: 'ns3' }
            ]
        };
        const controls = {
            ...defaultControls,
            namespaceFilters: ['ns1', 'ns3']
        };

        const actual = computeDataSet(analysisResult, controls);

        expect(actual.pods).toEqual([
            { name: 'pod1', namespace: 'ns1', displayName: 'pod1' },
            { name: 'pod3', namespace: 'ns3', displayName: 'pod3' }
        ]);
    });

    it('should filter pods by name with regex', () => {
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { name: 'pod1', namespace: defaultNamespace },
                { name: 'pod2', namespace: defaultNamespace },
                { name: 'pod3', namespace: defaultNamespace }
            ]
        };
        const controls = {
            ...defaultControls,
            nameFilter: '.*d[12]'
        };

        const actual = computeDataSet(analysisResult, controls);

        expect(actual.pods).toEqual([
            { name: 'pod1', namespace: defaultNamespace, displayName: 'pod1' },
            { name: 'pod2', namespace: defaultNamespace, displayName: 'pod2' }
        ]);
    });

    it('should filter pods by labels', () => {
        const selectedLabels = { k1: 'v1', k2: 'not-v2', k3: 'v3a', k4: 'v4c', k5: 'v5' };
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { name: 'pod1', namespace: defaultNamespace, labels: { ...selectedLabels, k1: 'not-v1' } },
                { name: 'pod2', namespace: defaultNamespace, labels: { ...selectedLabels, k2: 'v2' } },
                { name: 'pod3', namespace: defaultNamespace, labels: { ...selectedLabels, k3: 'v3c' } },
                { name: 'pod4', namespace: defaultNamespace, labels: { ...selectedLabels, k4: 'v4a' } },
                { name: 'pod5', namespace: defaultNamespace, labels: { ...selectedLabels, k5: undefined } },
                { name: 'pod6', namespace: defaultNamespace, labels: { ...selectedLabels, k6: 'any' } },
                { name: 'pod7', namespace: defaultNamespace, labels: selectedLabels }
            ]
        };
        const controls = {
            ...defaultControls,
            labelFilters: [
                { key: 'k1', operator: { op: 'eq' }, value: 'v1' },
                { key: 'k2', operator: { op: 'neq' }, value: 'v2' },
                { key: 'k3', operator: { op: 'in' }, value: ['v3a', 'v3b'] },
                { key: 'k4', operator: { op: 'notin' }, value: ['v4a', 'v4b'] },
                { key: 'k5', operator: { op: 'exists' } },
                { key: 'k6', operator: { op: 'notexists' } }
            ]
        };

        const actual = computeDataSet(analysisResult, controls);

        expect(actual.pods).toEqual([
            { name: 'pod7', namespace: defaultNamespace, displayName: 'pod7', labels: selectedLabels }
        ]);
    });

    it('should filter podIsolations using their pods', () => {
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { name: 'pod1', namespace: defaultNamespace },
                { name: 'pod2', namespace: defaultNamespace }
            ],
            podIsolations: [
                { pod: { name: 'pod1', namespace: defaultNamespace } },
                { pod: { name: 'pod2', namespace: defaultNamespace } }
            ]
        };
        const controls = {
            ...defaultControls,
            nameFilter: 'pod1'
        };

        const actual = computeDataSet(analysisResult, controls);

        expect(actual.podIsolations).toEqual([
            { name: 'pod1', namespace: defaultNamespace, displayName: 'pod1', highlighted: false }
        ]);
    });

    it('should filter allowed routes using their pods', () => {
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { name: 'pod1', namespace: defaultNamespace },
                { name: 'pod2', namespace: defaultNamespace },
                { name: 'pod3', namespace: defaultNamespace }
            ],
            podIsolations: [
                { pod: { name: 'pod1', namespace: defaultNamespace } },
                { pod: { name: 'pod2', namespace: defaultNamespace } },
                { pod: { name: 'pod3', namespace: defaultNamespace } }
            ],
            allowedRoutes: [
                {
                    name: 'route1', namespace: defaultNamespace,
                    sourcePod: { name: 'pod1', namespace: defaultNamespace },
                    targetPod: { name: 'pod2', namespace: defaultNamespace }
                },
                {
                    name: 'route2', namespace: defaultNamespace,
                    sourcePod: { name: 'pod1', namespace: defaultNamespace },
                    targetPod: { name: 'pod3', namespace: defaultNamespace }
                },
                {
                    name: 'route3', namespace: defaultNamespace,
                    sourcePod: { name: 'pod3', namespace: defaultNamespace },
                    targetPod: { name: 'pod2', namespace: defaultNamespace }
                }
            ]
        };
        const controls = {
            ...defaultControls,
            nameFilter: 'pod[12]'
        };

        const actual = computeDataSet(analysisResult, controls);

        expect(actual.allowedRoutes).toEqual([
            {
                name: 'route1', namespace: defaultNamespace,
                sourcePod: { name: 'pod1', namespace: defaultNamespace, displayName: 'pod1', highlighted: false },
                targetPod: { name: 'pod2', namespace: defaultNamespace, displayName: 'pod2', highlighted: false }
            }
        ]);
    });

    it('should filter services using their pods', () => {
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { name: 'pod1', namespace: defaultNamespace },
                { name: 'pod2', namespace: defaultNamespace }
            ],
            services: [
                {
                    name: 'svc1', targetPods: [
                        { name: 'pod1', namespace: defaultNamespace },
                        { name: 'pod2', namespace: defaultNamespace }
                    ]
                },
                {
                    name: 'svc2', targetPods: [
                        { name: 'pod1', namespace: defaultNamespace }
                    ]
                },
                {
                    name: 'svc3', targetPods: [
                        { name: 'pod2', namespace: defaultNamespace }
                    ]
                }
            ]
        };
        const controls = {
            ...defaultControls,
            nameFilter: 'pod1'
        };

        const actual = computeDataSet(analysisResult, controls);

        expect(actual.services).toEqual([
            {
                name: 'svc1', displayName: 'svc1', targetPods: [
                    { name: 'pod1', namespace: defaultNamespace },
                    { name: 'pod2', namespace: defaultNamespace }
                ]
            },
            {
                name: 'svc2', displayName: 'svc2', targetPods: [
                    { name: 'pod1', namespace: defaultNamespace }
                ]
            }
        ]);
    });

    it('should filter replicaSets using their pods', () => {
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { name: 'pod1', namespace: defaultNamespace },
                { name: 'pod2', namespace: defaultNamespace }
            ],
            replicaSets: [
                {
                    name: 'replicaSet1', namespace: defaultNamespace, targetPods: [
                        { name: 'pod1', namespace: defaultNamespace },
                        { name: 'pod2', namespace: defaultNamespace }
                    ]
                },
                {
                    name: 'replicaSet2', namespace: defaultNamespace, targetPods: [
                        { name: 'pod1', namespace: defaultNamespace }
                    ]
                },
                {
                    name: 'replicaSet3', namespace: defaultNamespace, targetPods: [
                        { name: 'pod2', namespace: defaultNamespace }
                    ]
                }
            ]
        };
        const controls = {
            ...defaultControls,
            nameFilter: 'pod1'
        };

        const actual = computeDataSet(analysisResult, controls);

        expect(actual.replicaSets).toEqual([
            {
                name: 'replicaSet1', namespace: defaultNamespace, displayName: 'replicaSet1', targetPods: [
                    { name: 'pod1', namespace: defaultNamespace },
                    { name: 'pod2', namespace: defaultNamespace }
                ]
            },
            {
                name: 'replicaSet2', namespace: defaultNamespace, displayName: 'replicaSet2', targetPods: [
                    { name: 'pod1', namespace: defaultNamespace }
                ]
            }
        ]);
    });

    it('should filter deployments using their replicaSets', () => {
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { name: 'pod1', namespace: defaultNamespace },
                { name: 'pod2', namespace: defaultNamespace },
                { name: 'pod3', namespace: defaultNamespace },
                { name: 'pod4', namespace: defaultNamespace }
            ],
            replicaSets: [
                {
                    name: 'replicaSet1', namespace: defaultNamespace, targetPods: [
                        { name: 'pod1', namespace: defaultNamespace }
                    ]
                },
                {
                    name: 'replicaSet2', namespace: defaultNamespace, targetPods: [
                        { name: 'pod2', namespace: defaultNamespace }
                    ]
                },
                {
                    name: 'replicaSet3', namespace: defaultNamespace, targetPods: [
                        { name: 'pod3', namespace: defaultNamespace }
                    ]
                },
                {
                    name: 'replicaSet4', namespace: defaultNamespace, targetPods: [
                        { name: 'pod4', namespace: defaultNamespace }
                    ]
                }
            ],
            deployments: [
                {
                    name: 'deployment1', namespace: defaultNamespace, targetReplicaSets: [
                        { name: 'replicaSet1', namespace: defaultNamespace },
                        { name: 'replicaSet3', namespace: defaultNamespace }
                    ]
                },
                {
                    name: 'deployment2', namespace: defaultNamespace, targetReplicaSets: [
                        { name: 'replicaSet2', namespace: defaultNamespace }
                    ]
                },
                {
                    name: 'deployment2', namespace: defaultNamespace, targetReplicaSets: [
                        { name: 'replicaSet4', namespace: defaultNamespace }
                    ]
                }
            ]
        };
        const controls = {
            ...defaultControls,
            nameFilter: 'pod[12]'
        };

        const actual = computeDataSet(analysisResult, controls);

        expect(actual.deployments).toEqual([
            {
                name: 'deployment1', namespace: defaultNamespace, displayName: 'deployment1', targetReplicaSets: [
                    { name: 'replicaSet1', namespace: defaultNamespace },
                    { name: 'replicaSet3', namespace: defaultNamespace }
                ]
            },
            {
                name: 'deployment2', namespace: defaultNamespace, displayName: 'deployment2', targetReplicaSets: [
                    { name: 'replicaSet2', namespace: defaultNamespace }
                ]
            }
        ]);
    });

    it('should include ingress neighbors', () => {
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { name: 'pod1', namespace: defaultNamespace },
                { name: 'pod2', namespace: defaultNamespace },
                { name: 'pod3', namespace: defaultNamespace }
            ],
            podIsolations: [
                { pod: { name: 'pod1', namespace: defaultNamespace } },
                { pod: { name: 'pod2', namespace: defaultNamespace } },
                { pod: { name: 'pod3', namespace: defaultNamespace } }
            ],
            allowedRoutes: [
                {
                    name: 'route1', namespace: defaultNamespace,
                    sourcePod: { name: 'pod2', namespace: defaultNamespace },
                    targetPod: { name: 'pod1', namespace: defaultNamespace }
                },
                {
                    name: 'route2', namespace: defaultNamespace,
                    sourcePod: { name: 'pod1', namespace: defaultNamespace },
                    targetPod: { name: 'pod3', namespace: defaultNamespace }
                }
            ]
        };
        const controls = {
            ...defaultControls,
            nameFilter: 'pod1',
            includeIngressNeighbors: true
        };

        const actual = computeDataSet(analysisResult, controls);

        expect(actual.podIsolations).toEqual([
            { name: 'pod1', namespace: defaultNamespace, displayName: 'pod1', highlighted: false },
            { name: 'pod2', namespace: defaultNamespace, displayName: 'pod2', highlighted: false }
        ]);
        expect(actual.allowedRoutes).toEqual([
            {
                name: 'route1', namespace: defaultNamespace,
                sourcePod: { name: 'pod2', namespace: defaultNamespace, displayName: 'pod2', highlighted: false },
                targetPod: { name: 'pod1', namespace: defaultNamespace, displayName: 'pod1', highlighted: false }
            }
        ]);
    });

    it('should include egress neighbors', () => {
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { name: 'pod1', namespace: defaultNamespace },
                { name: 'pod2', namespace: defaultNamespace },
                { name: 'pod3', namespace: defaultNamespace }
            ],
            podIsolations: [
                { pod: { name: 'pod1', namespace: defaultNamespace } },
                { pod: { name: 'pod2', namespace: defaultNamespace } },
                { pod: { name: 'pod3', namespace: defaultNamespace } }
            ],
            allowedRoutes: [
                {
                    name: 'route1', namespace: defaultNamespace,
                    sourcePod: { name: 'pod1', namespace: defaultNamespace },
                    targetPod: { name: 'pod2', namespace: defaultNamespace }
                },
                {
                    name: 'route2', namespace: defaultNamespace,
                    sourcePod: { name: 'pod2', namespace: defaultNamespace },
                    targetPod: { name: 'pod3', namespace: defaultNamespace }
                }
            ]
        };
        const controls = {
            ...defaultControls,
            nameFilter: 'pod1',
            includeEgressNeighbors: true
        };

        const actual = computeDataSet(analysisResult, controls);

        expect(actual.podIsolations).toEqual([
            { name: 'pod1', namespace: defaultNamespace, displayName: 'pod1', highlighted: false },
            { name: 'pod2', namespace: defaultNamespace, displayName: 'pod2', highlighted: false }
        ]);
        expect(actual.allowedRoutes).toEqual([
            {
                name: 'route1', namespace: defaultNamespace,
                sourcePod: { name: 'pod1', namespace: defaultNamespace, displayName: 'pod1', highlighted: false },
                targetPod: { name: 'pod2', namespace: defaultNamespace, displayName: 'pod2', highlighted: false }
            }
        ]);
    });

    it('should highlight podIsolations with no ingress isolation', () => {
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { name: 'pod1', namespace: defaultNamespace },
                { name: 'pod2', namespace: defaultNamespace }
            ],
            podIsolations: [
                {
                    pod: { name: 'pod1', namespace: defaultNamespace },
                    isIngressIsolated: false, isEgressIsolated: false
                },
                {
                    pod: { name: 'pod2', namespace: defaultNamespace },
                    isIngressIsolated: true, isEgressIsolated: false
                }
            ]
        };
        const controls = {
            ...defaultControls,
            highlightPodsWithoutIngressIsolation: true
        };

        const actual = computeDataSet(analysisResult, controls);

        expect(actual.podIsolations).toEqual([
            {
                name: 'pod1', namespace: defaultNamespace, displayName: 'pod1',
                isIngressIsolated: false, isEgressIsolated: false, highlighted: true
            },
            {
                name: 'pod2', namespace: defaultNamespace, displayName: 'pod2',
                isIngressIsolated: true, isEgressIsolated: false, highlighted: false
            }
        ]);
    });

    it('should highlight podIsolations with no egress isolation', () => {
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { name: 'pod1', namespace: defaultNamespace },
                { name: 'pod2', namespace: defaultNamespace }
            ],
            podIsolations: [
                {
                    pod: { name: 'pod1', namespace: defaultNamespace },
                    isIngressIsolated: false, isEgressIsolated: false
                },
                {
                    pod: { name: 'pod2', namespace: defaultNamespace },
                    isIngressIsolated: false, isEgressIsolated: true
                }
            ]
        };
        const controls = {
            ...defaultControls,
            highlightPodsWithoutEgressIsolation: true
        };

        const actual = computeDataSet(analysisResult, controls);

        expect(actual.podIsolations).toEqual([
            {
                name: 'pod1', namespace: defaultNamespace, displayName: 'pod1',
                isIngressIsolated: false, isEgressIsolated: false, highlighted: true
            },
            {
                name: 'pod2', namespace: defaultNamespace, displayName: 'pod2',
                isIngressIsolated: false, isEgressIsolated: true, highlighted: false
            }
        ]);
    });

    it('should include podIsolation data in allowed routes', () => {
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { name: 'pod1', namespace: defaultNamespace },
                { name: 'pod2', namespace: defaultNamespace }
            ],
            podIsolations: [
                {
                    pod: { name: 'pod1', namespace: defaultNamespace },
                    isIngressIsolated: true, isEgressIsolated: false
                },
                {
                    pod: { name: 'pod2', namespace: defaultNamespace },
                    isIngressIsolated: false, isEgressIsolated: true
                }
            ],
            allowedRoutes: [
                {
                    name: 'route1', namespace: defaultNamespace,
                    sourcePod: { name: 'pod1', namespace: defaultNamespace },
                    targetPod: { name: 'pod2', namespace: defaultNamespace }
                }
            ]
        };
        const controls = {
            ...defaultControls,
            highlightPodsWithoutIngressIsolation: true,
            highlightPodsWithoutEgressIsolation: true
        };

        const actual = computeDataSet(analysisResult, controls);

        expect(actual.allowedRoutes).toEqual([
            {
                name: 'route1', namespace: defaultNamespace,
                sourcePod: {
                    name: 'pod1', namespace: defaultNamespace, displayName: 'pod1',
                    isIngressIsolated: true, isEgressIsolated: false, highlighted: true
                },
                targetPod: {
                    name: 'pod2', namespace: defaultNamespace, displayName: 'pod2',
                    isIngressIsolated: false, isEgressIsolated: true, highlighted: true
                }
            }
        ]);
    });

    it('should include namespace prefix', () => {
        const namespace = 'some-namespace';
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { name: 'pod1', namespace: namespace },
                { name: 'pod2', namespace: namespace }
            ],
            podIsolations: [
                { pod: { name: 'pod1', namespace: namespace } },
                { pod: { name: 'pod2', namespace: namespace } }
            ],
            allowedRoutes: [
                {
                    name: 'route1', namespace: namespace,
                    sourcePod: { name: 'pod1', namespace: namespace },
                    targetPod: { name: 'pod2', namespace: namespace }
                }
            ],
            services: [
                {
                    name: 'svc1', namespace: namespace, targetPods: [
                        { name: 'pod1', namespace: namespace }
                    ]
                }
            ],
            replicaSets: [
                {
                    name: 'replicaSet1', namespace: namespace, targetPods: [
                        { name: 'pod1', namespace: namespace }
                    ]
                }
            ],
            deployments: [
                {
                    name: 'deployment1', namespace: namespace, targetReplicaSets: [
                        { name: 'replicaSet1', namespace: namespace }
                    ]
                }
            ]
        };
        const controls = {
            ...defaultControls,
            namespaceFilters: [namespace],
            showNamespacePrefix: true
        };

        const actual = computeDataSet(analysisResult, controls);

        expect(actual.pods.map(pod => pod.displayName)).toEqual([`${namespace}/pod1`, `${namespace}/pod2`]);
        expect(actual.podIsolations.map(podIsolation => podIsolation.displayName))
            .toEqual([`${namespace}/pod1`, `${namespace}/pod2`]);
        expect(actual.services.map(service => service.displayName))
            .toEqual([`${namespace}/svc1`]);
        expect(actual.replicaSets.map(replicaSet => replicaSet.displayName))
            .toEqual([`${namespace}/replicaSet1`]);
        expect(actual.deployments.map(deployment => deployment.displayName))
            .toEqual([`${namespace}/deployment1`]);
    });
});
