import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import Content from './Content';
import '@testing-library/jest-dom/extend-expect';
import { computeDataSet, fetchAnalysisResult } from '../service/analysisResultService';
import { maxRecommendedAllowedRoutes, maxRecommendedPods } from '../constants';
import ClusterMap from './map/ClusterMap';
import NetworkPolicyMap from './map/NetworkPolicyMap';

jest.mock('../service/analysisResultService');
jest.mock('../service/storageService');
jest.mock('./map/ClusterMap', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('./map/NetworkPolicyMap', () => ({ __esModule: true, default: jest.fn() }));

describe('Content component', () => {

    let analysisResultPromise;

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
        computeDataSet.mockImplementation(() => {
            return { ...defaultValue, ...value };
        });
    }

    async function waitForComponentUpdate() {
        // Any update resets the setInterval to fetch the analysis result
        // We must wait on that promise in order to avoid the 'act' warning
        await act(() => analysisResultPromise);
    }

    beforeEach(() => {
        jest.useFakeTimers();
        ClusterMap.mockReturnValue(<div>Mock ClusterMap</div>);
        NetworkPolicyMap.mockReturnValue(<div>Mock NetworkPolicyMap</div>);
        mockAnalysisResult({});
        mockDataSet({});
    });

    afterEach(() => {
        jest.resetAllMocks();
        jest.useRealTimers();
    });

    it('displays loading message before analysis result arrive', async () => {
        render(<Content/>);

        expect(screen.queryByText('Analyzing your cluster...')).toBeInTheDocument();

        await waitForComponentUpdate();

        expect(screen.queryByText('Analyzing your cluster...')).not.toBeInTheDocument();
    });

    it('refreshes analysis results every 2 seconds when auto refresh is on', async () => {
        render(<Content/>);
        fireEvent.click(screen.getByLabelText('Auto refresh'));
        await waitForComponentUpdate();
        fetchAnalysisResult.mockClear();

        act(() => jest.advanceTimersByTime(2000));
        await waitForComponentUpdate();
        expect(fetchAnalysisResult).toHaveBeenCalledTimes(1);
        fetchAnalysisResult.mockClear();

        act(() => jest.advanceTimersByTime(2000));
        await waitForComponentUpdate();
        expect(fetchAnalysisResult).toHaveBeenCalledTimes(1);
        fetchAnalysisResult.mockClear();
    });

    it('displays message when dataset is empty', async () => {
        mockDataSet({ pods: [] });
        render(<Content/>);
        await waitForComponentUpdate();

        expect(screen.queryByText('No pod to display')).toBeInTheDocument();
    });

    it('displays message when dataset is too large (number of pods)', async () => {
        const tooManyPods = Array(maxRecommendedPods + 1).fill({});
        mockDataSet({ pods: tooManyPods });
        render(<Content/>);
        await waitForComponentUpdate();

        expect(screen.queryByText('The dataset to display is larger than recommended for an optimal experience. ' +
            'Apply a filter on the left to reduce the dataset, or enable the "Always display large datasets" display ' +
            'option if you know what you are doing.')).toBeInTheDocument();
    });

    it('displays message when dataset is too large (allowed routes)', async () => {
        const tooManyAllowedRoutes = Array(maxRecommendedAllowedRoutes + 1).fill({});
        mockDataSet({ allowedRoutes: tooManyAllowedRoutes });
        render(<Content/>);
        await waitForComponentUpdate();

        expect(screen.queryByText('The dataset to display is larger than recommended for an optimal experience. ' +
            'Apply a filter on the left to reduce the dataset, or enable the "Always display large datasets" display ' +
            'option if you know what you are doing.')).toBeInTheDocument();
    });

    it('displays large dataset when large dataset option is on', async () => {
        const tooManyAllowedRoutes = Array(maxRecommendedAllowedRoutes + 1).fill({});
        mockDataSet({ allowedRoutes: tooManyAllowedRoutes });
        render(<Content/>);

        fireEvent.click(screen.getByLabelText('Always display large datasets'));
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
            deployments: [{}],
            replicaSets: [{}],
            services: [{}]
        };
        mockDataSet(dataSet);
        render(<Content/>);
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
            deployments: [{}],
            replicaSets: [{}],
            services: [{}]
        };
        mockDataSet(dataSet);
        render(<Content/>);

        fireEvent.click(screen.getByLabelText('Network policies'));
        await waitForComponentUpdate();

        expect(screen.queryByText('Mock ClusterMap')).not.toBeInTheDocument();
        expect(NetworkPolicyMap).toHaveBeenCalledTimes(1);
        expect(NetworkPolicyMap.mock.calls[0][0].dataSet).toEqual(dataSet);
        expect(screen.queryByText('Mock NetworkPolicyMap')).toBeInTheDocument();
    });

    it('displays cluster map when selected', async () => {
        render(<Content/>);
        fireEvent.click(screen.getByLabelText('Network policies'));
        await waitForComponentUpdate();

        fireEvent.click(screen.getByLabelText('Workloads'));
        await waitForComponentUpdate();

        expect(screen.queryByText('Mock ClusterMap')).toBeInTheDocument();
        expect(screen.queryByText('Mock NetworkPolicyMap')).not.toBeInTheDocument();
    });

    // TODO controls
    // TODO details
    // TODO filters name
});
