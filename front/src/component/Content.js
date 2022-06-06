import { useCallback, useEffect, useState } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import SwitchControl from './control/SwitchControl';
import MultiSelectControl from './control/MultiSelectControl';
import { getControls, storeControls } from '../service/storageService';
import { computeDataSet, fetchAnalysisResult } from '../service/analysisResultService';
import InputControl from './control/InputControl';
import AllowedRouteDetails from './detail/AllowedRouteDetails';
import PodDetails from './detail/PodDetails';
import ServiceDetails from './detail/ServiceDetails';
import MultiKeyValueSelectControl from './control/MultiKeyValueSelectControl';
import ClusterGraph from './graph/ClusterGraph';
import RadioGroupControl from './control/RadioGroupControl';
import NetworkPolicyGraph from './graph/NetworkPolicyGraph';
import ReplicaSetDetails from './detail/ReplicaSetDetails';
import DeploymentDetails from './detail/DeploymentDetails';
import { labelSelectorOperators, maxRecommendedAllowedRoutes, maxRecommendedPods } from '../constants';
import StatefulSetDetails from './detail/StatefulSetDetails';
import DaemonSetDetails from './detail/DaemonSetDetails';
import IngressDetails from './detail/IngressDetails';
import HealthGraph from './graph/HealthGraph';
import { Box } from '@mui/material';

const VIEWS = {
    WORKLOADS: 'Workloads',
    NETWORK_POLICIES: 'Network policies',
    HEALTH: 'Health'
};
const DEFAULT_CONTROLS = {
    displayedView: VIEWS.WORKLOADS,
    namespaceFilters: [],
    labelFilters: [],
    nameFilter: '',
    includeIngressNeighbors: false,
    includeEgressNeighbors: false,
    autoRefresh: false,
    autoZoom: false,
    showNamespacePrefix: true,
    highlightPodsWithoutIngressIsolation: false,
    highlightPodsWithoutEgressIsolation: false,
    highlightPodsWithContainersNotRunning: false,
    highlightPodsWithContainersNotReady: false,
    highlightPodsWithContainersRestarted: false,
    displayLargeDatasets: false
};

const styles = {
    controlsTitle: {
        mb: 1,
        cursor: 'default'
    },
    controlsItem: {
        mb: 1
    },
    controlsSection: {
        width: '100%',
        mb: 1,
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: 'auto'
    },
    message: {
        maxWidth: 500,
        mt: 1,
        textAlign: 'center'
    },
    details: {
        position: 'absolute',
        bottom: 40,
        right: 0,
        width: 320,
        py: 0,
        px: 2,
        borderLeft: 1,
        borderLeftColor: 'primary.main'
    },
    graphCaption: {
        position: 'absolute',
        bottom: 0,
        left: 'auto',
        right: 'auto',
        backgroundColor: 'transparent',
        cursor: 'default'
    }
};

