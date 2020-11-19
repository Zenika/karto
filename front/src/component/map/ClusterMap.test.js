import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import ClusterMap from './ClusterMap';
import {
    dragAndDropItem,
    getItemPosition,
    getScale,
    hoverAway,
    hoverItem,
    hoverLink,
    patchGraphViewBox,
    waitForItemPositionStable
} from '../utils/testutils';

describe('ClusterMap component', () => {

    const timeout = 10000;

    const noOpHandler = () => null;

    it('displays pods and their labels', () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        const dataSet = {
            pods: [pod1, pod2],
            services: [],
            replicaSets: [],
            deployments: []
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);

        expect(screen.queryAllByLabelText('pod')).toHaveLength(2);
        expect(screen.queryByText('ns/pod1')).toBeInTheDocument();
        expect(screen.queryByText('ns/pod2')).toBeInTheDocument();
    });

    it('displays services with links to pods', () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        const pod3 = { namespace: 'ns', name: 'pod3', displayName: 'ns/pod3' };
        const service1 = {
            namespace: 'ns', name: 'svc1', displayName: 'ns/svc1', targetPods: [
                { namespace: 'ns', name: 'pod1' },
                { namespace: 'ns', name: 'pod2' }
            ]
        };
        const service2 = {
            namespace: 'ns', name: 'svc2', displayName: 'ns/svc2', targetPods: [
                { namespace: 'ns', name: 'pod3' }
            ]
        };
        const dataSet = {
            pods: [pod1, pod2, pod3],
            services: [service1, service2],
            replicaSets: [],
            deployments: []
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);

        expect(screen.queryAllByLabelText('service')).toHaveLength(2);
        expect(screen.queryByText('ns/svc1')).toBeInTheDocument();
        expect(screen.queryByText('ns/svc2')).toBeInTheDocument();
        expect(screen.queryAllByLabelText('service link')).toHaveLength(3);
    });

    it('displays replicaSets with links to pods', () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        const pod3 = { namespace: 'ns', name: 'pod3', displayName: 'ns/pod3' };
        const replicaSet1 = {
            namespace: 'ns', name: 'rs1', displayName: 'ns/rs1', targetPods: [
                { namespace: 'ns', name: 'pod1' },
                { namespace: 'ns', name: 'pod2' }
            ]
        };
        const replicaSet2 = {
            namespace: 'ns', name: 'rs2', displayName: 'ns/rs2', targetPods: [
                { namespace: 'ns', name: 'pod3' }
            ]
        };
        const dataSet = {
            pods: [pod1, pod2, pod3],
            services: [],
            replicaSets: [replicaSet1, replicaSet2],
            deployments: []
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);

        expect(screen.queryAllByLabelText('replicaset')).toHaveLength(2);
        expect(screen.queryByText('ns/rs1')).toBeInTheDocument();
        expect(screen.queryByText('ns/rs2')).toBeInTheDocument();
        expect(screen.queryAllByLabelText('replicaset link')).toHaveLength(3);
    });

    it('displays deployments with links to replicasets', () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        const pod3 = { namespace: 'ns', name: 'pod3', displayName: 'ns/pod3' };
        const replicaSet1 = {
            namespace: 'ns', name: 'rs1', displayName: 'ns/rs1', targetPods: [
                { namespace: 'ns', name: 'pod1' }
            ]
        };
        const replicaSet2 = {
            namespace: 'ns', name: 'rs2', displayName: 'ns/rs2', targetPods: [
                { namespace: 'ns', name: 'pod2' }
            ]
        };
        const replicaSet3 = {
            namespace: 'ns', name: 'rs3', displayName: 'ns/rs3', targetPods: [
                { namespace: 'ns', name: 'pod3' }
            ]
        };
        const deployment1 = {
            namespace: 'ns', name: 'deploy2', displayName: 'ns/deploy1', targetReplicaSets: [
                { namespace: 'ns', name: 'rs1' },
                { namespace: 'ns', name: 'rs2' }
            ]
        };
        const deployment2 = {
            namespace: 'ns', name: 'deploy3', displayName: 'ns/deploy2', targetReplicaSets: [
                { namespace: 'ns', name: 'rs3' }
            ]
        };
        const dataSet = {
            pods: [pod1, pod2, pod3],
            services: [],
            replicaSets: [replicaSet1, replicaSet2, replicaSet3],
            deployments: [deployment1, deployment2]
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);

        expect(screen.queryAllByLabelText('deployment')).toHaveLength(2);
        expect(screen.queryByText('ns/deploy1')).toBeInTheDocument();
        expect(screen.queryByText('ns/deploy2')).toBeInTheDocument();
        expect(screen.queryAllByLabelText('deployment link')).toHaveLength(3);
    });

    it('calls handler on pod focus', async () => {
        const focusHandler = jest.fn();
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const dataSet = {
            pods: [pod1],
            services: [],
            replicaSets: [],
            deployments: []
        };
        render(<ClusterMap onPodFocus={focusHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], timeout);

        hoverItem(screen.getAllByLabelText('pod')[0]);

        expect(focusHandler).toHaveBeenCalledWith(pod1);
    }, timeout);

    it('calls handler on service or service link focus', async () => {
        const focusHandler = jest.fn();
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const service1 = {
            namespace: 'ns', name: 'svc1', displayName: 'ns/svc1', targetPods: [
                { namespace: 'ns', name: 'pod1' }
            ]
        };
        const dataSet = {
            pods: [pod1],
            services: [service1],
            replicaSets: [],
            deployments: []
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={focusHandler} onReplicaSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('service')[0], timeout);

        hoverItem(screen.getAllByLabelText('service')[0]);

        expect(focusHandler).toHaveBeenCalledWith(service1);

        hoverAway();
        focusHandler.mockClear();
        hoverLink(screen.getAllByLabelText('service link')[0]);

        expect(focusHandler).toHaveBeenCalledWith(service1);
    }, timeout);

    it('calls handler on replicaSet or replicaSet link focus', async () => {
        const focusHandler = jest.fn();
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const replicaSet1 = {
            namespace: 'ns', name: 'rs1', displayName: 'ns/rs1', targetPods: [
                { namespace: 'ns', name: 'pod1' }
            ]
        };
        const dataSet = {
            pods: [pod1],
            services: [],
            replicaSets: [replicaSet1],
            deployments: []
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={focusHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('replicaset')[0], timeout);

        hoverItem(screen.getAllByLabelText('replicaset')[0]);

        expect(focusHandler).toHaveBeenCalledWith(replicaSet1);

        hoverAway();
        focusHandler.mockClear();
        hoverLink(screen.getAllByLabelText('replicaset link')[0]);

        expect(focusHandler).toHaveBeenCalledWith(replicaSet1);
    }, timeout);

    it('calls handler on deployment or deployment link focus', async () => {
        const focusHandler = jest.fn();
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const replicaSet1 = {
            namespace: 'ns', name: 'rs1', displayName: 'ns/rs1', targetPods: [
                { namespace: 'ns', name: 'pod1' }
            ]
        };
        const deployment1 = {
            namespace: 'ns', name: 'deploy2', displayName: 'ns/deploy1', targetReplicaSets: [
                { namespace: 'ns', name: 'rs1' }
            ]
        };
        const dataSet = {
            pods: [pod1],
            services: [],
            replicaSets: [
                replicaSet1
            ],
            deployments: [
                deployment1
            ]
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onDeploymentFocus={focusHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('deployment')[0], timeout);

        hoverItem(screen.getAllByLabelText('deployment')[0]);

        expect(focusHandler).toHaveBeenCalledWith(deployment1);

        hoverAway();
        focusHandler.mockClear();
        hoverLink(screen.getAllByLabelText('deployment link')[0]);

        expect(focusHandler).toHaveBeenCalledWith(deployment1);
    }, timeout);

    it('updates local state properly', () => {
        const dataSet1 = {
            pods: [
                { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' }
            ],
            services: [
                {
                    namespace: 'ns', name: 'svc1', displayName: 'ns/svc1', targetPods: [
                        { namespace: 'ns', name: 'pod1' }
                    ]
                }
            ],
            replicaSets: [
                {
                    namespace: 'ns', name: 'rs1', displayName: 'ns/rs1', targetPods: [
                        { namespace: 'ns', name: 'pod1' }
                    ]
                }
            ],
            deployments: [
                {
                    namespace: 'ns', name: 'deploy2', displayName: 'ns/deploy1', targetReplicaSets: [
                        { namespace: 'ns', name: 'rs1' }
                    ]
                }
            ]
        };
        const dataSet2 = {
            pods: [
                { namespace: 'ns', name: 'pod1', displayName: 'pod1' },
                { namespace: 'ns', name: 'pod2', displayName: 'pod2' },
                { namespace: 'ns', name: 'pod3', displayName: 'pod3' }
            ],
            services: [
                {
                    namespace: 'ns', name: 'svc1', displayName: 'svc1', targetPods: [
                        { namespace: 'ns', name: 'pod1' },
                        { namespace: 'ns', name: 'pod2' }
                    ]
                },
                {
                    namespace: 'ns', name: 'svc2', displayName: 'svc2', targetPods: [
                        { namespace: 'ns', name: 'pod3' }
                    ]
                }
            ],
            replicaSets: [
                {
                    namespace: 'ns', name: 'rs1', displayName: 'rs1', targetPods: [
                        { namespace: 'ns', name: 'pod1' },
                        { namespace: 'ns', name: 'pod2' }
                    ]
                },
                {
                    namespace: 'ns', name: 'rs2', displayName: 'rs2', targetPods: [
                        { namespace: 'ns', name: 'pod3' }
                    ]
                }
            ],
            deployments: [
                {
                    namespace: 'ns', name: 'deploy2', displayName: 'deploy1', targetReplicaSets: [
                        { namespace: 'ns', name: 'rs1' }
                    ]
                },
                {
                    namespace: 'ns', name: 'deploy3', displayName: 'deploy2', targetReplicaSets: [
                        { namespace: 'ns', name: 'rs2' }
                    ]
                }
            ]
        };


        const { rerender } = render(
            <ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                        onDeploymentFocus={noOpHandler} dataSet={dataSet1}/>
        );

        expect(screen.queryAllByLabelText('pod')).toHaveLength(1);
        expect(screen.queryByText('ns/pod1')).toBeInTheDocument();
        expect(screen.queryAllByLabelText('service')).toHaveLength(1);
        expect(screen.queryByText('ns/svc1')).toBeInTheDocument();
        expect(screen.queryAllByLabelText('service link')).toHaveLength(1);
        expect(screen.queryAllByLabelText('replicaset')).toHaveLength(1);
        expect(screen.queryByText('ns/rs1')).toBeInTheDocument();
        expect(screen.queryAllByLabelText('replicaset link')).toHaveLength(1);
        expect(screen.queryAllByLabelText('deployment')).toHaveLength(1);
        expect(screen.queryByText('ns/deploy1')).toBeInTheDocument();
        expect(screen.queryAllByLabelText('deployment link')).toHaveLength(1);

        rerender(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                             onDeploymentFocus={noOpHandler} dataSet={dataSet2}/>);

        expect(screen.queryAllByLabelText('pod')).toHaveLength(3);
        expect(screen.queryByText('ns/pod1')).not.toBeInTheDocument();
        expect(screen.queryByText('pod1')).toBeInTheDocument();
        expect(screen.queryByText('pod2')).toBeInTheDocument();
        expect(screen.queryByText('pod3')).toBeInTheDocument();
        expect(screen.queryAllByLabelText('service')).toHaveLength(2);
        expect(screen.queryByText('ns/svc1')).not.toBeInTheDocument();
        expect(screen.queryByText('svc1')).toBeInTheDocument();
        expect(screen.queryByText('svc2')).toBeInTheDocument();
        expect(screen.queryAllByLabelText('service link')).toHaveLength(3);
        expect(screen.queryAllByLabelText('replicaset')).toHaveLength(2);
        expect(screen.queryByText('ns/rs1')).not.toBeInTheDocument();
        expect(screen.queryByText('rs1')).toBeInTheDocument();
        expect(screen.queryByText('rs2')).toBeInTheDocument();
        expect(screen.queryAllByLabelText('replicaset link')).toHaveLength(3);
        expect(screen.queryAllByLabelText('deployment')).toHaveLength(2);
        expect(screen.queryByText('ns/deploy1')).not.toBeInTheDocument();
        expect(screen.queryByText('deploy1')).toBeInTheDocument();
        expect(screen.queryByText('deploy2')).toBeInTheDocument();
        expect(screen.queryAllByLabelText('deployment link')).toHaveLength(2);
    });

    it('focused pods have a different appearance', async () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        const dataSet = {
            pods: [pod1, pod2],
            services: [],
            replicaSets: [],
            deployments: []
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], timeout);

        hoverItem(screen.getAllByLabelText('pod')[0]);

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item-faded');
    }, timeout);

    it('focused services and service links have a different appearance', async () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        const service1 = {
            namespace: 'ns', name: 'svc1', displayName: 'ns/svc1', targetPods: [
                { namespace: 'ns', name: 'pod1' }
            ]
        };
        const service2 = {
            namespace: 'ns', name: 'svc2', displayName: 'ns/svc2', targetPods: [
                { namespace: 'ns', name: 'pod2' }
            ]
        };
        const dataSet = {
            pods: [pod1, pod2],
            services: [service1, service2],
            replicaSets: [],
            deployments: []
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('service')[0], timeout);

        hoverItem(screen.getAllByLabelText('service')[0]);

        expect(screen.getAllByLabelText('service')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('service')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('service link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('service link')[1]).toHaveAttribute('class', 'link-faded');
    }, timeout);

    it('focused replicaSets and replicaSet links have a different appearance', async () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        const replicaSet1 = {
            namespace: 'ns', name: 'rs1', displayName: 'ns/rs1', targetPods: [
                { namespace: 'ns', name: 'pod1' }
            ]
        };
        const replicaSet2 = {
            namespace: 'ns', name: 'rs2', displayName: 'ns/rs2', targetPods: [
                { namespace: 'ns', name: 'pod2' }
            ]
        };
        const dataSet = {
            pods: [pod1, pod2],
            services: [],
            replicaSets: [replicaSet1, replicaSet2],
            deployments: []
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('replicaset')[0], timeout);

        hoverItem(screen.getAllByLabelText('replicaset')[0]);

        expect(screen.getAllByLabelText('replicaset')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('replicaset')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('replicaset link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('replicaset link')[1]).toHaveAttribute('class', 'link-faded');
    }, timeout);

    it('focused deployments and deployment links have a different appearance', async () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        const replicaSet1 = {
            namespace: 'ns', name: 'rs1', displayName: 'ns/rs1', targetPods: [
                { namespace: 'ns', name: 'pod1' }
            ]
        };
        const replicaSet2 = {
            namespace: 'ns', name: 'rs2', displayName: 'ns/rs2', targetPods: [
                { namespace: 'ns', name: 'pod2' }
            ]
        };
        const deployment1 = {
            namespace: 'ns', name: 'deploy1', displayName: 'ns/deploy1', targetReplicaSets: [
                { namespace: 'ns', name: 'rs1' }
            ]
        };
        const deployment2 = {
            namespace: 'ns', name: 'deploy2', displayName: 'ns/deploy2', targetReplicaSets: [
                { namespace: 'ns', name: 'rs2' }
            ]
        };
        const dataSet = {
            pods: [pod1, pod2],
            services: [],
            replicaSets: [replicaSet1, replicaSet2],
            deployments: [deployment1, deployment2]
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('deployment')[0], timeout);

        hoverItem(screen.getAllByLabelText('deployment')[0]);

        expect(screen.getAllByLabelText('deployment')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('deployment')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('deployment link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('deployment link')[1]).toHaveAttribute('class', 'link-faded');
    }, timeout);

    it('focusing a pod also focuses connected services, replicaSets and deployments', async () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        const pod3 = { namespace: 'ns', name: 'pod3', displayName: 'ns/pod3' };
        const pod4 = { namespace: 'ns', name: 'pod4', displayName: 'ns/pod4' };
        const service1 = {
            namespace: 'ns', name: 'svc1', displayName: 'ns/svc1', targetPods: [
                { namespace: 'ns', name: 'pod1' },
                { namespace: 'ns', name: 'pod2' }
            ]
        };
        const service2 = {
            namespace: 'ns', name: 'svc2', displayName: 'ns/svc2', targetPods: [
                { namespace: 'ns', name: 'pod3' }
            ]
        };
        const service3 = {
            namespace: 'ns', name: 'svc3', displayName: 'ns/svc3', targetPods: [
                { namespace: 'ns', name: 'pod4' }
            ]
        };
        const replicaSet1 = {
            namespace: 'ns', name: 'rs1', displayName: 'ns/rs1', targetPods: [
                { namespace: 'ns', name: 'pod1' },
                { namespace: 'ns', name: 'pod2' }
            ]
        };
        const replicaSet2 = {
            namespace: 'ns', name: 'rs2', displayName: 'ns/rs2', targetPods: [
                { namespace: 'ns', name: 'pod3' }
            ]
        };
        const replicaSet3 = {
            namespace: 'ns', name: 'rs3', displayName: 'ns/rs3', targetPods: [
                { namespace: 'ns', name: 'pod4' }
            ]
        };
        const deployment1 = {
            namespace: 'ns', name: 'deploy1', displayName: 'ns/deploy1', targetReplicaSets: [
                { namespace: 'ns', name: 'rs1' },
                { namespace: 'ns', name: 'rs2' }
            ]
        };
        const deployment2 = {
            namespace: 'ns', name: 'deploy2', displayName: 'ns/deploy2', targetReplicaSets: [
                { namespace: 'ns', name: 'rs3' }
            ]
        };
        const dataSet = {
            pods: [pod1, pod2, pod3, pod4],
            services: [service1, service2, service3],
            replicaSets: [replicaSet1, replicaSet2, replicaSet3],
            deployments: [deployment1, deployment2]
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], timeout);

        hoverItem(screen.getAllByLabelText('pod')[0]);

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('pod')[2]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('pod')[3]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('service')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('service link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('service')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('service link')[1]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('service')[2]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('service link')[2]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('replicaset')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('replicaset link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('replicaset')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('replicaset link')[1]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('replicaset')[2]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('replicaset link')[2]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('deployment')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('deployment link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('deployment')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('deployment link')[1]).toHaveAttribute('class', 'link-faded');
    }, timeout);

    it('focusing a service also focuses its target pods', async () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        const pod3 = { namespace: 'ns', name: 'pod3', displayName: 'ns/pod3' };
        const service1 = {
            namespace: 'ns', name: 'svc1', displayName: 'ns/svc1', targetPods: [
                { namespace: 'ns', name: 'pod1' },
                { namespace: 'ns', name: 'pod2' }
            ]
        };
        const service2 = {
            namespace: 'ns', name: 'svc2', displayName: 'ns/svc2', targetPods: [
                { namespace: 'ns', name: 'pod3' }
            ]
        };
        const replicaSet1 = {
            namespace: 'ns', name: 'rs1', displayName: 'ns/rs1', targetPods: [
                { namespace: 'ns', name: 'pod1' },
                { namespace: 'ns', name: 'pod2' }
            ]
        };
        const deployment1 = {
            namespace: 'ns', name: 'deploy1', displayName: 'ns/deploy1', targetReplicaSets: [
                { namespace: 'ns', name: 'rs1' }
            ]
        };
        const dataSet = {
            pods: [pod1, pod2, pod3],
            services: [service1, service2],
            replicaSets: [replicaSet1],
            deployments: [deployment1]
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('service')[0], timeout);

        hoverItem(screen.getAllByLabelText('service')[0]);

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[2]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('service')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('service link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('service link')[1]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('service')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('service link')[2]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('replicaset')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('replicaset link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('replicaset link')[1]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('deployment')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('deployment link')[0]).toHaveAttribute('class', 'link-faded');
    }, timeout);

    it('focusing a service link also focuses its service and target pod', async () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        const pod3 = { namespace: 'ns', name: 'pod3', displayName: 'ns/pod3' };
        const service1 = {
            namespace: 'ns', name: 'svc1', displayName: 'ns/svc1', targetPods: [
                { namespace: 'ns', name: 'pod1' },
                { namespace: 'ns', name: 'pod2' }
            ]
        };
        const service2 = {
            namespace: 'ns', name: 'svc2', displayName: 'ns/svc2', targetPods: [
                { namespace: 'ns', name: 'pod3' }
            ]
        };
        const replicaSet1 = {
            namespace: 'ns', name: 'rs1', displayName: 'ns/rs1', targetPods: [
                { namespace: 'ns', name: 'pod1' },
                { namespace: 'ns', name: 'pod2' }
            ]
        };
        const deployment1 = {
            namespace: 'ns', name: 'deploy1', displayName: 'ns/deploy1', targetReplicaSets: [
                { namespace: 'ns', name: 'rs1' }
            ]
        };
        const dataSet = {
            pods: [pod1, pod2, pod3],
            services: [service1, service2],
            replicaSets: [replicaSet1],
            deployments: [deployment1]
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('service')[0], timeout);

        hoverLink(screen.getAllByLabelText('service link')[0]);

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('pod')[2]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('service')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('service link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('service link')[1]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('service')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('service link')[2]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('replicaset')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('replicaset link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('replicaset link')[1]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('deployment')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('deployment link')[0]).toHaveAttribute('class', 'link-faded');
    }, timeout);

    it('focusing a replicaSet also focuses its target pods', async () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        const pod3 = { namespace: 'ns', name: 'pod3', displayName: 'ns/pod3' };
        const service1 = {
            namespace: 'ns', name: 'svc1', displayName: 'ns/svc1', targetPods: [
                { namespace: 'ns', name: 'pod1' },
                { namespace: 'ns', name: 'pod2' },
                { namespace: 'ns', name: 'pod3' }
            ]
        };
        const replicaSet1 = {
            namespace: 'ns', name: 'rs1', displayName: 'ns/rs1', targetPods: [
                { namespace: 'ns', name: 'pod1' },
                { namespace: 'ns', name: 'pod2' }
            ]
        };
        const replicaSet2 = {
            namespace: 'ns', name: 'rs2', displayName: 'ns/rs2', targetPods: [
                { namespace: 'ns', name: 'pod3' }
            ]
        };
        const deployment1 = {
            namespace: 'ns', name: 'deploy1', displayName: 'ns/deploy1', targetReplicaSets: [
                { namespace: 'ns', name: 'rs1' }
            ]
        };
        const deployment2 = {
            namespace: 'ns', name: 'deploy2', displayName: 'ns/deploy2', targetReplicaSets: [
                { namespace: 'ns', name: 'rs2' }
            ]
        };
        const dataSet = {
            pods: [pod1, pod2, pod3],
            services: [service1],
            replicaSets: [replicaSet1, replicaSet2],
            deployments: [deployment1, deployment2]
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('replicaset')[0], timeout);

        hoverItem(screen.getAllByLabelText('replicaset')[0]);

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[2]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('service')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('service link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('replicaset')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('replicaset link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('replicaset link')[1]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('replicaset')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('replicaset link')[2]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('deployment')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('deployment link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('deployment')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('deployment link')[1]).toHaveAttribute('class', 'link-faded');
    }, timeout);

    it('focusing a replicaSet link also focuses its replicaSet and target pod', async () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        const pod3 = { namespace: 'ns', name: 'pod3', displayName: 'ns/pod3' };
        const service1 = {
            namespace: 'ns', name: 'svc1', displayName: 'ns/svc1', targetPods: [
                { namespace: 'ns', name: 'pod1' },
                { namespace: 'ns', name: 'pod2' },
                { namespace: 'ns', name: 'pod3' }
            ]
        };
        const replicaSet1 = {
            namespace: 'ns', name: 'rs1', displayName: 'ns/rs1', targetPods: [
                { namespace: 'ns', name: 'pod1' },
                { namespace: 'ns', name: 'pod2' }
            ]
        };
        const replicaSet2 = {
            namespace: 'ns', name: 'rs2', displayName: 'ns/rs2', targetPods: [
                { namespace: 'ns', name: 'pod3' }
            ]
        };
        const deployment1 = {
            namespace: 'ns', name: 'deploy1', displayName: 'ns/deploy1', targetReplicaSets: [
                { namespace: 'ns', name: 'rs1' }
            ]
        };
        const deployment2 = {
            namespace: 'ns', name: 'deploy2', displayName: 'ns/deploy2', targetReplicaSets: [
                { namespace: 'ns', name: 'rs2' }
            ]
        };
        const dataSet = {
            pods: [pod1, pod2, pod3],
            services: [service1],
            replicaSets: [replicaSet1, replicaSet2],
            deployments: [deployment1, deployment2]
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('replicaset')[0], timeout);

        hoverLink(screen.getAllByLabelText('replicaset link')[0]);

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('pod')[2]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('service')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('service link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('replicaset')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('replicaset link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('replicaset link')[1]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('replicaset')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('replicaset link')[2]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('deployment')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('deployment link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('deployment')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('deployment link')[1]).toHaveAttribute('class', 'link-faded');
    }, timeout);

    it('focusing a deployment also focuses its target replicaSets and their target pods', async () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        const pod3 = { namespace: 'ns', name: 'pod3', displayName: 'ns/pod3' };
        const pod4 = { namespace: 'ns', name: 'pod4', displayName: 'ns/pod4' };
        const service1 = {
            namespace: 'ns', name: 'svc1', displayName: 'ns/svc1', targetPods: [
                { namespace: 'ns', name: 'pod1' },
                { namespace: 'ns', name: 'pod2' },
                { namespace: 'ns', name: 'pod3' },
                { namespace: 'ns', name: 'pod4' }
            ]
        };
        const replicaSet1 = {
            namespace: 'ns', name: 'rs1', displayName: 'ns/rs1', targetPods: [
                { namespace: 'ns', name: 'pod1' },
                { namespace: 'ns', name: 'pod2' }
            ]
        };
        const replicaSet2 = {
            namespace: 'ns', name: 'rs2', displayName: 'ns/rs2', targetPods: [
                { namespace: 'ns', name: 'pod3' }
            ]
        };
        const replicaSet3 = {
            namespace: 'ns', name: 'rs3', displayName: 'ns/rs3', targetPods: [
                { namespace: 'ns', name: 'pod4' }
            ]
        };
        const deployment1 = {
            namespace: 'ns', name: 'deploy1', displayName: 'ns/deploy1', targetReplicaSets: [
                { namespace: 'ns', name: 'rs1' },
                { namespace: 'ns', name: 'rs2' }
            ]
        };
        const deployment2 = {
            namespace: 'ns', name: 'deploy2', displayName: 'ns/deploy2', targetReplicaSets: [
                { namespace: 'ns', name: 'rs3' }
            ]
        };
        const dataSet = {
            pods: [pod1, pod2, pod3, pod4],
            services: [service1],
            replicaSets: [replicaSet1, replicaSet2, replicaSet3],
            deployments: [deployment1, deployment2]
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('deployment')[0], timeout);

        hoverItem(screen.getAllByLabelText('deployment')[0]);

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[2]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[3]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('service')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('service link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('replicaset')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('replicaset link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('replicaset link')[1]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('replicaset')[1]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('replicaset link')[2]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('replicaset')[2]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('replicaset link')[3]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('deployment')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('deployment link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('deployment link')[1]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('deployment')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('deployment link')[2]).toHaveAttribute('class', 'link-faded');
    }, timeout);

    it('focusing a deployment link also focuses its deployment and target replicaSet', async () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        const pod3 = { namespace: 'ns', name: 'pod3', displayName: 'ns/pod3' };
        const service1 = {
            namespace: 'ns', name: 'svc1', displayName: 'ns/svc1', targetPods: [
                { namespace: 'ns', name: 'pod1' },
                { namespace: 'ns', name: 'pod2' },
                { namespace: 'ns', name: 'pod3' }
            ]
        };
        const replicaSet1 = {
            namespace: 'ns', name: 'rs1', displayName: 'ns/rs1', targetPods: [
                { namespace: 'ns', name: 'pod1' }
            ]
        };
        const replicaSet2 = {
            namespace: 'ns', name: 'rs2', displayName: 'ns/rs2', targetPods: [
                { namespace: 'ns', name: 'pod2' }
            ]
        };
        const replicaSet3 = {
            namespace: 'ns', name: 'rs3', displayName: 'ns/rs3', targetPods: [
                { namespace: 'ns', name: 'pod3' }
            ]
        };
        const deployment1 = {
            namespace: 'ns', name: 'deploy1', displayName: 'ns/deploy1', targetReplicaSets: [
                { namespace: 'ns', name: 'rs1' },
                { namespace: 'ns', name: 'rs2' }
            ]
        };
        const deployment2 = {
            namespace: 'ns', name: 'deploy2', displayName: 'ns/deploy2', targetReplicaSets: [
                { namespace: 'ns', name: 'rs3' }
            ]
        };
        const dataSet = {
            pods: [pod1, pod2, pod3],
            services: [service1],
            replicaSets: [replicaSet1, replicaSet2, replicaSet3],
            deployments: [deployment1, deployment2]
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('deployment')[0], timeout);

        hoverLink(screen.getAllByLabelText('deployment link')[0]);

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('pod')[2]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('service')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('service link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('replicaset')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('replicaset link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('replicaset')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('replicaset link')[1]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('replicaset')[2]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('replicaset link')[2]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('deployment')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('deployment link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('deployment link')[1]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('deployment')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('deployment link')[2]).toHaveAttribute('class', 'link-faded');
    }, timeout);

    it('unfocusing an element should remove all fades', async () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const service1 = {
            namespace: 'ns', name: 'svc1', displayName: 'ns/svc1', targetPods: [
                { namespace: 'ns', name: 'pod1' }
            ]
        };
        const replicaSet1 = {
            namespace: 'ns', name: 'rs1', displayName: 'ns/rs1', targetPods: [
                { namespace: 'ns', name: 'pod1' }
            ]
        };
        const deployment1 = {
            namespace: 'ns', name: 'deploy1', displayName: 'ns/deploy1', targetReplicaSets: [
                { namespace: 'ns', name: 'rs1' }
            ]
        };
        const dataSet = {
            pods: [pod1],
            services: [service1],
            replicaSets: [replicaSet1],
            deployments: [deployment1]
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('service')[0], timeout);

        hoverItem(screen.getAllByLabelText('service')[0]);
        hoverAway();

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('service')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('service link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('replicaset')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('replicaset link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('deployment')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('deployment link')[0]).toHaveAttribute('class', 'link');
    }, timeout);

    it('focused element should stay focused after component update', async () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        const service1 = {
            namespace: 'ns', name: 'svc1', displayName: 'ns/svc1', targetPods: [
                { namespace: 'ns', name: 'pod1' }
            ]
        };
        const service2 = {
            namespace: 'ns', name: 'svc2', displayName: 'ns/svc2', targetPods: [
                { namespace: 'ns', name: 'pod2' }
            ]
        };
        const replicaSet1 = {
            namespace: 'ns', name: 'rs1', displayName: 'ns/rs1', targetPods: [
                { namespace: 'ns', name: 'pod1' }
            ]
        };
        const deployment1 = {
            namespace: 'ns', name: 'deploy1', displayName: 'ns/deploy1', targetReplicaSets: [
                { namespace: 'ns', name: 'rs1' }
            ]
        };
        const dataSet1 = {
            pods: [pod1, pod2],
            services: [service1],
            replicaSets: [replicaSet1],
            deployments: [deployment1]
        };
        const dataSet2 = {
            pods: [pod1, pod2],
            services: [service1, service2],
            replicaSets: [replicaSet1],
            deployments: [deployment1]
        };
        const { rerender } = render(
            <ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                        onDeploymentFocus={noOpHandler} dataSet={dataSet1}/>
        );
        await waitForItemPositionStable(screen.getAllByLabelText('service')[0], timeout);

        hoverItem(screen.getAllByLabelText('service')[0]);

        rerender(
            <ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                        onDeploymentFocus={noOpHandler} dataSet={dataSet2}/>
        );

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('service')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('service link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('service')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('service link')[1]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('replicaset')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('replicaset link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('deployment')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('deployment link')[0]).toHaveAttribute('class', 'link-faded');
    }, timeout);

    it('drag and dropped services do not move anymore', async () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        const pod3 = { namespace: 'ns', name: 'pod3', displayName: 'ns/pod3' };
        const service1 = {
            namespace: 'ns', name: 'svc1', displayName: 'ns/svc1', targetPods: [
                { namespace: 'ns', name: 'pod1' }
            ]
        };
        const service2 = {
            namespace: 'ns', name: 'svc2', displayName: 'ns/svc2', targetPods: [
                { namespace: 'ns', name: 'pod2' }
            ]
        };
        const service3 = {
            namespace: 'ns', name: 'svc3', displayName: 'ns/svc3', targetPods: [
                { namespace: 'ns', name: 'pod3' }
            ]
        };
        const replicaSet1 = {
            namespace: 'ns', name: 'rs1', displayName: 'ns/rs1', targetPods: [
                { namespace: 'ns', name: 'pod1' }
            ]
        };
        const deployment1 = {
            namespace: 'ns', name: 'deploy1', displayName: 'ns/deploy1', targetReplicaSets: [
                { namespace: 'ns', name: 'rs1' }
            ]
        };
        const dataSet1 = {
            pods: [pod1, pod2],
            services: [service1, service2],
            replicaSets: [replicaSet1],
            deployments: [deployment1]
        };
        const dataSet2 = {
            pods: [pod1, pod2, pod3],
            services: [service1, service2, service3],
            replicaSets: [replicaSet1],
            deployments: [deployment1]
        };
        const { rerender } = render(
            <ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                        onDeploymentFocus={noOpHandler} dataSet={dataSet1}/>
        );
        await waitForItemPositionStable(screen.getAllByLabelText('service')[1], timeout);

        dragAndDropItem(screen.getAllByLabelText('service')[1], { clientX: -20, clientY: 10 });
        await waitForItemPositionStable(screen.getAllByLabelText('service')[1], timeout);
        const oldService1Position = getItemPosition(screen.getAllByLabelText('service')[0]);
        const oldService2Position = getItemPosition(screen.getAllByLabelText('service')[1]);

        rerender(
            <ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                        onDeploymentFocus={noOpHandler} dataSet={dataSet2}/>
        );
        await waitForItemPositionStable(screen.getAllByLabelText('service')[2], timeout);
        const newService1Position = getItemPosition(screen.getAllByLabelText('service')[0]);
        const newService2Position = getItemPosition(screen.getAllByLabelText('service')[1]);

        expect(newService1Position).not.toEqual(oldService1Position);
        expect(newService2Position).toEqual(oldService2Position);
    }, timeout);

    it('drag and dropped replicaSets do not move anymore', async () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        const pod3 = { namespace: 'ns', name: 'pod3', displayName: 'ns/pod3' };
        const service1 = {
            namespace: 'ns', name: 'svc1', displayName: 'ns/svc1', targetPods: [
                { namespace: 'ns', name: 'pod1' }
            ]
        };
        const replicaSet1 = {
            namespace: 'ns', name: 'rs1', displayName: 'ns/rs1', targetPods: [
                { namespace: 'ns', name: 'pod1' }
            ]
        };
        const replicaSet2 = {
            namespace: 'ns', name: 'rs2', displayName: 'ns/rs2', targetPods: [
                { namespace: 'ns', name: 'pod2' }
            ]
        };
        const replicaSet3 = {
            namespace: 'ns', name: 'rs3', displayName: 'ns/rs3', targetPods: [
                { namespace: 'ns', name: 'pod3' }
            ]
        };
        const deployment1 = {
            namespace: 'ns', name: 'deploy1', displayName: 'ns/deploy1', targetReplicaSets: [
                { namespace: 'ns', name: 'rs1' }
            ]
        };
        const dataSet1 = {
            pods: [pod1, pod2],
            services: [service1],
            replicaSets: [replicaSet1, replicaSet2],
            deployments: [deployment1]
        };
        const dataSet2 = {
            pods: [pod1, pod2, pod3],
            services: [service1],
            replicaSets: [replicaSet1, replicaSet2, replicaSet3],
            deployments: [deployment1]
        };
        const { rerender } = render(
            <ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                        onDeploymentFocus={noOpHandler} dataSet={dataSet1}/>
        );
        await waitForItemPositionStable(screen.getAllByLabelText('replicaset')[1], timeout);

        dragAndDropItem(screen.getAllByLabelText('replicaset')[1], { clientX: 20, clientY: 10 });
        await waitForItemPositionStable(screen.getAllByLabelText('replicaset')[1], timeout);
        const oldReplicaSet1Position = getItemPosition(screen.getAllByLabelText('replicaset')[0]);
        const oldReplicaSet2Position = getItemPosition(screen.getAllByLabelText('replicaset')[1]);

        rerender(
            <ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                        onDeploymentFocus={noOpHandler} dataSet={dataSet2}/>
        );
        await waitForItemPositionStable(screen.getAllByLabelText('replicaset')[2], timeout);
        const newReplicaSet1Position = getItemPosition(screen.getAllByLabelText('replicaset')[0]);
        const newReplicaSet2Position = getItemPosition(screen.getAllByLabelText('replicaset')[1]);

        expect(newReplicaSet1Position).not.toEqual(oldReplicaSet1Position);
        expect(newReplicaSet2Position).toEqual(oldReplicaSet2Position);
    }, timeout);

    it('drag and dropped deployments do not move anymore', async () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        const pod3 = { namespace: 'ns', name: 'pod3', displayName: 'ns/pod3' };
        const service1 = {
            namespace: 'ns', name: 'svc1', displayName: 'ns/svc1', targetPods: [
                { namespace: 'ns', name: 'pod1' }
            ]
        };
        const replicaSet1 = {
            namespace: 'ns', name: 'rs1', displayName: 'ns/rs1', targetPods: [
                { namespace: 'ns', name: 'pod1' }
            ]
        };
        const replicaSet2 = {
            namespace: 'ns', name: 'rs2', displayName: 'ns/rs2', targetPods: [
                { namespace: 'ns', name: 'pod2' }
            ]
        };
        const replicaSet3 = {
            namespace: 'ns', name: 'rs3', displayName: 'ns/rs3', targetPods: [
                { namespace: 'ns', name: 'pod3' }
            ]
        };
        const deployment1 = {
            namespace: 'ns', name: 'deploy1', displayName: 'ns/deploy1', targetReplicaSets: [
                { namespace: 'ns', name: 'rs1' }
            ]
        };
        const deployment2 = {
            namespace: 'ns', name: 'deploy2', displayName: 'ns/deploy2', targetReplicaSets: [
                { namespace: 'ns', name: 'rs2' }
            ]
        };
        const deployment3 = {
            namespace: 'ns', name: 'deploy3', displayName: 'ns/deploy3', targetReplicaSets: [
                { namespace: 'ns', name: 'rs3' }
            ]
        };
        const dataSet1 = {
            pods: [pod1, pod2],
            services: [service1],
            replicaSets: [replicaSet1, replicaSet2],
            deployments: [deployment1, deployment2]
        };
        const dataSet2 = {
            pods: [pod1, pod2, pod3],
            services: [service1],
            replicaSets: [replicaSet1, replicaSet2, replicaSet3],
            deployments: [deployment1, deployment2, deployment3]
        };
        const { rerender } = render(
            <ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                        onDeploymentFocus={noOpHandler} dataSet={dataSet1}/>
        );
        await waitForItemPositionStable(screen.getAllByLabelText('deployment')[1], timeout);

        dragAndDropItem(screen.getAllByLabelText('deployment')[1], { clientX: 40, clientY: 10 });
        await waitForItemPositionStable(screen.getAllByLabelText('deployment')[1], timeout);
        const oldDeployment1Position = getItemPosition(screen.getAllByLabelText('deployment')[0]);
        const oldDeployment2Position = getItemPosition(screen.getAllByLabelText('deployment')[1]);

        rerender(
            <ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                        onDeploymentFocus={noOpHandler} dataSet={dataSet2}/>
        );
        await waitForItemPositionStable(screen.getAllByLabelText('deployment')[2], timeout);
        const newDeployment1Position = getItemPosition(screen.getAllByLabelText('deployment')[0]);
        const newDeployment2Position = getItemPosition(screen.getAllByLabelText('deployment')[1]);

        expect(newDeployment1Position).not.toEqual(oldDeployment1Position);
        expect(newDeployment2Position).toEqual(oldDeployment2Position);
    }, timeout);

    it('pods, services, replicaSets, deployments and their labels keep same apparent size despite zoom', async () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const service1 = {
            namespace: 'ns', name: 'svc1', displayName: 'ns/svc1', targetPods: [
                { namespace: 'ns', name: 'pod1' }
            ]
        };
        const replicaSet1 = {
            namespace: 'ns', name: 'rs1', displayName: 'ns/rs1', targetPods: [
                { namespace: 'ns', name: 'pod1' }
            ]
        };
        const deployment1 = {
            namespace: 'ns', name: 'deploy1', displayName: 'ns/deploy1', targetReplicaSets: [
                { namespace: 'ns', name: 'rs1' }
            ]
        };
        const dataSet = {
            pods: [pod1],
            services: [service1],
            replicaSets: [replicaSet1],
            deployments: [deployment1]
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        patchGraphViewBox();
        await waitForItemPositionStable(screen.getAllByLabelText('service')[0], timeout);
        const oldPodFontSize = parseFloat(screen.getByText('ns/pod1').getAttribute('font-size'));
        const oldServiceFontSize = parseFloat(screen.getByText('ns/svc1').getAttribute('font-size'));
        const oldReplicaSetFontSize = parseFloat(screen.getByText('ns/rs1').getAttribute('font-size'));
        const oldDeploymentFontSize = parseFloat(screen.getByText('ns/deploy1').getAttribute('font-size'));

        fireEvent.wheel(screen.getByLabelText('layers container'), { deltaY: -100 }); // scroll down
        const containerScale = getScale(screen.queryByLabelText('layers container'));
        const podScale = getScale(screen.getAllByLabelText('pod')[0]);
        const serviceScale = getScale(screen.getAllByLabelText('service')[0]);
        const replicaSetScale = getScale(screen.getAllByLabelText('replicaset')[0]);
        const deploymentScale = getScale(screen.getAllByLabelText('deployment')[0]);
        const newPodFontSize = parseFloat(screen.getByText('ns/pod1').getAttribute('font-size'));
        const newServiceFontSize = parseFloat(screen.getByText('ns/svc1').getAttribute('font-size'));
        const newReplicaSetFontSize = parseFloat(screen.getByText('ns/rs1').getAttribute('font-size'));
        const newDeploymentFontSize = parseFloat(screen.getByText('ns/deploy1').getAttribute('font-size'));
        const podFontScale = newPodFontSize / oldPodFontSize;
        const serviceFontScale = newServiceFontSize / oldServiceFontSize;
        const replicaSetFontScale = newReplicaSetFontSize / oldReplicaSetFontSize;
        const deploymentFontScale = newDeploymentFontSize / oldDeploymentFontSize;

        expect(containerScale).toBeGreaterThan(1);
        expect(podScale).toEqual(1 / containerScale);
        expect(serviceScale).toEqual(1 / containerScale);
        expect(replicaSetScale).toEqual(1 / containerScale);
        expect(deploymentScale).toEqual(1 / containerScale);
        expect(podFontScale).toEqual(1 / containerScale);
        expect(serviceFontScale).toEqual(1 / containerScale);
        expect(replicaSetFontScale).toEqual(1 / containerScale);
        expect(deploymentFontScale).toEqual(1 / containerScale);
    });

    it('pod, service, replicaSet and deployments links keep same apparent size despite zoom', async () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const service1 = {
            namespace: 'ns', name: 'svc1', displayName: 'ns/svc1', targetPods: [
                { namespace: 'ns', name: 'pod1' }
            ]
        };
        const replicaSet1 = {
            namespace: 'ns', name: 'rs1', displayName: 'ns/rs1', targetPods: [
                { namespace: 'ns', name: 'pod1' }
            ]
        };
        const deployment1 = {
            namespace: 'ns', name: 'deploy1', displayName: 'ns/deploy1', targetReplicaSets: [
                { namespace: 'ns', name: 'rs1' }
            ]
        };
        const dataSet = {
            pods: [pod1],
            services: [service1],
            replicaSets: [replicaSet1],
            deployments: [deployment1]
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        patchGraphViewBox();
        await waitForItemPositionStable(screen.getAllByLabelText('service')[0], timeout);
        const oldServiceLinkWidth = parseFloat(
            screen.getAllByLabelText('service link')[0].getAttribute('stroke-width'));
        const oldReplicaSetLinkWidth = parseFloat(
            screen.getAllByLabelText('replicaset link')[0].getAttribute('stroke-width'));
        const oldDeploymentLinkWidth = parseFloat(
            screen.getAllByLabelText('deployment link')[0].getAttribute('stroke-width'));

        fireEvent.wheel(screen.getByLabelText('layers container'), { deltaY: -100 }); // scroll down
        const newServiceLinkWidth = parseFloat(
            screen.getAllByLabelText('service link')[0].getAttribute('stroke-width'));
        const newReplicaSetLinkWidth = parseFloat(
            screen.getAllByLabelText('replicaset link')[0].getAttribute('stroke-width'));
        const newDeploymentLinkWidth = parseFloat(
            screen.getAllByLabelText('deployment link')[0].getAttribute('stroke-width'));
        const containerScale = getScale(screen.queryByLabelText('layers container'));
        const serviceLinkScale = newServiceLinkWidth / oldServiceLinkWidth;
        const replicasetLinkScale = newReplicaSetLinkWidth / oldReplicaSetLinkWidth;
        const deploymentLinkScale = newDeploymentLinkWidth / oldDeploymentLinkWidth;

        expect(containerScale).toBeGreaterThan(1);
        expect(serviceLinkScale).toEqual(1 / containerScale);
        expect(replicasetLinkScale).toEqual(1 / containerScale);
        expect(deploymentLinkScale).toEqual(1 / containerScale);
    });
});
