import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { computeDataSet, fetchAnalysisResult } from '../service/analysisResultService';
import { labelSelectorOperators, maxRecommendedAllowedRoutes, maxRecommendedPods } from '../constants';
import ClusterMap from './map/ClusterMap';
import NetworkPolicyMap from './map/NetworkPolicyMap';
import { getControls } from '../service/storageService';
import { configureMockForPopper } from './utils/testutils';
import App from './App';

jest.mock('../service/analysisResultService');
jest.mock('../service/storageService');
jest.mock('./map/ClusterMap', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('./map/NetworkPolicyMap', () => ({ __esModule: true, default: jest.fn() }));

describe('App component', () => {

    let analysisResultPromise;
    let podDetailsHandler;
    let allowedRouteDetailsHandler;
    let serviceDetailsHandler;
    let replicaSetDetailsHandler;
    let deploymentDetailsHandler;

    function mockAnalysisResult(value) {
        const defaultValue = {
            pods: [],
            podIsolations: [],
            allowedRoutes: [],
            services: [],
            replicaSets: [],
            deployments: [],
            allNamespaces: [],
            allLabels: {}
        };
        fetchAnalysisResult.mockImplementation(() => {
            analysisResultPromise = Promise.resolve({ ...defaultValue, ...value });
            return analysisResultPromise;
        });
    }

    function mockDataSet(value) {
        const defaultValue = {
            pods: [{}],
            podIsolations: [],
            allowedRoutes: [],
            services: [],
            replicaSets: [],
            deployments: []
        };
        computeDataSet.mockImplementation(() => ({ ...defaultValue, ...value }));
    }

    function mockStoredControls(value) {
        getControls.mockImplementation(() => value);
    }

    function waitForComponentUpdate() {
        // Any update resets the setInterval to fetch the analysis result
        // We must wait on that promise in order to avoid the 'act' warning
        return act(() => analysisResultPromise);
    }

    beforeAll(() => {
        configureMockForPopper();
    });

    beforeEach(() => {
        jest.useFakeTimers();
        ClusterMap.mockImplementation(props => {
            podDetailsHandler = props.onPodFocus;
            serviceDetailsHandler = props.onServiceFocus;
            replicaSetDetailsHandler = props.onReplicaSetFocus;
            deploymentDetailsHandler = props.onDeploymentFocus;
            return <div>Mock ClusterMap</div>;
        });
        NetworkPolicyMap.mockImplementation(props => {
            podDetailsHandler = props.onPodFocus;
            allowedRouteDetailsHandler = props.onAllowedRouteFocus;
            return <div>Mock NetworkPolicyMap</div>;
        });
        mockAnalysisResult({});
        mockDataSet({});
        mockStoredControls({});
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('displays header', async () => {
        render(<App/>);
        await waitForComponentUpdate();

        expect(screen.queryByText('Karto')).toBeInTheDocument();
    });

    it('displays loading message before analysis result arrive', async () => {
        render(<App/>);

        expect(screen.queryByText('Analyzing your cluster...')).toBeInTheDocument();

        await waitForComponentUpdate();

        expect(screen.queryByText('Analyzing your cluster...')).not.toBeInTheDocument();
    });

    it('refreshes analysis results every 2 seconds when auto refresh is on', async () => {
        render(<App/>);
        fireEvent.click(screen.getByText('Auto refresh'));
        await waitForComponentUpdate();

        fetchAnalysisResult.mockClear();
        act(() => jest.advanceTimersByTime(2000));
        await waitForComponentUpdate();
        expect(fetchAnalysisResult).toHaveBeenCalledTimes(1);

        fetchAnalysisResult.mockClear();
        act(() => jest.advanceTimersByTime(2000));
        await waitForComponentUpdate();
        expect(fetchAnalysisResult).toHaveBeenCalledTimes(1);
    });

    it('displays message when dataset is empty', async () => {
        mockDataSet({ pods: [] });
        render(<App/>);
        await waitForComponentUpdate();

        expect(screen.queryByText('No pod to display')).toBeInTheDocument();
    });

    it('displays message when dataset is too large (number of pods)', async () => {
        const tooManyPods = Array(maxRecommendedPods + 1).fill({});
        mockDataSet({ pods: tooManyPods });
        render(<App/>);
        await waitForComponentUpdate();

        expect(screen.queryByText('The dataset to display is larger than recommended for an optimal experience. ' +
            'Apply a filter on the left to reduce the dataset, or enable the "Always display large datasets" display ' +
            'option if you know what you are doing.')).toBeInTheDocument();
    });

    it('displays message when dataset is too large (allowed routes)', async () => {
        const tooManyAllowedRoutes = Array(maxRecommendedAllowedRoutes + 1).fill({});
        mockDataSet({ allowedRoutes: tooManyAllowedRoutes });
        render(<App/>);
        await waitForComponentUpdate();

        expect(screen.queryByText('The dataset to display is larger than recommended for an optimal experience. ' +
            'Apply a filter on the left to reduce the dataset, or enable the "Always display large datasets" display ' +
            'option if you know what you are doing.')).toBeInTheDocument();
    });

    it('displays large dataset when large dataset option is on', async () => {
        const tooManyAllowedRoutes = Array(maxRecommendedAllowedRoutes + 1).fill({});
        mockDataSet({ allowedRoutes: tooManyAllowedRoutes });
        render(<App/>);

        fireEvent.click(screen.getByText('Always display large datasets'));
        await waitForComponentUpdate();

        expect(screen.queryByText('The dataset to display is larger than recommended for an optimal experience. ' +
            'Apply a filter on the left to reduce the dataset, or enable the "Always display large datasets" display ' +
            'option if you know what you are doing.')).not.toBeInTheDocument();
    });

    it('displays cluster map by default', async () => {
        const dataSet = {
            pods: [{}, {}],
            podIsolations: [{}, {}],
            allowedRoutes: [{}],
            services: [{}],
            replicaSets: [{}],
            deployments: [{}]
        };
        mockDataSet(dataSet);
        render(<App/>);
        await waitForComponentUpdate();

        expect(screen.queryByText('Mock ClusterMap')).toBeInTheDocument();
        expect(ClusterMap).toHaveBeenCalledTimes(1);
        expect(ClusterMap.mock.calls[0][0].dataSet).toEqual(dataSet);
        expect(screen.queryByText('Mock NetworkPolicyMap')).not.toBeInTheDocument();
    });

    it('displays network policy map when selected', async () => {
        const dataSet = {
            pods: [{}, {}],
            podIsolations: [{}, {}],
            allowedRoutes: [{}],
            services: [{}],
            replicaSets: [{}],
            deployments: [{}]
        };
        mockDataSet(dataSet);
        render(<App/>);

        fireEvent.click(screen.getByText('Network policies'));
        await waitForComponentUpdate();

        expect(screen.queryByText('Mock ClusterMap')).not.toBeInTheDocument();
        expect(NetworkPolicyMap).toHaveBeenCalledTimes(1);
        expect(NetworkPolicyMap.mock.calls[0][0].dataSet).toEqual(dataSet);
        expect(screen.queryByText('Mock NetworkPolicyMap')).toBeInTheDocument();
    });

    it('displays cluster map when selected', async () => {
        render(<App/>);
        fireEvent.click(screen.getByText('Network policies'));
        await waitForComponentUpdate();

        fireEvent.click(screen.getByText('Workloads'));
        await waitForComponentUpdate();

        expect(screen.queryByText('Mock ClusterMap')).toBeInTheDocument();
        expect(screen.queryByText('Mock NetworkPolicyMap')).not.toBeInTheDocument();
    });

    it('displays a caption for ClusterMap', async () => {
        const analysisResult = {
            pods: [{}, {}],
            services: [{}, {}, {}],
            replicaSets: [{}, {}, {}, {}],
            deployments: [{}, {}, {}, {}, {}]
        };
        mockAnalysisResult(analysisResult);
        const dataSet = {
            pods: [{}],
            services: [{}, {}],
            replicaSets: [{}, {}, {}],
            deployments: [{}, {}, {}, {}]
        };
        mockDataSet(dataSet);
        render(<App/>);
        await waitForComponentUpdate();

        expect(screen.queryByText('Displaying 1/2 pods, 2/3 services, 3/4 replicaSets and 4/5 deployments'))
            .toBeInTheDocument();
    });

    it('displays a caption for NetworkPolicyMap', async () => {
        const analysisResult = {
            pods: [{}, {}],
            allowedRoutes: [{}, {}, {}]
        };
        mockAnalysisResult(analysisResult);
        const dataSet = {
            pods: [{}],
            allowedRoutes: [{}, {}]
        };
        mockDataSet(dataSet);
        render(<App/>);
        fireEvent.click(screen.getByText('Network policies'));
        await waitForComponentUpdate();

        expect(screen.queryByText('Displaying 1/2 pods and 2/3 allowed routes'))
            .toBeInTheDocument();
    });

    it('retrieves stored controls and apply them on the analysis results', async () => {
        const analysisResult = {
            pods: [],
            podIsolations: [],
            allowedRoutes: [],
            services: [],
            replicaSets: [],
            deployments: [],
            allNamespaces: [],
            allLabels: {}
        };
        mockAnalysisResult(analysisResult);
        const storedControls = {
            displayedView: 'Workloads',
            namespaceFilters: ['ns'],
            labelFilters: [{ key: 'k', operator: { op: 'eq', label: '=', args: 'single' }, value: 'v' }],
            nameFilter: 'po',
            includeIngressNeighbors: true,
            includeEgressNeighbors: true,
            autoRefresh: true,
            showNamespacePrefix: false,
            highlightPodsWithoutIngressIsolation: true,
            highlightPodsWithoutEgressIsolation: true,
            displayLargeDatasets: true
        };
        mockStoredControls(storedControls);
        render(<App/>);
        await waitForComponentUpdate();

        expect(getControls).toHaveBeenCalled();
        expect(computeDataSet).toHaveBeenCalledWith(analysisResult, storedControls);
    });

    it('applies default controls when none are stored', async () => {
        const storedControls = {};
        mockStoredControls(storedControls);
        render(<App/>);
        await waitForComponentUpdate();

        const expectedDefaultControls = {
            displayedView: 'Workloads',
            namespaceFilters: [],
            labelFilters: [
                { key: null, operator: labelSelectorOperators[0], value: null }
            ], // default value caused by the MultiKeyValueSelectControl component
            nameFilter: '',
            includeIngressNeighbors: false,
            includeEgressNeighbors: false,
            autoRefresh: false,
            showNamespacePrefix: true,
            highlightPodsWithoutIngressIsolation: false,
            highlightPodsWithoutEgressIsolation: false,
            displayLargeDatasets: false
        };
        expect(computeDataSet).toHaveBeenCalledWith(expect.anything(), expectedDefaultControls);
    });

    it('displays specific controld with cluster map', async () => {
        render(<App/>);
        fireEvent.click(screen.getByText('Workloads'));
        await waitForComponentUpdate();

        expect(screen.queryByText('All namespaces')).toBeInTheDocument();
        expect(screen.queryByText('All pod labels')).toBeInTheDocument();
        expect(screen.queryByText('All pod names')).toBeInTheDocument();
        expect(screen.queryByText('Include ingress neighbors')).not.toBeInTheDocument();
        expect(screen.queryByText('Include egress neighbors')).not.toBeInTheDocument();
        expect(screen.queryByText('Auto refresh')).toBeInTheDocument();
        expect(screen.queryByText('Show namespace prefix')).toBeInTheDocument();
        expect(screen.queryByText('Highlight non isolated pods (ingress)')).not.toBeInTheDocument();
        expect(screen.queryByText('Highlight non isolated pods (egress)')).not.toBeInTheDocument();
        expect(screen.queryByText('Always display large datasets')).toBeInTheDocument();
    });

    it('displays specific controld with network policy map', async () => {
        render(<App/>);
        fireEvent.click(screen.getByText('Network policies'));
        await waitForComponentUpdate();

        expect(screen.queryByText('All namespaces')).toBeInTheDocument();
        expect(screen.queryByText('All pod labels')).toBeInTheDocument();
        expect(screen.queryByText('All pod names')).toBeInTheDocument();
        expect(screen.queryByText('Include ingress neighbors')).toBeInTheDocument();
        expect(screen.queryByText('Include egress neighbors')).toBeInTheDocument();
        expect(screen.queryByText('Auto refresh')).toBeInTheDocument();
        expect(screen.queryByText('Show namespace prefix')).toBeInTheDocument();
        expect(screen.queryByText('Highlight non isolated pods (ingress)')).toBeInTheDocument();
        expect(screen.queryByText('Highlight non isolated pods (egress)')).toBeInTheDocument();
        expect(screen.queryByText('Always display large datasets')).toBeInTheDocument();
    });

    it('can change namespace filter', async () => {
        const addNamespaceToFilters = namespace => {
            const input = screen.getByPlaceholderText('Select a namespace');
            fireEvent.change(input, { target: { value: namespace } });
            fireEvent.keyDown(input, { key: 'Enter' });
        };
        mockAnalysisResult({ allNamespaces: ['ns1', 'ns2', 'ns3'] });
        render(<App/>);
        await waitForComponentUpdate();

        expect(screen.queryByText('All namespaces')).toBeInTheDocument();

        addNamespaceToFilters('ns1');

        expect(computeDataSet).toHaveBeenCalledWith(expect.anything(),
            expect.objectContaining({ namespaceFilters: ['ns1'] }));
        expect(screen.queryByText('1 namespace filter')).toBeInTheDocument();

        addNamespaceToFilters('ns2');

        expect(computeDataSet).toHaveBeenCalledWith(expect.anything(),
            expect.objectContaining({ namespaceFilters: ['ns1', 'ns2'] }));
        expect(screen.queryByText('2 namespace filters')).toBeInTheDocument();

        addNamespaceToFilters('ns3');

        expect(computeDataSet).toHaveBeenCalledWith(expect.anything(),
            expect.objectContaining({ namespaceFilters: ['ns1', 'ns2', 'ns3'] }));
        expect(screen.queryByText('All namespaces')).toBeInTheDocument();
    });

    it('can change label filter', async () => {
        let podFiltersCount = 0;
        const addPodLabelToFilters = (key, value) => {
            const keyInput = screen.getAllByPlaceholderText('Select a label key')[podFiltersCount];
            fireEvent.change(keyInput, { target: { value: key } });
            fireEvent.keyDown(keyInput, { key: 'Enter' });

            const valueInput = screen.getAllByPlaceholderText('Select a label value')[podFiltersCount];
            fireEvent.change(valueInput, { target: { value: value } });
            fireEvent.keyDown(valueInput, { key: 'Enter' });

            fireEvent.click(screen.getAllByLabelText('add entry')[podFiltersCount++]);
        };
        mockAnalysisResult({ allLabels: { k1: ['v1-1', 'v1-2'], k2: ['v2-1', 'v2-2'] } });
        render(<App/>);
        await waitForComponentUpdate();

        expect(screen.queryByText('All pod labels')).toBeInTheDocument();

        addPodLabelToFilters('k1', 'v1-1');

        expect(computeDataSet).toHaveBeenCalledWith(expect.anything(),
            expect.objectContaining({
                labelFilters: [
                    { key: 'k1', operator: { op: 'eq', label: '=', args: 'single' }, value: 'v1-1' },
                    { key: null, operator: { op: 'eq', label: '=', args: 'single' }, value: null }
                ]
            }));
        expect(screen.queryByText('1 pod label filter')).toBeInTheDocument();

        addPodLabelToFilters('k2', 'v2-1');

        expect(computeDataSet).toHaveBeenCalledWith(expect.anything(),
            expect.objectContaining({
                labelFilters: [
                    { key: 'k1', operator: { op: 'eq', label: '=', args: 'single' }, value: 'v1-1' },
                    { key: 'k2', operator: { op: 'eq', label: '=', args: 'single' }, value: 'v2-1' },
                    { key: null, operator: { op: 'eq', label: '=', args: 'single' }, value: null }
                ]
            }));
        expect(screen.queryByText('2 pod label filters')).toBeInTheDocument();
    });

    it('can change pod name filter', async () => {
        render(<App/>);
        await waitForComponentUpdate();

        expect(screen.queryByText('All pod names')).toBeInTheDocument();

        const input = screen.getByPlaceholderText('Type a pod name or regex');
        fireEvent.change(input, { target: { value: 'podName' } });
        expect(computeDataSet).toHaveBeenCalledWith(expect.anything(),
            expect.objectContaining({ nameFilter: 'podName' }));
        expect(screen.queryByText('1 pod label filter')).toBeInTheDocument();
    });

    it('can change ingress neighbors filter', async () => {
        render(<App/>);
        fireEvent.click(screen.getByText('Network policies'));
        await waitForComponentUpdate();

        fireEvent.click(screen.getByText('Include ingress neighbors'));

        expect(computeDataSet).toHaveBeenCalledWith(expect.anything(),
            expect.objectContaining({ includeIngressNeighbors: true }));
    });

    it('can change egress neighbors filter', async () => {
        render(<App/>);
        fireEvent.click(screen.getByText('Network policies'));
        await waitForComponentUpdate();

        fireEvent.click(screen.getByText('Include egress neighbors'));

        expect(computeDataSet).toHaveBeenCalledWith(expect.anything(),
            expect.objectContaining({ includeEgressNeighbors: true }));
    });

    it('can change namespace prefix display option', async () => {
        render(<App/>);
        await waitForComponentUpdate();

        fireEvent.click(screen.getByText('Show namespace prefix'));

        expect(computeDataSet).toHaveBeenCalledWith(expect.anything(),
            expect.objectContaining({ showNamespacePrefix: true }));
    });

    it('can change non isolated ingress highlight display option', async () => {
        render(<App/>);
        fireEvent.click(screen.getByText('Network policies'));
        await waitForComponentUpdate();

        fireEvent.click(screen.getByText('Highlight non isolated pods (ingress)'));

        expect(computeDataSet).toHaveBeenCalledWith(expect.anything(),
            expect.objectContaining({ highlightPodsWithoutIngressIsolation: true }));
    });

    it('can change non isolated egress highlight display option', async () => {
        render(<App/>);
        fireEvent.click(screen.getByText('Network policies'));
        await waitForComponentUpdate();

        fireEvent.click(screen.getByText('Highlight non isolated pods (egress)'));

        expect(computeDataSet).toHaveBeenCalledWith(expect.anything(),
            expect.objectContaining({ highlightPodsWithoutEgressIsolation: true }));
    });

    it('displays pod details from cluster map', async () => {
        render(<App/>);
        await waitForComponentUpdate();

        act(() => podDetailsHandler({ namespace: 'ns', name: 'po', labels: {} }));
        await waitForComponentUpdate();

        expect(screen.queryByText('Pod details')).toBeInTheDocument();
    });

    it('displays service details from cluster map', async () => {
        render(<App/>);
        await waitForComponentUpdate();

        act(() => serviceDetailsHandler({
            namespace: 'ns',
            name: 'svc',
            targetPods: [{ namespace: 'ns', name: 'po' }]
        }));
        await waitForComponentUpdate();

        expect(screen.queryByText('Service details')).toBeInTheDocument();
    });

    it('displays replicaSet details from cluster map', async () => {
        render(<App/>);
        await waitForComponentUpdate();

        act(() => replicaSetDetailsHandler({
            namespace: 'ns',
            name: 'rs',
            targetPods: [{ namespace: 'ns', name: 'po' }]
        }));
        await waitForComponentUpdate();

        expect(screen.queryByText('ReplicaSet details')).toBeInTheDocument();
    });

    it('displays deployment details from cluster map', async () => {
        render(<App/>);
        await waitForComponentUpdate();

        act(() => deploymentDetailsHandler({
            namespace: 'ns',
            name: 'deploy',
            targetReplicaSets: [{ namespace: 'ns', name: 'rs' }]
        }));
        await waitForComponentUpdate();

        expect(screen.queryByText('Deployment details')).toBeInTheDocument();
    });

    it('displays pod details from network policy map', async () => {
        render(<App/>);
        fireEvent.click(screen.getByText('Network policies'));
        await waitForComponentUpdate();

        act(() => podDetailsHandler({ namespace: 'ns', name: 'po', labels: {} }));
        await waitForComponentUpdate();

        expect(screen.queryByText('Pod details')).toBeInTheDocument();
    });

    it('displays allowed route details from network policy map', async () => {
        render(<App/>);
        fireEvent.click(screen.getByText('Network policies'));
        await waitForComponentUpdate();

        act(() => allowedRouteDetailsHandler({
            sourcePod: { namespace: 'ns', name: 'po1', isEgressIsolated: true, isIngressIsolated: false },
            targetPod: { namespace: 'ns', name: 'po2', isEgressIsolated: false, isIngressIsolated: true },
            ingressPolicies: [],
            egressPolicies: []
        }));
        await waitForComponentUpdate();

        expect(screen.queryByText('Allowed route details')).toBeInTheDocument();
    });
});