const Content = () => {
    const [state, setState] = useState({
        isLoading: true,
        analysisResult: null,
        dataSet: null,
        controls: { ...DEFAULT_CONTROLS, ...getControls() }
    });
    const allNamespaces = state.analysisResult ? state.analysisResult.allNamespaces : [];
    const allLabels = state.analysisResult ? state.analysisResult.allLabels : {};

    useEffect(() => {
        const fetchAndUpdate = async () => {
            const analysisResult = await fetchAnalysisResult();
            setState(oldState => ({
                ...oldState,
                isLoading: false,
                analysisResult: analysisResult,
                dataSet: computeDataSet(analysisResult, oldState.controls)
            }));
        };
        fetchAndUpdate();

        if (state.controls.autoRefresh) {
            const interval = setInterval(() => {
                fetchAndUpdate();
            }, 2000);
            return () => clearInterval(interval);
        }
    }, [state.controls.autoRefresh]);

    useEffect(() => {
        storeControls(state.controls);
    }, [state.controls]);

    const makeFocusHandler = key => {
        return useCallback(value => {
            setState(oldState => ({
                ...oldState,
                [key]: value
            }));
        }, []);
    };
    const onPodFocus = makeFocusHandler('podDetails');
    const onAllowedRouteFocus = makeFocusHandler('allowedRouteDetails');
    const onServiceFocus = makeFocusHandler('serviceDetails');
    const onIngressFocus = makeFocusHandler('ingressDetails');
    const onReplicaSetFocus = makeFocusHandler('replicaSetDetails');
    const onStatefulSetFocus = makeFocusHandler('statefulSetDetails');
    const onDaemonSetFocus = makeFocusHandler('daemonSetDetails');
    const onDeploymentFocus = makeFocusHandler('deploymentDetails');

    const isSafeToDisplay = (dataSet, displayLargeDatasets) => {
        const tooLarge = dataSet.pods.length > maxRecommendedPods
            || dataSet.allowedRoutes.length > maxRecommendedAllowedRoutes;
        return displayLargeDatasets || !tooLarge;
    };
    const handleControlChange = key => newValue => {
        setState(oldState => {
            const newControls = { ...oldState.controls, [key]: newValue };
            return ({
                ...oldState,
                controls: newControls,
                dataSet: computeDataSet(oldState.analysisResult, newControls)
            });
        });
    };
    const namespaceFiltersCount = () => {
        return state.controls.namespaceFilters.length;
    };
    const isNamespaceFilterActive = () => {
        const filtersCount = namespaceFiltersCount();
        return filtersCount !== 0 && filtersCount !== allNamespaces.length;
    };
    const namespaceFilterLabel = () => {
        const filtersCount = namespaceFiltersCount();
        if (!isNamespaceFilterActive()) {
            return `All namespaces`;
        } else if (filtersCount === 1) {
            return `1 namespace filter`;
        } else {
            return `${filtersCount} namespace filters`;
        }
    };
    const labelFiltersCount = () => {
        return state.controls.labelFilters.filter(labelFilter => labelFilter.key !== null).length;
    };
    const isLabelFilterActive = () => {
        return labelFiltersCount() !== 0;
    };
    const labelFilterLabel = () => {
        const filtersCount = labelFiltersCount();
        if (!isLabelFilterActive()) {
            return `All pod labels`;
        } else if (filtersCount === 1) {
            return `1 pod label filter`;
        } else {
            return `${filtersCount} pod label filters`;
        }
    };
    const isNameFilterActive = () => {
        return state.controls.nameFilter !== '';
    };
    const nameFilterLabel = () => {
        if (!isNameFilterActive()) {
            return `All pod names`;
        } else {
            return `1 pod label filter`;
        }
    };

    return (
        <Box sx={{
            position: 'relative',
            height: '100vh',
            overflowY: 'hidden'
        }}>
            <Box component="main" sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh'
            }}>
                {state.isLoading && <>
                    <CircularProgress thickness={1} size={60}/>
                    <Typography sx={styles.message} variant="caption">
                        Analyzing your cluster...
                    </Typography>
                </>}
                {!state.isLoading && state.dataSet && state.dataSet.pods.length === 0 && <>
                    <Typography sx={styles.message} variant="caption">
                        No pod to display
                    </Typography>
                </>}
                {!state.isLoading && state.dataSet && state.dataSet.pods.length > 0
                && !isSafeToDisplay(state.dataSet, state.controls.displayLargeDatasets) && <>
                    <Typography sx={styles.message} variant="caption">
                        {`The dataset to display is larger than recommended for an optimal experience. Apply a filter `
                        + `on the left to reduce the dataset, or enable the "Always display large datasets" display `
                        + `option if you know what you are doing.`}
                    </Typography>
                </>}
                {!state.isLoading && state.dataSet && state.dataSet.pods.length > 0
                && isSafeToDisplay(state.dataSet, state.controls.displayLargeDatasets)
                && state.controls.displayedView === VIEWS.WORKLOADS && <>
                    <ClusterGraph dataSet={state.dataSet} autoZoom={state.controls.autoZoom}
                                  onPodFocus={onPodFocus} onServiceFocus={onServiceFocus}
                                  onIngressFocus={onIngressFocus} onReplicaSetFocus={onReplicaSetFocus}
                                  onStatefulSetFocus={onStatefulSetFocus} onDaemonSetFocus={onDaemonSetFocus}
                                  onDeploymentFocus={onDeploymentFocus}/>
                    <Typography sx={styles.graphCaption} variant="caption">
                        {`Displaying ${state.dataSet.pods.length}/${state.analysisResult.pods.length} pods, `
                        + `${state.dataSet.services.length}/${state.analysisResult.services.length} services, `
                        + `${state.dataSet.ingresses.length}/${state.analysisResult.ingresses.length} ingresses, `
                        + `${state.dataSet.replicaSets.length}/${state.analysisResult.replicaSets.length} replicaSets, `
                        + `${state.dataSet.statefulSets.length}/${state.analysisResult.statefulSets.length} 
                        statefulSets, ${state.dataSet.daemonSets.length}/${state.analysisResult.daemonSets.length} 
                        daemonSets and ${state.dataSet.deployments.length}/${state.analysisResult.deployments.length} `
                        + `deployments`}
                    </Typography>
                </>}
                {!state.isLoading && state.dataSet && state.dataSet.pods.length > 0
                && isSafeToDisplay(state.dataSet, state.controls.displayLargeDatasets)
                && state.controls.displayedView === VIEWS.NETWORK_POLICIES && <>
                    <NetworkPolicyGraph dataSet={state.dataSet} autoZoom={state.controls.autoZoom}
                                        onPodFocus={onPodFocus} onAllowedRouteFocus={onAllowedRouteFocus}/>
                    <Typography sx={styles.graphCaption} variant="caption">
                        {`Displaying ${state.dataSet.pods.length}/${state.analysisResult.pods.length} pods`
                        + ` and ${state.dataSet.allowedRoutes.length}/`
                        + `${state.analysisResult.allowedRoutes.length} allowed routes`}
                    </Typography>
                </>}
                {!state.isLoading && state.dataSet && state.dataSet.pods.length > 0
                && isSafeToDisplay(state.dataSet, state.controls.displayLargeDatasets)
                && state.controls.displayedView === VIEWS.HEALTH && <>
                    <HealthGraph dataSet={state.dataSet} autoZoom={state.controls.autoZoom} onPodFocus={onPodFocus}/>
                    <Typography sx={styles.graphCaption} variant="caption">
                        {`Displaying ${state.dataSet.pods.length}/${state.analysisResult.pods.length} pods`}
                    </Typography>
                </>}
            </Box>
            <Box component="aside" role="search" sx={{
                position: 'absolute',
                top: 80,
                left: 0,
                width: 320,
                height: '100vh',
                px: 2,
                py: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                pointerEvents: 'none'
            }}>
                <Typography sx={styles.controlsTitle} variant="h2">View</Typography>
                <Box sx={styles.controlsSection}>
                    <RadioGroupControl sx={styles.controlsItem} options={Object.values(VIEWS)}
                                       value={state.controls.displayedView}
                                       onChange={handleControlChange('displayedView')}>
                    </RadioGroupControl>
                </Box>
                <Typography sx={styles.controlsTitle} variant="h2">Filters</Typography>
                <Box sx={styles.controlsSection}>
                    <MultiSelectControl
                        sx={styles.controlsItem} placeholder="Select a namespace"
                        name={namespaceFilterLabel()} checked={isNamespaceFilterActive()}
                        options={allNamespaces} selectedOptions={state.controls.namespaceFilters}
                        onChange={handleControlChange('namespaceFilters')}/>
                    <MultiKeyValueSelectControl
                        sx={styles.controlsItem} keyPlaceholder="Select a label key"
                        valuePlaceholder="Select a label value"
                        name={labelFilterLabel()} checked={isLabelFilterActive()}
                        options={allLabels} selectedOptions={state.controls.labelFilters}
                        operators={labelSelectorOperators} onChange={handleControlChange('labelFilters')}/>
                    <InputControl
                        sx={styles.controlsItem} placeholder="Type a pod name or regex"
                        name={nameFilterLabel()} checked={isNameFilterActive()} value={state.controls.nameFilter}
                        onChange={handleControlChange('nameFilter')}/>
                    {state.controls.displayedView === VIEWS.NETWORK_POLICIES && (
                        <SwitchControl
                            sx={styles.controlsItem} name="Include ingress neighbors"
                            checked={state.controls.includeIngressNeighbors}
                            onChange={handleControlChange('includeIngressNeighbors')}/>
                    )}
                    {state.controls.displayedView === VIEWS.NETWORK_POLICIES && (
                        <SwitchControl
                            sx={styles.controlsItem} name="Include egress neighbors"
                            checked={state.controls.includeEgressNeighbors}
                            onChange={handleControlChange('includeEgressNeighbors')}/>
                    )}
                </Box>
                <Typography sx={styles.controlsTitle} variant="h2">Display options</Typography>
                <Box sx={styles.controlsSection}>
                    <SwitchControl
                        sx={styles.controlsItem} name="Auto refresh" checked={state.controls.autoRefresh}
                        onChange={handleControlChange('autoRefresh')}/>
                    <SwitchControl
                        sx={styles.controlsItem} name="Auto zoom"
                        checked={state.controls.autoZoom}
                        onChange={handleControlChange('autoZoom')}/>
                    <SwitchControl
                        sx={styles.controlsItem} name="Show namespace prefix"
                        checked={state.controls.showNamespacePrefix}
                        onChange={handleControlChange('showNamespacePrefix')}/>
                    {state.controls.displayedView === VIEWS.NETWORK_POLICIES && (
                        <SwitchControl
                            sx={styles.controlsItem} name="Highlight non isolated pods (ingress)"
                            checked={state.controls.highlightPodsWithoutIngressIsolation}
                            onChange={handleControlChange('highlightPodsWithoutIngressIsolation')}/>
                    )}
                    {state.controls.displayedView === VIEWS.NETWORK_POLICIES && (
                        <SwitchControl
                            sx={styles.controlsItem} name="Highlight non isolated pods (egress)"
                            checked={state.controls.highlightPodsWithoutEgressIsolation}
                            onChange={handleControlChange('highlightPodsWithoutEgressIsolation')}/>
                    )}
                    {state.controls.displayedView === VIEWS.HEALTH && (
                        <SwitchControl
                            sx={styles.controlsItem} name="Highlight pods with containers not running"
                            checked={state.controls.highlightPodsWithContainersNotRunning}
                            onChange={handleControlChange('highlightPodsWithContainersNotRunning')}/>
                    )}
                    {state.controls.displayedView === VIEWS.HEALTH && (
                        <SwitchControl
                            sx={styles.controlsItem} name="Highlight pods with containers not ready"
                            checked={state.controls.highlightPodsWithContainersNotReady}
                            onChange={handleControlChange('highlightPodsWithContainersNotReady')}/>
                    )}
                    {state.controls.displayedView === VIEWS.HEALTH && (
                        <SwitchControl
                            sx={styles.controlsItem} name="Highlight pods with containers restarted"
                            checked={state.controls.highlightPodsWithContainersRestarted}
                            onChange={handleControlChange('highlightPodsWithContainersRestarted')}/>
                    )}
                    <SwitchControl
                        sx={styles.controlsItem} name="Always display large datasets"
                        checked={state.controls.displayLargeDatasets}
                        onChange={handleControlChange('displayLargeDatasets')}/>
                </Box>
            </Box>
            {state.podDetails && (
                <Box component="aside" sx={styles.details}>
                    <PodDetails data={state.podDetails}/>
                </Box>
            )}
            {state.allowedRouteDetails && (
                <Box component="aside" sx={styles.details}>
                    <AllowedRouteDetails data={state.allowedRouteDetails}/>
                </Box>
            )}
            {state.serviceDetails && (
                <Box component="aside" sx={styles.details}>
                    <ServiceDetails data={state.serviceDetails}/>
                </Box>
            )}
            {state.ingressDetails && (
                <Box component="aside" sx={styles.details}>
                    <IngressDetails data={state.ingressDetails}/>
                </Box>
            )}
            {state.replicaSetDetails && (
                <Box component="aside" sx={styles.details}>
                    <ReplicaSetDetails data={state.replicaSetDetails}/>
                </Box>
            )}
            {state.statefulSetDetails && (
                <Box component="aside" sx={styles.details}>
                    <StatefulSetDetails data={state.statefulSetDetails}/>
                </Box>
            )}
            {state.daemonSetDetails && (
                <Box component="aside" sx={styles.details}>
                    <DaemonSetDetails data={state.daemonSetDetails}/>
                </Box>
            )}
            {state.deploymentDetails && (
                <Box component="aside" sx={styles.details}>
                    <DeploymentDetails data={state.deploymentDetails}/>
                </Box>
            )}
        </Box>
    );
};

export default Content;
