import { render, screen } from '@testing-library/react';
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
    scrollDown,
    waitForItemPositionStable
} from '../utils/testutils';

describe('ClusterMap component', () => {

    const testTimeout = 10000;
    const waitTimeout = 5000;

    const noOpHandler = () => null;
    let mockFocusHandler;
    let pod1, pod2, pod3, pod4, pod5, pod6;
    let podRef1, podRef2, podRef3, podRef4, podRef5, podRef6;
    let service1, service1_2, service1_2_3, service1_2_3_4, service2, service3, service4;
    let replicaSet1, replicaSet1_2, replicaSet2, replicaSet3, replicaSet4;
    let replicaSetRef1, replicaSetRef1_2, replicaSetRef2, replicaSetRef3, replicaSetRef4;
    let statefulSet1, statefulSet1_2, statefulSet2, statefulSet3, statefulSet4, statefulSet5;
    let daemonSet1, daemonSet1_2, daemonSet2, daemonSet3, daemonSet5, daemonSet6;
    let deployment1, deployment1_2, deployment12, deployment12_3, deployment2, deployment3, deployment4;

    beforeEach(() => {
        mockFocusHandler = jest.fn();
        pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        pod3 = { namespace: 'ns', name: 'pod3', displayName: 'ns/pod3' };
        pod4 = { namespace: 'ns', name: 'pod4', displayName: 'ns/pod4' };
        pod5 = { namespace: 'ns', name: 'pod5', displayName: 'ns/pod5' };
        pod6 = { namespace: 'ns', name: 'pod6', displayName: 'ns/pod6' };
        podRef1 = { namespace: 'ns', name: 'pod1' };
        podRef2 = { namespace: 'ns', name: 'pod2' };
        podRef3 = { namespace: 'ns', name: 'pod3' };
        podRef4 = { namespace: 'ns', name: 'pod4' };
        podRef5 = { namespace: 'ns', name: 'pod5' };
        podRef6 = { namespace: 'ns', name: 'pod6' };
        service1 = { namespace: 'ns', name: 'svc1', displayName: 'ns/svc1', targetPods: [podRef1] };
        service1_2 = { namespace: 'ns', name: 'svc1_2', displayName: 'ns/svc1_2', targetPods: [podRef1, podRef2] };
        service1_2_3 = {
            namespace: 'ns', name: 'svc1_2_3', displayName: 'ns/svc1_2_3',
            targetPods: [podRef1, podRef2, podRef3]
        };
        service1_2_3_4 = {
            namespace: 'ns', name: 'svc1_2_3', displayName: 'ns/svc1_2_3',
            targetPods: [podRef1, podRef2, podRef3, podRef4]
        };
        service2 = { namespace: 'ns', name: 'svc2', displayName: 'ns/svc2', targetPods: [podRef2] };
        service3 = { namespace: 'ns', name: 'svc3', displayName: 'ns/svc3', targetPods: [podRef3] };
        service4 = { namespace: 'ns', name: 'svc4', displayName: 'ns/svc4', targetPods: [podRef4] };
        replicaSet1 = { namespace: 'ns', name: 'rs1', displayName: 'ns/rs1', targetPods: [podRef1] };
        replicaSet1_2 = { namespace: 'ns', name: 'rs1_2', displayName: 'ns/rs1_2', targetPods: [podRef1, podRef2] };
        replicaSet2 = { namespace: 'ns', name: 'rs2', displayName: 'ns/rs2', targetPods: [podRef2] };
        replicaSet3 = { namespace: 'ns', name: 'rs3', displayName: 'ns/rs3', targetPods: [podRef3] };
        replicaSet4 = { namespace: 'ns', name: 'rs4', displayName: 'ns/rs4', targetPods: [podRef4] };
        replicaSetRef1 = { namespace: 'ns', name: 'rs1' };
        replicaSetRef1_2 = { namespace: 'ns', name: 'rs1_2' };
        replicaSetRef2 = { namespace: 'ns', name: 'rs2' };
        replicaSetRef3 = { namespace: 'ns', name: 'rs3' };
        replicaSetRef4 = { namespace: 'ns', name: 'rs4' };
        statefulSet1 = { namespace: 'ns', name: 'ss1', displayName: 'ns/ss1', targetPods: [podRef1] };
        statefulSet1_2 = { namespace: 'ns', name: 'ss1_2', displayName: 'ns/ss1_2', targetPods: [podRef1, podRef2] };
        statefulSet2 = { namespace: 'ns', name: 'ss2', displayName: 'ns/ss2', targetPods: [podRef2] };
        statefulSet3 = { namespace: 'ns', name: 'ss3', displayName: 'ns/ss3', targetPods: [podRef3] };
        statefulSet4 = { namespace: 'ns', name: 'ss4', displayName: 'ns/ss4', targetPods: [podRef4] };
        statefulSet5 = { namespace: 'ns', name: 'ss5', displayName: 'ns/ss5', targetPods: [podRef5] };
        daemonSet1 = { namespace: 'ns', name: 'ds1', displayName: 'ns/ds1', targetPods: [podRef1] };
        daemonSet1_2 = { namespace: 'ns', name: 'ds1_2', displayName: 'ns/ds1_2', targetPods: [podRef1, podRef2] };
        daemonSet2 = { namespace: 'ns', name: 'ds2', displayName: 'ns/ds2', targetPods: [podRef2] };
        daemonSet3 = { namespace: 'ns', name: 'ds3', displayName: 'ns/ds3', targetPods: [podRef3] };
        daemonSet5 = { namespace: 'ns', name: 'ds5', displayName: 'ns/ds5', targetPods: [podRef5] };
        daemonSet6 = { namespace: 'ns', name: 'ds6', displayName: 'ns/ds6', targetPods: [podRef6] };
        deployment1 = {
            namespace: 'ns', name: 'deploy1', displayName: 'ns/deploy1',
            targetReplicaSets: [replicaSetRef1]
        };
        deployment1_2 = {
            namespace: 'ns', name: 'deploy1_2', displayName: 'ns/deploy1_2',
            targetReplicaSets: [replicaSetRef1, replicaSetRef2]
        };
        deployment12 = {
            namespace: 'ns', name: 'deploy12', displayName: 'ns/deploy12',
            targetReplicaSets: [replicaSetRef1_2]
        };
        deployment12_3 = {
            namespace: 'ns', name: 'deploy12_3', displayName: 'ns/deploy12_3',
            targetReplicaSets: [replicaSetRef1_2, replicaSetRef3]
        };
        deployment2 = {
            namespace: 'ns', name: 'deploy2', displayName: 'ns/deploy2',
            targetReplicaSets: [replicaSetRef2]
        };
        deployment3 = {
            namespace: 'ns', name: 'deploy3', displayName: 'ns/deploy3',
            targetReplicaSets: [replicaSetRef3]
        };
        deployment4 = {
            namespace: 'ns', name: 'deploy4', displayName: 'ns/deploy4',
            targetReplicaSets: [replicaSetRef4]
        };
    });

    it('displays pods and their labels', () => {
        const dataSet = {
            pods: [pod1, pod2],
            services: [],
            replicaSets: [],
            statefulSets: [],
            daemonSets: [],
            deployments: []
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);

        expect(screen.queryAllByLabelText('pod')).toHaveLength(2);
        expect(screen.queryByText(pod1.displayName)).toBeInTheDocument();
        expect(screen.queryByText(pod2.displayName)).toBeInTheDocument();
    });

    it('displays services with links to pods', () => {
        const dataSet = {
            pods: [pod1, pod2, pod3],
            services: [service1_2, service3],
            replicaSets: [],
            statefulSets: [],
            daemonSets: [],
            deployments: []
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);

        expect(screen.queryAllByLabelText('service')).toHaveLength(2);
        expect(screen.queryByText(service1_2.displayName)).toBeInTheDocument();
        expect(screen.queryByText(service3.displayName)).toBeInTheDocument();
        expect(screen.queryAllByLabelText('service link')).toHaveLength(3);
    });

    it('displays replicaSets with links to pods', () => {
        const dataSet = {
            pods: [pod1, pod2, pod3],
            services: [],
            replicaSets: [replicaSet1_2, replicaSet3],
            statefulSets: [],
            daemonSets: [],
            deployments: []
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);

        expect(screen.queryAllByLabelText('replicaset')).toHaveLength(2);
        expect(screen.queryByText(replicaSet1_2.displayName)).toBeInTheDocument();
        expect(screen.queryByText(replicaSet3.displayName)).toBeInTheDocument();
        expect(screen.queryAllByLabelText('replicaset link')).toHaveLength(3);
    });

    it('displays statefulSets with links to pods', () => {
        const dataSet = {
            pods: [pod1, pod2, pod3],
            services: [],
            replicaSets: [],
            statefulSets: [statefulSet1_2, statefulSet3],
            daemonSets: [],
            deployments: []
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);

        expect(screen.queryAllByLabelText('statefulset')).toHaveLength(2);
        expect(screen.queryByText(statefulSet1_2.displayName)).toBeInTheDocument();
        expect(screen.queryByText(statefulSet3.displayName)).toBeInTheDocument();
        expect(screen.queryAllByLabelText('statefulset link')).toHaveLength(3);
    });

    it('displays daemonSets with links to pods', () => {
        const dataSet = {
            pods: [pod1, pod2, pod3],
            services: [],
            replicaSets: [],
            statefulSets: [],
            daemonSets: [daemonSet1_2, daemonSet3],
            deployments: []
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);

        expect(screen.queryAllByLabelText('daemonset')).toHaveLength(2);
        expect(screen.queryByText(daemonSet1_2.displayName)).toBeInTheDocument();
        expect(screen.queryByText(daemonSet3.displayName)).toBeInTheDocument();
        expect(screen.queryAllByLabelText('daemonset link')).toHaveLength(3);
    });

    it('sorts pods by service index then replicaSet index then statefulSet index then daemonSet index', () => {
        const dataSet = {
            pods: [pod5, pod4, pod3, pod2, pod1],
            services: [service1_2, service3],
            replicaSets: [replicaSet1, replicaSet2],
            statefulSets: [statefulSet4],
            daemonSets: [daemonSet5],
            deployments: []
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);

        const allPodLabels = screen.queryAllByText(/ns\/pod\d/);
        expect(allPodLabels[0].textContent).toEqual(pod1.displayName);
        expect(allPodLabels[1].textContent).toEqual(pod2.displayName);
        expect(allPodLabels[2].textContent).toEqual(pod3.displayName);
        expect(allPodLabels[3].textContent).toEqual(pod4.displayName);
        expect(allPodLabels[4].textContent).toEqual(pod5.displayName);
    });

    it('sorts services by their name', () => {
        const dataSet = {
            pods: [pod1, pod2],
            services: [service2, service1],
            replicaSets: [],
            statefulSets: [],
            daemonSets: [],
            deployments: []
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);

        const allServiceLabels = screen.queryAllByText(/ns\/svc\d/);
        expect(allServiceLabels[0].textContent).toEqual(service1.displayName);
        expect(allServiceLabels[1].textContent).toEqual(service2.displayName);
    });

    it('sorts replicaSets by index of their first target pod', () => {
        const dataSet = {
            pods: [pod2, pod1],
            services: [service1, service2],
            replicaSets: [replicaSet2, replicaSet1],
            statefulSets: [],
            daemonSets: [],
            deployments: []
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);

        const allReplicaSetLabels = screen.queryAllByText(/ns\/rs\d/);
        expect(allReplicaSetLabels[0].textContent).toEqual(replicaSet1.displayName);
        expect(allReplicaSetLabels[1].textContent).toEqual(replicaSet2.displayName);
    });

    it('sorts statefulSets by index of their first target pod', () => {
        const dataSet = {
            pods: [pod2, pod1],
            services: [service1, service2],
            replicaSets: [],
            statefulSets: [statefulSet2, statefulSet1],
            daemonSets: [],
            deployments: []
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);

        const allStatefulSetLabels = screen.queryAllByText(/ns\/ss\d/);
        expect(allStatefulSetLabels[0].textContent).toEqual(statefulSet1.displayName);
        expect(allStatefulSetLabels[1].textContent).toEqual(statefulSet2.displayName);
    });

    it('sorts daemonSets by index of their first target pod', () => {
        const dataSet = {
            pods: [pod2, pod1],
            services: [service1, service2],
            replicaSets: [],
            statefulSets: [],
            daemonSets: [daemonSet2, daemonSet1],
            deployments: []
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);

        const allDaemonSetLabels = screen.queryAllByText(/ns\/ds\d/);
        expect(allDaemonSetLabels[0].textContent).toEqual(daemonSet1.displayName);
        expect(allDaemonSetLabels[1].textContent).toEqual(daemonSet2.displayName);
    });

    it('sorts deployments by index of their first target replicaSet', () => {
        const dataSet = {
            pods: [pod2, pod1],
            services: [service1, service2],
            replicaSets: [replicaSet2, replicaSet1],
            statefulSets: [],
            daemonSets: [],
            deployments: [deployment2, deployment1]
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);

        const allDeploymentLabels = screen.queryAllByText(/ns\/deploy\d/);
        expect(allDeploymentLabels[0].textContent).toEqual(deployment1.displayName);
        expect(allDeploymentLabels[1].textContent).toEqual(deployment2.displayName);
    });

    it('displays deployments with links to replicaSets', () => {
        const dataSet = {
            pods: [pod1, pod2, pod3],
            services: [],
            replicaSets: [replicaSet1, replicaSet2, replicaSet3],
            statefulSets: [],
            daemonSets: [],
            deployments: [deployment1_2, deployment3]
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);

        expect(screen.queryAllByLabelText('deployment')).toHaveLength(2);
        expect(screen.queryByText(deployment1_2.displayName)).toBeInTheDocument();
        expect(screen.queryByText(deployment3.displayName)).toBeInTheDocument();
        expect(screen.queryAllByLabelText('deployment link')).toHaveLength(3);
    });

    it('calls handler on pod focus', async () => {
        const dataSet = {
            pods: [pod1],
            services: [],
            replicaSets: [],
            statefulSets: [],
            daemonSets: [],
            deployments: []
        };
        render(<ClusterMap onPodFocus={mockFocusHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], waitTimeout);

        hoverItem(screen.getAllByLabelText('pod')[0]);

        expect(mockFocusHandler).toHaveBeenCalledWith(pod1);
    }, testTimeout);

    it('calls handler on service or service link focus', async () => {
        const dataSet = {
            pods: [pod1],
            services: [service1],
            replicaSets: [],
            statefulSets: [],
            daemonSets: [],
            deployments: []
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={mockFocusHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('service')[0], waitTimeout);

        hoverItem(screen.getAllByLabelText('service')[0]);

        expect(mockFocusHandler).toHaveBeenCalledWith(service1);

        hoverAway();
        mockFocusHandler.mockClear();
        hoverLink(screen.getAllByLabelText('service link')[0]);

        expect(mockFocusHandler).toHaveBeenCalledWith(service1);
    }, testTimeout);

    it('calls handler on replicaSet or replicaSet link focus', async () => {
        const dataSet = {
            pods: [pod1],
            services: [],
            replicaSets: [replicaSet1],
            statefulSets: [],
            daemonSets: [],
            deployments: []
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={mockFocusHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('replicaset')[0], waitTimeout);

        hoverItem(screen.getAllByLabelText('replicaset')[0]);

        expect(mockFocusHandler).toHaveBeenCalledWith(replicaSet1);

        hoverAway();
        mockFocusHandler.mockClear();
        hoverLink(screen.getAllByLabelText('replicaset link')[0]);

        expect(mockFocusHandler).toHaveBeenCalledWith(replicaSet1);
    }, testTimeout);

    it('calls handler on statefulSet or statefulSet link focus', async () => {
        const dataSet = {
            pods: [pod1],
            services: [],
            replicaSets: [],
            statefulSets: [statefulSet1],
            daemonSets: [],
            deployments: []
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={mockFocusHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('statefulset')[0], waitTimeout);

        hoverItem(screen.getAllByLabelText('statefulset')[0]);

        expect(mockFocusHandler).toHaveBeenCalledWith(statefulSet1);

        hoverAway();
        mockFocusHandler.mockClear();
        hoverLink(screen.getAllByLabelText('statefulset link')[0]);

        expect(mockFocusHandler).toHaveBeenCalledWith(statefulSet1);
    }, testTimeout);

    it('calls handler on daemonSet or daemonSet link focus', async () => {
        const dataSet = {
            pods: [pod1],
            services: [],
            replicaSets: [],
            statefulSets: [],
            daemonSets: [daemonSet1],
            deployments: []
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={mockFocusHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('daemonset')[0], waitTimeout);

        hoverItem(screen.getAllByLabelText('daemonset')[0]);

        expect(mockFocusHandler).toHaveBeenCalledWith(daemonSet1);

        hoverAway();
        mockFocusHandler.mockClear();
        hoverLink(screen.getAllByLabelText('daemonset link')[0]);

        expect(mockFocusHandler).toHaveBeenCalledWith(daemonSet1);
    }, testTimeout);

    it('calls handler on deployment or deployment link focus', async () => {
        const dataSet = {
            pods: [pod1],
            services: [],
            replicaSets: [replicaSet1],
            statefulSets: [],
            daemonSets: [],
            deployments: [deployment1]
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={mockFocusHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('deployment')[0], waitTimeout);

        hoverItem(screen.getAllByLabelText('deployment')[0]);

        expect(mockFocusHandler).toHaveBeenCalledWith(deployment1);

        hoverAway();
        mockFocusHandler.mockClear();
        hoverLink(screen.getAllByLabelText('deployment link')[0]);

        expect(mockFocusHandler).toHaveBeenCalledWith(deployment1);
    }, testTimeout);

    it('updates local state properly', () => {
        const pod1WithoutNamespaceDisplay = { ...pod1, displayName: 'pod1' };
        const pod2WithoutNamespaceDisplay = { ...pod2, displayName: 'pod2' };
        const pod3WithoutNamespaceDisplay = { ...pod3, displayName: 'pod3' };
        const pod4WithoutNamespaceDisplay = { ...pod4, displayName: 'pod4' };
        const pod5WithoutNamespaceDisplay = { ...pod5, displayName: 'pod5' };
        const pod6WithoutNamespaceDisplay = { ...pod6, displayName: 'pod6' };
        const service1_2WithoutNamespaceDisplay = { ...service1_2, displayName: 'svc12' };
        const service4WithoutNamespaceDisplay = { ...service4, displayName: 'svc4' };
        const replicaSet1_2WithoutNamespaceDisplay = { ...replicaSet1_2, displayName: 'replicaSet12' };
        const replicaSet3WithoutNamespaceDisplay = { ...replicaSet3, displayName: 'replicaSet3' };
        const statefulSet2WithoutNamespaceDisplay = { ...statefulSet2, displayName: 'statefulSet2' };
        const statefulSet5WithoutNamespaceDisplay = { ...statefulSet5, displayName: 'statefulSet5' };
        const daemonSet3WithoutNamespaceDisplay = { ...daemonSet3, displayName: 'daemonSet3' };
        const daemonSet6WithoutNamespaceDisplay = { ...daemonSet6, displayName: 'daemonSet6' };
        const deployment12_3WithoutNamespaceDisplay = { ...deployment12_3, displayName: 'deployment12' };
        const deployment3WithoutNamespaceDisplay = { ...deployment3, displayName: 'deployment3' };
        const dataSet1 = {
            pods: [pod1, pod2, pod3],
            services: [service1],
            replicaSets: [replicaSet1],
            statefulSets: [statefulSet2],
            daemonSets: [daemonSet3],
            deployments: [deployment1]
        };
        const dataSet2 = {
            pods: [pod1WithoutNamespaceDisplay, pod2WithoutNamespaceDisplay, pod3WithoutNamespaceDisplay,
                pod4WithoutNamespaceDisplay, pod5WithoutNamespaceDisplay, pod6WithoutNamespaceDisplay],
            services: [service1_2WithoutNamespaceDisplay, service4WithoutNamespaceDisplay],
            replicaSets: [replicaSet1_2WithoutNamespaceDisplay, replicaSet3WithoutNamespaceDisplay],
            statefulSets: [statefulSet2WithoutNamespaceDisplay, statefulSet5WithoutNamespaceDisplay],
            daemonSets: [daemonSet3WithoutNamespaceDisplay, daemonSet6WithoutNamespaceDisplay],
            deployments: [deployment12_3WithoutNamespaceDisplay, deployment3WithoutNamespaceDisplay]
        };

        const { rerender } = render(
            <ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                        onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                        onDeploymentFocus={noOpHandler} dataSet={dataSet1}/>
        );
        rerender(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                             onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                             onDeploymentFocus={noOpHandler} dataSet={dataSet2}/>);

        expect(screen.queryAllByLabelText('pod')).toHaveLength(6);
        expect(screen.queryByText(pod1.displayName)).not.toBeInTheDocument();
        expect(screen.queryByText(pod2.displayName)).not.toBeInTheDocument();
        expect(screen.queryByText(pod3.displayName)).not.toBeInTheDocument();
        expect(screen.queryByText(pod1WithoutNamespaceDisplay.displayName)).toBeInTheDocument();
        expect(screen.queryByText(pod2WithoutNamespaceDisplay.displayName)).toBeInTheDocument();
        expect(screen.queryByText(pod3WithoutNamespaceDisplay.displayName)).toBeInTheDocument();
        expect(screen.queryByText(pod4WithoutNamespaceDisplay.displayName)).toBeInTheDocument();
        expect(screen.queryByText(pod5WithoutNamespaceDisplay.displayName)).toBeInTheDocument();
        expect(screen.queryByText(pod6WithoutNamespaceDisplay.displayName)).toBeInTheDocument();
        expect(screen.queryAllByLabelText('service')).toHaveLength(2);
        expect(screen.queryByText(service1.displayName)).not.toBeInTheDocument();
        expect(screen.queryByText(service1_2WithoutNamespaceDisplay.displayName)).toBeInTheDocument();
        expect(screen.queryByText(service4WithoutNamespaceDisplay.displayName)).toBeInTheDocument();
        expect(screen.queryAllByLabelText('service link')).toHaveLength(3);
        expect(screen.queryAllByLabelText('replicaset')).toHaveLength(2);
        expect(screen.queryByText(replicaSet1.displayName)).not.toBeInTheDocument();
        expect(screen.queryByText(replicaSet1_2WithoutNamespaceDisplay.displayName)).toBeInTheDocument();
        expect(screen.queryByText(replicaSet3WithoutNamespaceDisplay.displayName)).toBeInTheDocument();
        expect(screen.queryAllByLabelText('replicaset link')).toHaveLength(3);
        expect(screen.queryAllByLabelText('statefulset')).toHaveLength(2);
        expect(screen.queryByText(statefulSet2.displayName)).not.toBeInTheDocument();
        expect(screen.queryByText(statefulSet2WithoutNamespaceDisplay.displayName)).toBeInTheDocument();
        expect(screen.queryByText(statefulSet5WithoutNamespaceDisplay.displayName)).toBeInTheDocument();
        expect(screen.queryAllByLabelText('statefulset link')).toHaveLength(2);
        expect(screen.queryAllByLabelText('daemonset')).toHaveLength(2);
        expect(screen.queryByText(daemonSet3.displayName)).not.toBeInTheDocument();
        expect(screen.queryByText(daemonSet3WithoutNamespaceDisplay.displayName)).toBeInTheDocument();
        expect(screen.queryByText(daemonSet6WithoutNamespaceDisplay.displayName)).toBeInTheDocument();
        expect(screen.queryAllByLabelText('daemonset link')).toHaveLength(2);
        expect(screen.queryAllByLabelText('deployment')).toHaveLength(2);
        expect(screen.queryByText(deployment1.displayName)).not.toBeInTheDocument();
        expect(screen.queryByText(deployment12_3WithoutNamespaceDisplay.displayName)).toBeInTheDocument();
        expect(screen.queryByText(deployment3WithoutNamespaceDisplay.displayName)).toBeInTheDocument();
        expect(screen.queryAllByLabelText('deployment link')).toHaveLength(3);
    });

    it('focused pods have a different appearance', async () => {
        const dataSet = {
            pods: [pod1, pod2],
            services: [],
            replicaSets: [],
            statefulSets: [],
            daemonSets: [],
            deployments: []
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], waitTimeout);

        hoverItem(screen.getAllByLabelText('pod')[0]);

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item-faded');
    }, testTimeout);

    it('focused services and service links have a different appearance', async () => {
        const dataSet = {
            pods: [pod1, pod2],
            services: [service1, service2],
            replicaSets: [],
            statefulSets: [],
            daemonSets: [],
            deployments: []
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('service')[0], waitTimeout);

        hoverItem(screen.getAllByLabelText('service')[0]);

        expect(screen.getAllByLabelText('service')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('service')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('service link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('service link')[1]).toHaveAttribute('class', 'link-faded');
    }, testTimeout);

    it('focused replicaSets and replicaSet links have a different appearance', async () => {
        const dataSet = {
            pods: [pod1, pod2],
            services: [],
            replicaSets: [replicaSet1, replicaSet2],
            statefulSets: [],
            daemonSets: [],
            deployments: []
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('replicaset')[0], waitTimeout);

        hoverItem(screen.getAllByLabelText('replicaset')[0]);

        expect(screen.getAllByLabelText('replicaset')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('replicaset')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('replicaset link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('replicaset link')[1]).toHaveAttribute('class', 'link-faded');
    }, testTimeout);

    it('focused statefulSets and statefulSet links have a different appearance', async () => {
        const dataSet = {
            pods: [pod1, pod2],
            services: [],
            replicaSets: [],
            statefulSets: [statefulSet1, statefulSet2],
            daemonSets: [],
            deployments: []
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('statefulset')[0], waitTimeout);

        hoverItem(screen.getAllByLabelText('statefulset')[0]);

        expect(screen.getAllByLabelText('statefulset')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('statefulset')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('statefulset link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('statefulset link')[1]).toHaveAttribute('class', 'link-faded');
    }, testTimeout);

    it('focused daemonSets and daemonSet links have a different appearance', async () => {
        const dataSet = {
            pods: [pod1, pod2],
            services: [],
            replicaSets: [],
            statefulSets: [],
            daemonSets: [daemonSet1, daemonSet2],
            deployments: []
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('daemonset')[0], waitTimeout);

        hoverItem(screen.getAllByLabelText('daemonset')[0]);

        expect(screen.getAllByLabelText('daemonset')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('daemonset')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('daemonset link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('daemonset link')[1]).toHaveAttribute('class', 'link-faded');
    }, testTimeout);

    it('focused deployments and deployment links have a different appearance', async () => {
        const dataSet = {
            pods: [pod1, pod2],
            services: [],
            replicaSets: [replicaSet1, replicaSet2],
            statefulSets: [],
            daemonSets: [],
            deployments: [deployment1, deployment2]
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('deployment')[0], waitTimeout);

        hoverItem(screen.getAllByLabelText('deployment')[0]);

        expect(screen.getAllByLabelText('deployment')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('deployment')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('deployment link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('deployment link')[1]).toHaveAttribute('class', 'link-faded');
    }, testTimeout);

    it('focusing a pod also focuses connected services, {replica|stateful|daemon}Sets and deployments', async () => {
        const dataSet = {
            pods: [pod1, pod2, pod3, pod4],
            services: [service1_2, service3, service4],
            replicaSets: [replicaSet1_2, replicaSet3, replicaSet4],
            statefulSets: [statefulSet1_2, daemonSet3],
            daemonSets: [daemonSet1_2, daemonSet3],
            deployments: [deployment12_3, deployment4]
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], waitTimeout);

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
        expect(screen.getAllByLabelText('statefulset')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('statefulset link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('statefulset')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('statefulset link')[1]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('daemonset')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('daemonset link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('daemonset')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('daemonset link')[1]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('deployment')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('deployment link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('deployment')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('deployment link')[1]).toHaveAttribute('class', 'link-faded');
    }, testTimeout);

    it('focusing a service also focuses its target pods', async () => {
        const dataSet = {
            pods: [pod1, pod2, pod3],
            services: [service1_2, service3],
            replicaSets: [replicaSet1_2],
            statefulSets: [statefulSet1],
            daemonSets: [daemonSet1],
            deployments: [deployment12]
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('service')[0], waitTimeout);

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
        expect(screen.getAllByLabelText('statefulset')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('statefulset link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('daemonset')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('daemonset link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('deployment')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('deployment link')[0]).toHaveAttribute('class', 'link-faded');
    }, testTimeout);

    it('focusing a service link also focuses its service and target pod', async () => {
        const dataSet = {
            pods: [pod1, pod2, pod3],
            services: [service1_2, service3],
            replicaSets: [replicaSet1_2],
            statefulSets: [statefulSet1],
            daemonSets: [daemonSet1],
            deployments: [deployment12]
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('service')[0], waitTimeout);

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
        expect(screen.getAllByLabelText('statefulset')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('statefulset link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('daemonset')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('daemonset link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('deployment')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('deployment link')[0]).toHaveAttribute('class', 'link-faded');
    }, testTimeout);

    it('focusing a replicaSet also focuses its target pods and its deployment', async () => {
        const dataSet = {
            pods: [pod1, pod2, pod3],
            services: [service1_2_3],
            replicaSets: [replicaSet1_2, replicaSet3],
            statefulSets: [statefulSet1],
            daemonSets: [daemonSet1],
            deployments: [deployment12, deployment3]
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('replicaset')[0], waitTimeout);

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
        expect(screen.getAllByLabelText('statefulset')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('statefulset link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('daemonset')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('daemonset link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('deployment')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('deployment link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('deployment')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('deployment link')[1]).toHaveAttribute('class', 'link-faded');
    }, testTimeout);

    it('focusing a replicaSet link also focuses its replicaSet and target pod', async () => {
        const dataSet = {
            pods: [pod1, pod2, pod3],
            services: [service1_2_3],
            replicaSets: [replicaSet1_2, replicaSet3],
            statefulSets: [statefulSet1],
            daemonSets: [daemonSet1],
            deployments: [deployment12, deployment3]
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('replicaset')[0], waitTimeout);

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
        expect(screen.getAllByLabelText('statefulset')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('statefulset link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('daemonset')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('daemonset link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('deployment')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('deployment link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('deployment')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('deployment link')[1]).toHaveAttribute('class', 'link-faded');
    }, testTimeout);

    it('focusing a statefulSet also focuses its target pods', async () => {
        const dataSet = {
            pods: [pod1, pod2, pod3],
            services: [service1_2_3],
            replicaSets: [replicaSet1],
            statefulSets: [statefulSet1_2, statefulSet3],
            daemonSets: [daemonSet1],
            deployments: [deployment1]
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('statefulset')[0], waitTimeout);

        hoverItem(screen.getAllByLabelText('statefulset')[0]);

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[2]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('service')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('service link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('replicaset')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('replicaset link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('statefulset')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('statefulset link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('statefulset link')[1]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('statefulset')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('statefulset link')[2]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('daemonset')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('daemonset link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('deployment')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('deployment link')[0]).toHaveAttribute('class', 'link-faded');
    }, testTimeout);

    it('focusing a statefulSet link also focuses its statefulSet and target pod', async () => {
        const dataSet = {
            pods: [pod1, pod2, pod3],
            services: [service1_2_3],
            replicaSets: [replicaSet1],
            statefulSets: [statefulSet1_2, statefulSet3],
            daemonSets: [daemonSet1],
            deployments: [deployment1]
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('statefulset')[0], waitTimeout);

        hoverLink(screen.getAllByLabelText('statefulset link')[0]);

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('pod')[2]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('service')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('service link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('replicaset')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('replicaset link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('statefulset')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('statefulset link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('statefulset link')[1]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('statefulset')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('statefulset link')[2]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('daemonset')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('daemonset link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('deployment')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('deployment link')[0]).toHaveAttribute('class', 'link-faded');
    }, testTimeout);

    it('focusing a daemonSet also focuses its target pods', async () => {
        const dataSet = {
            pods: [pod1, pod2, pod3],
            services: [service1_2_3],
            replicaSets: [replicaSet1],
            statefulSets: [statefulSet1],
            daemonSets: [daemonSet1_2, daemonSet3],
            deployments: [deployment1]
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('daemonset')[0], waitTimeout);

        hoverItem(screen.getAllByLabelText('daemonset')[0]);

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[2]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('service')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('service link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('replicaset')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('replicaset link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('statefulset')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('statefulset link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('daemonset')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('daemonset link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('daemonset link')[1]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('daemonset')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('daemonset link')[2]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('deployment')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('deployment link')[0]).toHaveAttribute('class', 'link-faded');
    }, testTimeout);

    it('focusing a daemonSet link also focuses its statefulSet and target pod', async () => {
        const dataSet = {
            pods: [pod1, pod2, pod3],
            services: [service1_2_3],
            replicaSets: [replicaSet1],
            statefulSets: [statefulSet1],
            daemonSets: [daemonSet1_2, daemonSet3],
            deployments: [deployment1]
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('daemonset')[0], waitTimeout);

        hoverLink(screen.getAllByLabelText('daemonset link')[0]);

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('pod')[2]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('service')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('service link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('replicaset')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('replicaset link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('statefulset')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('statefulset link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('daemonset')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('daemonset link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('daemonset link')[1]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('daemonset')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('daemonset link')[2]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('deployment')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('deployment link')[0]).toHaveAttribute('class', 'link-faded');
    }, testTimeout);

    it('focusing a deployment also focuses its target replicaSets and their target pods', async () => {
        const dataSet = {
            pods: [pod1, pod2, pod3, pod4],
            services: [service1_2_3_4],
            replicaSets: [replicaSet1_2, replicaSet3, replicaSet4],
            statefulSets: [statefulSet1],
            daemonSets: [daemonSet1],
            deployments: [deployment12_3, deployment4]
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('deployment')[0], waitTimeout);

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
        expect(screen.getAllByLabelText('statefulset')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('statefulset link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('daemonset')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('daemonset link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('deployment')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('deployment link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('deployment link')[1]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('deployment')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('deployment link')[2]).toHaveAttribute('class', 'link-faded');
    }, testTimeout);

    it('focusing a deployment link also focuses its deployment and target replicaSet', async () => {
        const dataSet = {
            pods: [pod1, pod2, pod3],
            services: [service1_2_3],
            replicaSets: [replicaSet1, replicaSet2, replicaSet3],
            statefulSets: [statefulSet1],
            daemonSets: [daemonSet1],
            deployments: [deployment1_2, deployment3]
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('deployment')[0], waitTimeout);

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
        expect(screen.getAllByLabelText('statefulset')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('statefulset link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('daemonset')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('daemonset link')[0]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('deployment')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('deployment link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('deployment link')[1]).toHaveAttribute('class', 'link-faded');
        expect(screen.getAllByLabelText('deployment')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('deployment link')[2]).toHaveAttribute('class', 'link-faded');
    }, testTimeout);

    it('unfocusing an element should remove all fades', async () => {
        const dataSet = {
            pods: [pod1],
            services: [service1],
            replicaSets: [replicaSet1],
            statefulSets: [statefulSet1],
            daemonSets: [daemonSet1],
            deployments: [deployment1]
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('service')[0], waitTimeout);

        hoverItem(screen.getAllByLabelText('pod')[0]);
        hoverAway();

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('service')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('service link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('replicaset')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('replicaset link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('statefulset')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('statefulset link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('daemonset')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('daemonset link')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('deployment')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('deployment link')[0]).toHaveAttribute('class', 'link');
    }, testTimeout);

    it('focused element should stay focused after component update', async () => {
        const dataSet1 = {
            pods: [pod1, pod2],
            services: [service1],
            replicaSets: [replicaSet1],
            statefulSets: [],
            daemonSets: [],
            deployments: [deployment1]
        };
        const dataSet2 = {
            pods: [pod1, pod2],
            services: [service1, service2],
            replicaSets: [replicaSet1],
            statefulSets: [],
            daemonSets: [],
            deployments: [deployment1]
        };
        const { rerender } = render(
            <ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                        onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                        onDeploymentFocus={noOpHandler} dataSet={dataSet1}/>
        );
        await waitForItemPositionStable(screen.getAllByLabelText('service')[0], waitTimeout);

        hoverItem(screen.getAllByLabelText('service')[0]);
        rerender(
            <ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                        onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
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
    }, testTimeout);

    it('drag and dropped services do not move anymore', async () => {
        const dataSet1 = {
            pods: [pod1, pod2],
            services: [service1, service2],
            replicaSets: [replicaSet1],
            statefulSets: [],
            daemonSets: [],
            deployments: [deployment1]
        };
        const dataSet2 = {
            pods: [pod1, pod2, pod3],
            services: [service1, service2, service3],
            replicaSets: [replicaSet1],
            statefulSets: [],
            daemonSets: [],
            deployments: [deployment1]
        };
        const { rerender } = render(
            <ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                        onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                        onDeploymentFocus={noOpHandler} dataSet={dataSet1}/>
        );
        await waitForItemPositionStable(screen.getAllByLabelText('service')[1], waitTimeout);

        dragAndDropItem(screen.getAllByLabelText('service')[1], { clientX: -20, clientY: 10 });
        await waitForItemPositionStable(screen.getAllByLabelText('service')[1], waitTimeout);
        const oldService1Position = getItemPosition(screen.getAllByLabelText('service')[0]);
        const oldService2Position = getItemPosition(screen.getAllByLabelText('service')[1]);
        rerender(
            <ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                        onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                        onDeploymentFocus={noOpHandler} dataSet={dataSet2}/>
        );
        await waitForItemPositionStable(screen.getAllByLabelText('service')[2], waitTimeout);
        const newService1Position = getItemPosition(screen.getAllByLabelText('service')[0]);
        const newService2Position = getItemPosition(screen.getAllByLabelText('service')[1]);

        expect(newService1Position).not.toEqual(oldService1Position);
        expect(newService2Position).toEqual(oldService2Position);
    }, testTimeout);

    it('drag and dropped replicaSets do not move anymore', async () => {
        const dataSet1 = {
            pods: [pod1, pod2],
            services: [service1],
            replicaSets: [replicaSet1, replicaSet2],
            statefulSets: [],
            daemonSets: [],
            deployments: [deployment1]
        };
        const dataSet2 = {
            pods: [pod1, pod2, pod3],
            services: [service1],
            replicaSets: [replicaSet1, replicaSet2, replicaSet3],
            statefulSets: [],
            daemonSets: [],
            deployments: [deployment1]
        };
        const { rerender } = render(
            <ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                        onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                        onDeploymentFocus={noOpHandler} dataSet={dataSet1}/>
        );
        await waitForItemPositionStable(screen.getAllByLabelText('replicaset')[1], waitTimeout);

        dragAndDropItem(screen.getAllByLabelText('replicaset')[1], { clientX: 20, clientY: 10 });
        await waitForItemPositionStable(screen.getAllByLabelText('replicaset')[1], waitTimeout);
        const oldReplicaSet1Position = getItemPosition(screen.getAllByLabelText('replicaset')[0]);
        const oldReplicaSet2Position = getItemPosition(screen.getAllByLabelText('replicaset')[1]);
        rerender(
            <ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                        onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                        onDeploymentFocus={noOpHandler} dataSet={dataSet2}/>
        );
        await waitForItemPositionStable(screen.getAllByLabelText('replicaset')[2], waitTimeout);
        const newReplicaSet1Position = getItemPosition(screen.getAllByLabelText('replicaset')[0]);
        const newReplicaSet2Position = getItemPosition(screen.getAllByLabelText('replicaset')[1]);

        expect(newReplicaSet1Position).not.toEqual(oldReplicaSet1Position);
        expect(newReplicaSet2Position).toEqual(oldReplicaSet2Position);
    }, testTimeout);

    it('drag and dropped statefulSets do not move anymore', async () => {
        const dataSet1 = {
            pods: [pod1, pod2],
            services: [],
            replicaSets: [],
            statefulSets: [statefulSet1, statefulSet2],
            daemonSets: [],
            deployments: []
        };
        const dataSet2 = {
            pods: [pod1, pod2, pod3],
            services: [],
            replicaSets: [],
            statefulSets: [statefulSet1, statefulSet2, statefulSet3],
            daemonSets: [],
            deployments: []
        };
        const { rerender } = render(
            <ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                        onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                        onDeploymentFocus={noOpHandler} dataSet={dataSet1}/>
        );
        await waitForItemPositionStable(screen.getAllByLabelText('statefulset')[1], waitTimeout);

        dragAndDropItem(screen.getAllByLabelText('statefulset')[1], { clientX: 20, clientY: 10 });
        await waitForItemPositionStable(screen.getAllByLabelText('statefulset')[1], waitTimeout);
        const oldStatefulSet1Position = getItemPosition(screen.getAllByLabelText('statefulset')[0]);
        const oldStatefulSet2Position = getItemPosition(screen.getAllByLabelText('statefulset')[1]);
        rerender(
            <ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                        onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                        onDeploymentFocus={noOpHandler} dataSet={dataSet2}/>
        );
        await waitForItemPositionStable(screen.getAllByLabelText('statefulset')[2], waitTimeout);
        const newStatefulSet1Position = getItemPosition(screen.getAllByLabelText('statefulset')[0]);
        const newStatefulSet2Position = getItemPosition(screen.getAllByLabelText('statefulset')[1]);

        expect(newStatefulSet1Position).not.toEqual(oldStatefulSet1Position);
        expect(newStatefulSet2Position).toEqual(oldStatefulSet2Position);
    }, testTimeout);

    it('drag and dropped daemonSets do not move anymore', async () => {
        const dataSet1 = {
            pods: [pod1, pod2],
            services: [],
            replicaSets: [],
            statefulSets: [],
            daemonSets: [daemonSet1, daemonSet2],
            deployments: []
        };
        const dataSet2 = {
            pods: [pod1, pod2, pod3],
            services: [],
            replicaSets: [],
            statefulSets: [],
            daemonSets: [daemonSet1, daemonSet2, daemonSet3],
            deployments: []
        };
        const { rerender } = render(
            <ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                        onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                        onDeploymentFocus={noOpHandler} dataSet={dataSet1}/>
        );
        await waitForItemPositionStable(screen.getAllByLabelText('daemonset')[1], waitTimeout);

        dragAndDropItem(screen.getAllByLabelText('daemonset')[1], { clientX: 20, clientY: 10 });
        await waitForItemPositionStable(screen.getAllByLabelText('daemonset')[1], waitTimeout);
        const oldDaemonSet1Position = getItemPosition(screen.getAllByLabelText('daemonset')[0]);
        const oldDaemonSet2Position = getItemPosition(screen.getAllByLabelText('daemonset')[1]);
        rerender(
            <ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                        onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                        onDeploymentFocus={noOpHandler} dataSet={dataSet2}/>
        );
        await waitForItemPositionStable(screen.getAllByLabelText('daemonset')[2], waitTimeout);
        const newDaemonSet1Position = getItemPosition(screen.getAllByLabelText('daemonset')[0]);
        const newDaemonSet2Position = getItemPosition(screen.getAllByLabelText('daemonset')[1]);

        expect(newDaemonSet1Position).not.toEqual(oldDaemonSet1Position);
        expect(newDaemonSet2Position).toEqual(oldDaemonSet2Position);
    }, testTimeout);

    it('drag and dropped deployments do not move anymore', async () => {
        const dataSet1 = {
            pods: [pod1, pod2],
            services: [service1],
            replicaSets: [replicaSet1, replicaSet2],
            statefulSets: [],
            daemonSets: [],
            deployments: [deployment1, deployment2]
        };
        const dataSet2 = {
            pods: [pod1, pod2, pod3],
            services: [service1],
            replicaSets: [replicaSet1, replicaSet2, replicaSet3],
            statefulSets: [],
            daemonSets: [],
            deployments: [deployment1, deployment2, deployment3]
        };
        const { rerender } = render(
            <ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                        onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                        onDeploymentFocus={noOpHandler} dataSet={dataSet1}/>
        );
        await waitForItemPositionStable(screen.getAllByLabelText('deployment')[1], waitTimeout);

        dragAndDropItem(screen.getAllByLabelText('deployment')[1], { clientX: 40, clientY: 10 });
        await waitForItemPositionStable(screen.getAllByLabelText('deployment')[1], waitTimeout);
        const oldDeployment1Position = getItemPosition(screen.getAllByLabelText('deployment')[0]);
        const oldDeployment2Position = getItemPosition(screen.getAllByLabelText('deployment')[1]);
        rerender(
            <ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                        onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                        onDeploymentFocus={noOpHandler} dataSet={dataSet2}/>
        );
        await waitForItemPositionStable(screen.getAllByLabelText('deployment')[2], waitTimeout);
        const newDeployment1Position = getItemPosition(screen.getAllByLabelText('deployment')[0]);
        const newDeployment2Position = getItemPosition(screen.getAllByLabelText('deployment')[1]);

        expect(newDeployment1Position).not.toEqual(oldDeployment1Position);
        expect(newDeployment2Position).toEqual(oldDeployment2Position);
    }, testTimeout);

    it('all items and their labels keep same apparent size despite zoom', async () => {
        const dataSet = {
            pods: [pod1],
            services: [service1],
            replicaSets: [replicaSet1],
            statefulSets: [statefulSet1],
            daemonSets: [daemonSet1],
            deployments: [deployment1]
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        patchGraphViewBox();
        await waitForItemPositionStable(screen.getAllByLabelText('service')[0], waitTimeout);
        const oldPodFontSize = parseFloat(screen.getByText(pod1.displayName).getAttribute('font-size'));
        const oldServiceFontSize = parseFloat(screen.getByText('ns/svc1').getAttribute('font-size'));
        const oldReplicaSetFontSize = parseFloat(screen.getByText('ns/rs1').getAttribute('font-size'));
        const oldStatefulSetFontSize = parseFloat(screen.getByText('ns/ss1').getAttribute('font-size'));
        const oldDaemonSetFontSize = parseFloat(screen.getByText('ns/ds1').getAttribute('font-size'));
        const oldDeploymentFontSize = parseFloat(screen.getByText('ns/deploy1').getAttribute('font-size'));

        scrollDown();
        const containerScale = getScale(screen.queryByLabelText('layers container'));
        const podScale = getScale(screen.getAllByLabelText('pod')[0]);
        const serviceScale = getScale(screen.getAllByLabelText('service')[0]);
        const replicaSetScale = getScale(screen.getAllByLabelText('replicaset')[0]);
        const statefulSetScale = getScale(screen.getAllByLabelText('statefulset')[0]);
        const daemonSetScale = getScale(screen.getAllByLabelText('daemonset')[0]);
        const deploymentScale = getScale(screen.getAllByLabelText('deployment')[0]);
        const newPodFontSize = parseFloat(screen.getByText(pod1.displayName).getAttribute('font-size'));
        const newServiceFontSize = parseFloat(screen.getByText('ns/svc1').getAttribute('font-size'));
        const newReplicaSetFontSize = parseFloat(screen.getByText('ns/rs1').getAttribute('font-size'));
        const newStatefulSetFontSize = parseFloat(screen.getByText('ns/ss1').getAttribute('font-size'));
        const newDaemonSetFontSize = parseFloat(screen.getByText('ns/ds1').getAttribute('font-size'));
        const newDeploymentFontSize = parseFloat(screen.getByText('ns/deploy1').getAttribute('font-size'));
        const podFontScale = newPodFontSize / oldPodFontSize;
        const serviceFontScale = newServiceFontSize / oldServiceFontSize;
        const replicaSetFontScale = newReplicaSetFontSize / oldReplicaSetFontSize;
        const statefulSetFontScale = newStatefulSetFontSize / oldStatefulSetFontSize;
        const daemonSetFontScale = newDaemonSetFontSize / oldDaemonSetFontSize;
        const deploymentFontScale = newDeploymentFontSize / oldDeploymentFontSize;

        expect(containerScale).toBeGreaterThan(1);
        expect(podScale).toEqual(1 / containerScale);
        expect(serviceScale).toEqual(1 / containerScale);
        expect(replicaSetScale).toEqual(1 / containerScale);
        expect(statefulSetScale).toEqual(1 / containerScale);
        expect(daemonSetScale).toEqual(1 / containerScale);
        expect(deploymentScale).toEqual(1 / containerScale);
        expect(podFontScale).toEqual(1 / containerScale);
        expect(serviceFontScale).toEqual(1 / containerScale);
        expect(replicaSetFontScale).toEqual(1 / containerScale);
        expect(statefulSetFontScale).toEqual(1 / containerScale);
        expect(daemonSetFontScale).toEqual(1 / containerScale);
        expect(deploymentFontScale).toEqual(1 / containerScale);
    });

    it('all links keep same apparent size despite zoom', async () => {
        const dataSet = {
            pods: [pod1],
            services: [service1],
            replicaSets: [replicaSet1],
            statefulSets: [statefulSet1],
            daemonSets: [daemonSet1],
            deployments: [deployment1]
        };
        render(<ClusterMap onPodFocus={noOpHandler} onServiceFocus={noOpHandler} onReplicaSetFocus={noOpHandler}
                           onStatefulSetFocus={noOpHandler} onDaemonSetFocus={noOpHandler}
                           onDeploymentFocus={noOpHandler} dataSet={dataSet}/>);
        patchGraphViewBox();
        await waitForItemPositionStable(screen.getAllByLabelText('service')[0], waitTimeout);
        const oldServiceLinkWidth = parseFloat(
            screen.getAllByLabelText('service link')[0].getAttribute('stroke-width'));
        const oldReplicaSetLinkWidth = parseFloat(
            screen.getAllByLabelText('replicaset link')[0].getAttribute('stroke-width'));
        const oldStatefulSetLinkWidth = parseFloat(
            screen.getAllByLabelText('statefulset link')[0].getAttribute('stroke-width'));
        const oldDaemonSetLinkWidth = parseFloat(
            screen.getAllByLabelText('daemonset link')[0].getAttribute('stroke-width'));
        const oldDeploymentLinkWidth = parseFloat(
            screen.getAllByLabelText('deployment link')[0].getAttribute('stroke-width'));

        scrollDown();
        const newServiceLinkWidth = parseFloat(
            screen.getAllByLabelText('service link')[0].getAttribute('stroke-width'));
        const newReplicaSetLinkWidth = parseFloat(
            screen.getAllByLabelText('replicaset link')[0].getAttribute('stroke-width'));
        const newStatefulSetLinkWidth = parseFloat(
            screen.getAllByLabelText('statefulset link')[0].getAttribute('stroke-width'));
        const newDaemonSetLinkWidth = parseFloat(
            screen.getAllByLabelText('daemonset link')[0].getAttribute('stroke-width'));
        const newDeploymentLinkWidth = parseFloat(
            screen.getAllByLabelText('deployment link')[0].getAttribute('stroke-width'));
        const containerScale = getScale(screen.queryByLabelText('layers container'));
        const serviceLinkScale = newServiceLinkWidth / oldServiceLinkWidth;
        const replicasetLinkScale = newReplicaSetLinkWidth / oldReplicaSetLinkWidth;
        const statefulsetLinkScale = newStatefulSetLinkWidth / oldStatefulSetLinkWidth;
        const daemonsetLinkScale = newDaemonSetLinkWidth / oldDaemonSetLinkWidth;
        const deploymentLinkScale = newDeploymentLinkWidth / oldDeploymentLinkWidth;

        expect(containerScale).toBeGreaterThan(1);
        expect(serviceLinkScale).toEqual(1 / containerScale);
        expect(replicasetLinkScale).toEqual(1 / containerScale);
        expect(statefulsetLinkScale).toEqual(1 / containerScale);
        expect(daemonsetLinkScale).toEqual(1 / containerScale);
        expect(deploymentLinkScale).toEqual(1 / containerScale);
    });
});
