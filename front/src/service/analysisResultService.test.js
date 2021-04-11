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

    it('fetches analysis results and returns body content', async () => {
        const analysisResult = {
            pods: [{ name: 'pod1', labels: {} }],
            podIsolations: [{ pod: { name: 'pod1' } }],
            allowedRoutes: [{ sourcePod: { name: 'pod1' }, targetPod: { name: 'pod2' } }],
            services: [{ name: 'service1' }],
            ingresses: [{ name: 'ingress1' }],
            replicaSets: [{ name: 'replicaSet1' }],
            statefulSets: [{ name: 'statefulSet1' }],
            daemonSets: [{ name: 'daemonSet1' }],
            deployments: [{ name: 'deployment1' }],
            podHealths: [{ pod: { name: 'pod1' } }]
        };
        mockGlobalFetch(analysisResult);

        const actual = await fetchAnalysisResult();

        expect(actual.pods).toEqual(analysisResult.pods);
        expect(actual.podIsolations).toEqual(analysisResult.podIsolations);
        expect(actual.allowedRoutes).toEqual(analysisResult.allowedRoutes);
        expect(actual.services).toEqual(analysisResult.services);
        expect(actual.ingresses).toEqual(analysisResult.ingresses);
        expect(actual.replicaSets).toEqual(analysisResult.replicaSets);
        expect(actual.statefulSets).toEqual(analysisResult.statefulSets);
        expect(actual.daemonSets).toEqual(analysisResult.daemonSets);
        expect(actual.deployments).toEqual(analysisResult.deployments);
        expect(actual.podHealths).toEqual(analysisResult.podHealths);
    });

    it('aggregates all namespaces', async () => {
        const analysisResult = {
            pods: [
                { namespace: 'ns2', name: 'pod1', labels: {} },
                { namespace: 'ns2', name: 'pod2', labels: {} },
                { namespace: 'ns1', name: 'pod3', labels: {} }
            ]
        };
        mockGlobalFetch(analysisResult);

        const actual = await fetchAnalysisResult();

        expect(actual.allNamespaces).toEqual(['ns1', 'ns2']);
    });

    it('aggregates all pod labels', async () => {
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
        ingresses: [],
        replicaSets: [],
        statefulSets: [],
        daemonSets: [],
        deployments: [],
        podHealths: []
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

    it('filters pods by namespace', () => {
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { namespace: 'ns1', name: 'pod1' },
                { namespace: 'ns2', name: 'pod2' },
                { namespace: 'ns3', name: 'pod3' }
            ]
        };
        const controls = {
            ...defaultControls,
            namespaceFilters: ['ns1', 'ns3']
        };

        const actual = computeDataSet(analysisResult, controls);

        expect(actual.pods).toEqual([
            { namespace: 'ns1', name: 'pod1', displayName: 'pod1' },
            { namespace: 'ns3', name: 'pod3', displayName: 'pod3' }
        ]);
    });

    it('filters pods by name with regex', () => {
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { namespace: defaultNamespace, name: 'pod1' },
                { namespace: defaultNamespace, name: 'pod2' },
                { namespace: defaultNamespace, name: 'pod3' }
            ]
        };
        const controls = {
            ...defaultControls,
            nameFilter: '.*d[12]'
        };

        const actual = computeDataSet(analysisResult, controls);

        expect(actual.pods).toEqual([
            { namespace: defaultNamespace, name: 'pod1', displayName: 'pod1' },
            { namespace: defaultNamespace, name: 'pod2', displayName: 'pod2' }
        ]);
    });

    it('filters pods by name with invalid regex treated as no filter', () => {
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { namespace: defaultNamespace, name: 'pod1' }
            ]
        };
        const controls = {
            ...defaultControls,
            nameFilter: '/\\invalid regex/\\'
        };

        const actual = computeDataSet(analysisResult, controls);

        expect(actual.pods).toEqual([
            { namespace: defaultNamespace, name: 'pod1', displayName: 'pod1' }
        ]);
    });

    it('filters pods by labels', () => {
        const selectedLabels = { k1: 'v1', k2: 'not-v2', k3: 'v3a', k4: 'v4c', k5: 'v5' };
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { namespace: defaultNamespace, name: 'pod1', labels: { ...selectedLabels, k1: 'not-v1' } },
                { namespace: defaultNamespace, name: 'pod2', labels: { ...selectedLabels, k2: 'v2' } },
                { namespace: defaultNamespace, name: 'pod3', labels: { ...selectedLabels, k3: 'v3c' } },
                { namespace: defaultNamespace, name: 'pod4', labels: { ...selectedLabels, k4: 'v4a' } },
                { namespace: defaultNamespace, name: 'pod5', labels: { ...selectedLabels, k5: undefined } },
                { namespace: defaultNamespace, name: 'pod6', labels: { ...selectedLabels, k6: 'any' } },
                { namespace: defaultNamespace, name: 'pod7', labels: selectedLabels }
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
            { namespace: defaultNamespace, name: 'pod7', displayName: 'pod7', labels: selectedLabels }
        ]);
    });

    it('filters podIsolations using their pods', () => {
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { namespace: defaultNamespace, name: 'pod1' },
                { namespace: defaultNamespace, name: 'pod2' }
            ],
            podIsolations: [
                { pod: { namespace: defaultNamespace, name: 'pod1' } },
                { pod: { namespace: defaultNamespace, name: 'pod2' } }
            ]
        };
        const controls = {
            ...defaultControls,
            nameFilter: 'pod1'
        };

        const actual = computeDataSet(analysisResult, controls);

        expect(actual.podIsolations).toEqual([
            { namespace: defaultNamespace, name: 'pod1', displayName: 'pod1', highlighted: false }
        ]);
    });

    it('filters allowed routes using their pods', () => {
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { namespace: defaultNamespace, name: 'pod1' },
                { namespace: defaultNamespace, name: 'pod2' },
                { namespace: defaultNamespace, name: 'pod3' }
            ],
            podIsolations: [
                { pod: { namespace: defaultNamespace, name: 'pod1' } },
                { pod: { namespace: defaultNamespace, name: 'pod2' } },
                { pod: { namespace: defaultNamespace, name: 'pod3' } }
            ],
            allowedRoutes: [
                {
                    namespace: defaultNamespace, name: 'route1',
                    sourcePod: { namespace: defaultNamespace, name: 'pod1' },
                    targetPod: { namespace: defaultNamespace, name: 'pod2' }
                },
                {
                    namespace: defaultNamespace, name: 'route2',
                    sourcePod: { namespace: defaultNamespace, name: 'pod1' },
                    targetPod: { namespace: defaultNamespace, name: 'pod3' }
                },
                {
                    namespace: defaultNamespace, name: 'route3',
                    sourcePod: { namespace: defaultNamespace, name: 'pod3' },
                    targetPod: { namespace: defaultNamespace, name: 'pod2' }
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
                namespace: defaultNamespace, name: 'route1',
                sourcePod: { namespace: defaultNamespace, name: 'pod1', displayName: 'pod1', highlighted: false },
                targetPod: { namespace: defaultNamespace, name: 'pod2', displayName: 'pod2', highlighted: false }
            }
        ]);
    });

    it('filters services using their pods', () => {
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { namespace: defaultNamespace, name: 'pod1' },
                { namespace: defaultNamespace, name: 'pod2' }
            ],
            services: [
                {
                    name: 'svc1', targetPods: [
                        { namespace: defaultNamespace, name: 'pod1' },
                        { namespace: defaultNamespace, name: 'pod2' }
                    ]
                },
                {
                    name: 'svc2', targetPods: [
                        { namespace: defaultNamespace, name: 'pod1' }
                    ]
                },
                {
                    name: 'svc3', targetPods: [
                        { namespace: defaultNamespace, name: 'pod2' }
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
                    { namespace: defaultNamespace, name: 'pod1' }
                ]
            },
            {
                name: 'svc2', displayName: 'svc2', targetPods: [
                    { namespace: defaultNamespace, name: 'pod1' }
                ]
            }
        ]);
    });

    it('filters ingresses using their services', () => {
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { namespace: defaultNamespace, name: 'pod1' },
                { namespace: defaultNamespace, name: 'pod2' },
                { namespace: defaultNamespace, name: 'pod3' },
                { namespace: defaultNamespace, name: 'pod4' }
            ],
            services: [
                {
                    namespace: defaultNamespace, name: 'service1', targetPods: [
                        { namespace: defaultNamespace, name: 'pod1' }
                    ]
                },
                {
                    namespace: defaultNamespace, name: 'service2', targetPods: [
                        { namespace: defaultNamespace, name: 'pod2' }
                    ]
                },
                {
                    namespace: defaultNamespace, name: 'service3', targetPods: [
                        { namespace: defaultNamespace, name: 'pod3' }
                    ]
                },
                {
                    namespace: defaultNamespace, name: 'service4', targetPods: [
                        { namespace: defaultNamespace, name: 'pod4' }
                    ]
                }
            ],
            ingresses: [
                {
                    namespace: defaultNamespace, name: 'ingress1', targetServices: [
                        { namespace: defaultNamespace, name: 'service1' },
                        { namespace: defaultNamespace, name: 'service3' }
                    ]
                },
                {
                    namespace: defaultNamespace, name: 'ingress2', targetServices: [
                        { namespace: defaultNamespace, name: 'service2' }
                    ]
                },
                {
                    namespace: defaultNamespace, name: 'ingress2', targetServices: [
                        { namespace: defaultNamespace, name: 'service4' }
                    ]
                }
            ]
        };
        const controls = {
            ...defaultControls,
            nameFilter: 'pod[12]'
        };

        const actual = computeDataSet(analysisResult, controls);

        expect(actual.ingresses).toEqual([
            {
                namespace: defaultNamespace, name: 'ingress1', displayName: 'ingress1', targetServices: [
                    { namespace: defaultNamespace, name: 'service1' }
                ]
            },
            {
                namespace: defaultNamespace, name: 'ingress2', displayName: 'ingress2', targetServices: [
                    { namespace: defaultNamespace, name: 'service2' }
                ]
            }
        ]);
    });

    it('filters replicaSets using their pods', () => {
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { namespace: defaultNamespace, name: 'pod1' },
                { namespace: defaultNamespace, name: 'pod2' }
            ],
            replicaSets: [
                {
                    namespace: defaultNamespace, name: 'replicaSet1', targetPods: [
                        { namespace: defaultNamespace, name: 'pod1' },
                        { namespace: defaultNamespace, name: 'pod2' }
                    ]
                },
                {
                    namespace: defaultNamespace, name: 'replicaSet2', targetPods: [
                        { namespace: defaultNamespace, name: 'pod1' }
                    ]
                },
                {
                    namespace: defaultNamespace, name: 'replicaSet3', targetPods: [
                        { namespace: defaultNamespace, name: 'pod2' }
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
                namespace: defaultNamespace, name: 'replicaSet1', displayName: 'replicaSet1', targetPods: [
                    { namespace: defaultNamespace, name: 'pod1' }
                ]
            },
            {
                namespace: defaultNamespace, name: 'replicaSet2', displayName: 'replicaSet2', targetPods: [
                    { namespace: defaultNamespace, name: 'pod1' }
                ]
            }
        ]);
    });

    it('filters statefulSets using their pods', () => {
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { namespace: defaultNamespace, name: 'pod1' },
                { namespace: defaultNamespace, name: 'pod2' }
            ],
            statefulSets: [
                {
                    namespace: defaultNamespace, name: 'statefulSet1', targetPods: [
                        { namespace: defaultNamespace, name: 'pod1' },
                        { namespace: defaultNamespace, name: 'pod2' }
                    ]
                },
                {
                    namespace: defaultNamespace, name: 'statefulSet2', targetPods: [
                        { namespace: defaultNamespace, name: 'pod1' }
                    ]
                },
                {
                    namespace: defaultNamespace, name: 'statefulSet3', targetPods: [
                        { namespace: defaultNamespace, name: 'pod2' }
                    ]
                }
            ]
        };
        const controls = {
            ...defaultControls,
            nameFilter: 'pod1'
        };

        const actual = computeDataSet(analysisResult, controls);

        expect(actual.statefulSets).toEqual([
            {
                namespace: defaultNamespace, name: 'statefulSet1', displayName: 'statefulSet1', targetPods: [
                    { namespace: defaultNamespace, name: 'pod1' }
                ]
            },
            {
                namespace: defaultNamespace, name: 'statefulSet2', displayName: 'statefulSet2', targetPods: [
                    { namespace: defaultNamespace, name: 'pod1' }
                ]
            }
        ]);
    });

    it('filters daemonSets using their pods', () => {
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { namespace: defaultNamespace, name: 'pod1' },
                { namespace: defaultNamespace, name: 'pod2' }
            ],
            daemonSets: [
                {
                    namespace: defaultNamespace, name: 'daemonSet1', targetPods: [
                        { namespace: defaultNamespace, name: 'pod1' },
                        { namespace: defaultNamespace, name: 'pod2' }
                    ]
                },
                {
                    namespace: defaultNamespace, name: 'daemonSet2', targetPods: [
                        { namespace: defaultNamespace, name: 'pod1' }
                    ]
                },
                {
                    namespace: defaultNamespace, name: 'daemonSet3', targetPods: [
                        { namespace: defaultNamespace, name: 'pod2' }
                    ]
                }
            ]
        };
        const controls = {
            ...defaultControls,
            nameFilter: 'pod1'
        };

        const actual = computeDataSet(analysisResult, controls);

        expect(actual.daemonSets).toEqual([
            {
                namespace: defaultNamespace, name: 'daemonSet1', displayName: 'daemonSet1', targetPods: [
                    { namespace: defaultNamespace, name: 'pod1' }
                ]
            },
            {
                namespace: defaultNamespace, name: 'daemonSet2', displayName: 'daemonSet2', targetPods: [
                    { namespace: defaultNamespace, name: 'pod1' }
                ]
            }
        ]);
    });

    it('filters deployments using their replicaSets', () => {
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { namespace: defaultNamespace, name: 'pod1' },
                { namespace: defaultNamespace, name: 'pod2' },
                { namespace: defaultNamespace, name: 'pod3' },
                { namespace: defaultNamespace, name: 'pod4' }
            ],
            replicaSets: [
                {
                    namespace: defaultNamespace, name: 'replicaSet1', targetPods: [
                        { namespace: defaultNamespace, name: 'pod1' }
                    ]
                },
                {
                    namespace: defaultNamespace, name: 'replicaSet2', targetPods: [
                        { namespace: defaultNamespace, name: 'pod2' }
                    ]
                },
                {
                    namespace: defaultNamespace, name: 'replicaSet3', targetPods: [
                        { namespace: defaultNamespace, name: 'pod3' }
                    ]
                },
                {
                    namespace: defaultNamespace, name: 'replicaSet4', targetPods: [
                        { namespace: defaultNamespace, name: 'pod4' }
                    ]
                }
            ],
            deployments: [
                {
                    namespace: defaultNamespace, name: 'deployment1', targetReplicaSets: [
                        { namespace: defaultNamespace, name: 'replicaSet1' },
                        { namespace: defaultNamespace, name: 'replicaSet3' }
                    ]
                },
                {
                    namespace: defaultNamespace, name: 'deployment2', targetReplicaSets: [
                        { namespace: defaultNamespace, name: 'replicaSet2' }
                    ]
                },
                {
                    namespace: defaultNamespace, name: 'deployment2', targetReplicaSets: [
                        { namespace: defaultNamespace, name: 'replicaSet4' }
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
                namespace: defaultNamespace, name: 'deployment1', displayName: 'deployment1', targetReplicaSets: [
                    { namespace: defaultNamespace, name: 'replicaSet1' }
                ]
            },
            {
                namespace: defaultNamespace, name: 'deployment2', displayName: 'deployment2', targetReplicaSets: [
                    { namespace: defaultNamespace, name: 'replicaSet2' }
                ]
            }
        ]);
    });

    it('filters podHealths using their pods', () => {
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { namespace: defaultNamespace, name: 'pod1' },
                { namespace: defaultNamespace, name: 'pod2' }
            ],
            podHealths: [
                { pod: { namespace: defaultNamespace, name: 'pod1' } },
                { pod: { namespace: defaultNamespace, name: 'pod2' } }
            ]
        };
        const controls = {
            ...defaultControls,
            nameFilter: 'pod1'
        };

        const actual = computeDataSet(analysisResult, controls);

        expect(actual.podHealths).toEqual([
            { namespace: defaultNamespace, name: 'pod1', displayName: 'pod1' }
        ]);
    });

    it('includes ingress neighbors', () => {
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { namespace: defaultNamespace, name: 'pod1' },
                { namespace: defaultNamespace, name: 'pod2' },
                { namespace: defaultNamespace, name: 'pod3' }
            ],
            podIsolations: [
                { pod: { namespace: defaultNamespace, name: 'pod1' } },
                { pod: { namespace: defaultNamespace, name: 'pod2' } },
                { pod: { namespace: defaultNamespace, name: 'pod3' } }
            ],
            allowedRoutes: [
                {
                    namespace: defaultNamespace, name: 'route1',
                    sourcePod: { namespace: defaultNamespace, name: 'pod2' },
                    targetPod: { namespace: defaultNamespace, name: 'pod1' }
                },
                {
                    namespace: defaultNamespace, name: 'route2',
                    sourcePod: { namespace: defaultNamespace, name: 'pod1' },
                    targetPod: { namespace: defaultNamespace, name: 'pod3' }
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
            { namespace: defaultNamespace, name: 'pod1', displayName: 'pod1', highlighted: false },
            { namespace: defaultNamespace, name: 'pod2', displayName: 'pod2', highlighted: false }
        ]);
        expect(actual.allowedRoutes).toEqual([
            {
                namespace: defaultNamespace, name: 'route1',
                sourcePod: { namespace: defaultNamespace, name: 'pod2', displayName: 'pod2', highlighted: false },
                targetPod: { namespace: defaultNamespace, name: 'pod1', displayName: 'pod1', highlighted: false }
            }
        ]);
    });

    it('includes egress neighbors', () => {
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { namespace: defaultNamespace, name: 'pod1' },
                { namespace: defaultNamespace, name: 'pod2' },
                { namespace: defaultNamespace, name: 'pod3' }
            ],
            podIsolations: [
                { pod: { namespace: defaultNamespace, name: 'pod1' } },
                { pod: { namespace: defaultNamespace, name: 'pod2' } },
                { pod: { namespace: defaultNamespace, name: 'pod3' } }
            ],
            allowedRoutes: [
                {
                    namespace: defaultNamespace, name: 'route1',
                    sourcePod: { namespace: defaultNamespace, name: 'pod1' },
                    targetPod: { namespace: defaultNamespace, name: 'pod2' }
                },
                {
                    namespace: defaultNamespace, name: 'route2',
                    sourcePod: { namespace: defaultNamespace, name: 'pod2' },
                    targetPod: { namespace: defaultNamespace, name: 'pod3' }
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
            { namespace: defaultNamespace, name: 'pod1', displayName: 'pod1', highlighted: false },
            { namespace: defaultNamespace, name: 'pod2', displayName: 'pod2', highlighted: false }
        ]);
        expect(actual.allowedRoutes).toEqual([
            {
                namespace: defaultNamespace, name: 'route1',
                sourcePod: { namespace: defaultNamespace, name: 'pod1', displayName: 'pod1', highlighted: false },
                targetPod: { namespace: defaultNamespace, name: 'pod2', displayName: 'pod2', highlighted: false }
            }
        ]);
    });

    it('highlights podIsolations with no ingress isolation', () => {
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { namespace: defaultNamespace, name: 'pod1' },
                { namespace: defaultNamespace, name: 'pod2' }
            ],
            podIsolations: [
                {
                    pod: { namespace: defaultNamespace, name: 'pod1' },
                    isIngressIsolated: false, isEgressIsolated: false
                },
                {
                    pod: { namespace: defaultNamespace, name: 'pod2' },
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
                namespace: defaultNamespace, name: 'pod1', displayName: 'pod1',
                isIngressIsolated: false, isEgressIsolated: false, highlighted: true
            },
            {
                namespace: defaultNamespace, name: 'pod2', displayName: 'pod2',
                isIngressIsolated: true, isEgressIsolated: false, highlighted: false
            }
        ]);
    });

    it('highlights podIsolations with no egress isolation', () => {
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { namespace: defaultNamespace, name: 'pod1' },
                { namespace: defaultNamespace, name: 'pod2' }
            ],
            podIsolations: [
                {
                    pod: { namespace: defaultNamespace, name: 'pod1' },
                    isIngressIsolated: false, isEgressIsolated: false
                },
                {
                    pod: { namespace: defaultNamespace, name: 'pod2' },
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
                namespace: defaultNamespace, name: 'pod1', displayName: 'pod1',
                isIngressIsolated: false, isEgressIsolated: false, highlighted: true
            },
            {
                namespace: defaultNamespace, name: 'pod2', displayName: 'pod2',
                isIngressIsolated: false, isEgressIsolated: true, highlighted: false
            }
        ]);
    });

    it('includes podIsolation data in allowed routes', () => {
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { namespace: defaultNamespace, name: 'pod1' },
                { namespace: defaultNamespace, name: 'pod2' }
            ],
            podIsolations: [
                {
                    pod: { namespace: defaultNamespace, name: 'pod1' },
                    isIngressIsolated: true, isEgressIsolated: false
                },
                {
                    pod: { namespace: defaultNamespace, name: 'pod2' },
                    isIngressIsolated: false, isEgressIsolated: true
                }
            ],
            allowedRoutes: [
                {
                    namespace: defaultNamespace, name: 'route1',
                    sourcePod: { namespace: defaultNamespace, name: 'pod1' },
                    targetPod: { namespace: defaultNamespace, name: 'pod2' }
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
                namespace: defaultNamespace, name: 'route1',
                sourcePod: {
                    namespace: defaultNamespace, name: 'pod1', displayName: 'pod1',
                    isIngressIsolated: true, isEgressIsolated: false, highlighted: true
                },
                targetPod: {
                    namespace: defaultNamespace, name: 'pod2', displayName: 'pod2',
                    isIngressIsolated: false, isEgressIsolated: true, highlighted: true
                }
            }
        ]);
    });

    it('includes namespace prefix', () => {
        const namespace = 'some-namespace';
        const analysisResult = {
            ...emptyAnalysisResult,
            pods: [
                { namespace: namespace, name: 'pod1' },
                { namespace: namespace, name: 'pod2' }
            ],
            podIsolations: [
                { pod: { namespace: namespace, name: 'pod1' } },
                { pod: { namespace: namespace, name: 'pod2' } }
            ],
            allowedRoutes: [
                {
                    namespace: namespace, name: 'route1',
                    sourcePod: { namespace: namespace, name: 'pod1' },
                    targetPod: { namespace: namespace, name: 'pod2' }
                }
            ],
            services: [
                {
                    namespace: namespace, name: 'svc1', targetPods: [
                        { namespace: namespace, name: 'pod1' }
                    ]
                }
            ],
            ingresses: [
                {
                    namespace: namespace, name: 'ing1', targetServices: [
                        { namespace: namespace, name: 'svc1' }
                    ]
                }
            ],
            replicaSets: [
                {
                    namespace: namespace, name: 'replicaSet1', targetPods: [
                        { namespace: namespace, name: 'pod1' }
                    ]
                }
            ],
            statefulSets: [
                {
                    namespace: namespace, name: 'statefulSet1', targetPods: [
                        { namespace: namespace, name: 'pod1' }
                    ]
                }
            ],
            daemonSets: [
                {
                    namespace: namespace, name: 'daemonSet1', targetPods: [
                        { namespace: namespace, name: 'pod1' }
                    ]
                }
            ],
            deployments: [
                {
                    namespace: namespace, name: 'deployment1', targetReplicaSets: [
                        { namespace: namespace, name: 'replicaSet1' }
                    ]
                }
            ],
            podHealths: [
                { pod: { namespace: namespace, name: 'pod1' } },
                { pod: { namespace: namespace, name: 'pod2' } }
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
        expect(actual.services.map(service => service.displayName)).toEqual([`${namespace}/svc1`]);
        expect(actual.ingresses.map(ingress => ingress.displayName)).toEqual([`${namespace}/ing1`]);
        expect(actual.replicaSets.map(replicaSet => replicaSet.displayName)).toEqual([`${namespace}/replicaSet1`]);
        expect(actual.statefulSets.map(statefulSet => statefulSet.displayName)).toEqual([`${namespace}/statefulSet1`]);
        expect(actual.daemonSets.map(daemonSet => daemonSet.displayName)).toEqual([`${namespace}/daemonSet1`]);
        expect(actual.deployments.map(deployment => deployment.displayName)).toEqual([`${namespace}/deployment1`]);
        expect(actual.podHealths.map(podHealth => podHealth.displayName))
            .toEqual([`${namespace}/pod1`, `${namespace}/pod2`]);
    });
});
