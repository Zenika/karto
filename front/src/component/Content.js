import React, { useEffect, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import CircularProgress from '@material-ui/core/CircularProgress';
import classNames from 'classnames';
import Typography from '@material-ui/core/Typography';
import SwitchControl from './control/SwitchControl';
import MultiSelectControl from './control/MultiSelectControl';
import PropTypes from 'prop-types';
import { getStoredControls, storeControls } from '../service/storageService';
import {
    computeAnalysisResultView,
    fetchAnalysisResult,
    labelSelectorOperators
} from '../service/analysisResultService';
import InputControl from './control/InputControl';
import AllowedRouteDetails from './detail/AllowedRouteDetails';
import PodDetails from './detail/PodDetails';
import ServiceDetails from './detail/ServiceDetails';
import MultiKeyValueSelectControl from './control/MultiKeyValueSelectControl';
import ClusterMap from './map/ClusterMap';
import RadioGroupControl from './control/RadioGroupControl';
import NetworkPolicyMap from './map/NetworkPolicyMap';
import ReplicaSetDetails from './detail/ReplicaSetDetails';

const MAX_RECOMMENDED_PODS = 100;
const MAX_RECOMMENDED_ALLOWED_ROUTES = 1000;
const VIEWS = {
    WORKLOADS: 'Workloads',
    NETWORK_POLICIES: 'Network policies'
};
const DEFAULT_CONTROLS = {
    displayedView: VIEWS.WORKLOADS,
    namespaceFilters: [],
    labelFilters: [],
    nameFilter: '',
    includeIngressNeighbors: false,
    includeEgressNeighbors: false,
    autoRefresh: false,
    showNamespacePrefix: true,
    highlightPodsWithoutIngressIsolation: false,
    highlightPodsWithoutEgressIsolation: false,
    displayLargeDatasets: false
};

const useStyles = makeStyles(theme => ({
    root: {
        position: 'relative'
    },
    main: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh'
    },
    controls: {
        position: 'absolute',
        top: 80,
        left: 0,
        width: 320,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: `0 ${theme.spacing(2)}px`
    },
    controlsTitle: {
        marginBottom: theme.spacing(1),
        cursor: 'default'
    },
    controlsItem: {
        marginBottom: theme.spacing(1)
    },
    controlsSection: {
        display: 'flex',
        flexDirection: 'column',
        marginBottom: theme.spacing(1),
        width: '100%'
    },
    message: {
        marginTop: theme.spacing(1),
        maxWidth: 500,
        textAlign: 'center'
    },
    details: {
        position: 'absolute',
        bottom: 40,
        right: 0,
        width: 320,
        padding: `0 ${theme.spacing(2)}px`,
        borderLeft: `1px solid ${theme.palette.primary.main}`
    },
    graphCaption: {
        position: 'absolute',
        bottom: 0,
        left: 'auto',
        right: 'auto',
        backgroundColor: 'transparent',
        cursor: 'default'
    }
}));

const Content = ({ className = '' }) => {
    const classes = useStyles();
    const [state, setState] = useState({
        isLoading: true,
        analysisResult: null,
        analysisResultView: null,
        controls: Object.assign(DEFAULT_CONTROLS, getStoredControls()),
        podDetails: null,
        allowedRouteDetails: null
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
                analysisResultView: computeAnalysisResultView(analysisResult, oldState.controls)
            }));
        };
        fetchAndUpdate();

        if (state.controls.autoRefresh) {
            const interval = setInterval(() => {
                fetchAndUpdate();
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [state.controls.autoRefresh]);

    useEffect(() => {
        storeControls(state.controls);
    }, [state.controls]);

    const isSafeToDisplay = (analysisResultView, displayLargeDatasets) => {
        const tooLarge = analysisResultView.pods.length > MAX_RECOMMENDED_PODS
            || analysisResultView.allowedRoutes.length > MAX_RECOMMENDED_ALLOWED_ROUTES;
        return displayLargeDatasets || !tooLarge;
    };
    const handleControlChange = key => newValue => {
        setState(oldState => {
            const newControls = { ...oldState.controls, [key]: newValue };
            return ({
                ...oldState,
                controls: newControls,
                analysisResultView: computeAnalysisResultView(oldState.analysisResult, newControls)
            });
        });
    };
    const onPodFocus = pod => {
        setState(oldState => ({
            ...oldState,
            podDetails: pod
        }));
    };
    const onAllowedRouteFocus = allowedRoute => {
        setState(oldState => ({
            ...oldState,
            allowedRouteDetails: allowedRoute
        }));
    };
    const onServiceFocus = service => {
        setState(oldState => ({
            ...oldState,
            serviceDetails: service
        }));
    };
    const onReplicaSetFocus = replicaSet => {
        setState(oldState => ({
            ...oldState,
            replicaSetDetails: replicaSet
        }));
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
        <div className={classNames(classes.root, className)}>
            <main className={classes.main}>
                {state.isLoading && <>
                    <CircularProgress thickness={1} size={60}/>
                    <Typography className={classes.message} variant="caption">
                        Analyzing your cluster...
                    </Typography>
                </>}
                {!state.isLoading && state.analysisResultView && state.analysisResultView.pods.length === 0 && <>
                    <Typography className={classes.message} variant="caption">
                        No pod to display
                    </Typography>
                </>}
                {!state.isLoading && state.analysisResultView && state.analysisResultView.pods.length > 0
                && !isSafeToDisplay(state.analysisResultView, state.controls.displayLargeDatasets) && <>
                    <Typography className={classes.message} variant="caption">
                        {`The dataset to display is larger than recommended for an optimal experience. Apply a filter `
                        + `on the left to reduce the dataset, or enable the "Always display large datasets" display `
                        + `option if you know what you are doing.`}
                    </Typography>
                </>}
                {!state.isLoading && state.analysisResultView && state.analysisResultView.pods.length > 0
                && isSafeToDisplay(state.analysisResultView, state.controls.displayLargeDatasets)
                && state.controls.displayedView === VIEWS.WORKLOADS && <>
                    <ClusterMap analysisResult={state.analysisResultView} onPodFocus={onPodFocus}
                                onServiceFocus={onServiceFocus} onReplicaSetFocus={onReplicaSetFocus}/>
                    <Typography className={classes.graphCaption} variant="caption">
                        {`Displaying ${state.analysisResultView.pods.length}/${state.analysisResult.pods.length} pods`
                        + ` and ${state.analysisResultView.services.length}/`
                        + `${state.analysisResult.services.length} services`}
                    </Typography>
                </>}
                {!state.isLoading && state.analysisResultView && state.analysisResultView.pods.length > 0
                && isSafeToDisplay(state.analysisResultView, state.controls.displayLargeDatasets)
                && state.controls.displayedView === VIEWS.NETWORK_POLICIES && <>
                    <NetworkPolicyMap analysisResult={state.analysisResultView} onPodFocus={onPodFocus}
                                      onAllowedRouteFocus={onAllowedRouteFocus}/>
                    <Typography className={classes.graphCaption} variant="caption">
                        {`Displaying ${state.analysisResultView.pods.length}/${state.analysisResult.pods.length} pods`
                        + ` and ${state.analysisResultView.allowedRoutes.length}/`
                        + `${state.analysisResult.allowedRoutes.length} allowed routes`}
                    </Typography>
                </>}
            </main>
            <aside role="search" className={classes.controls}>
                <Typography className={classes.controlsTitle} variant="h2">View</Typography>
                <div className={classes.controlsSection}>
                    <RadioGroupControl className={classes.controlsItem} options={Object.values(VIEWS)}
                                       value={state.controls.displayedView}
                                       onChange={handleControlChange('displayedView')}>
                    </RadioGroupControl>
                </div>
                <Typography className={classes.controlsTitle} variant="h2">Filters</Typography>
                <div className={classes.controlsSection}>
                    <MultiSelectControl
                        className={classes.controlsItem} placeholder="Select a namespace"
                        name={namespaceFilterLabel()} checked={isNamespaceFilterActive()}
                        options={allNamespaces} selectedOptions={state.controls.namespaceFilters}
                        onChange={handleControlChange('namespaceFilters')}/>
                    <MultiKeyValueSelectControl
                        className={classes.controlsItem} keyPlaceholder="Select a label key"
                        valuePlaceholder="Select a label value"
                        name={labelFilterLabel()} checked={isLabelFilterActive()}
                        options={allLabels} selectedOptions={state.controls.labelFilters}
                        operators={labelSelectorOperators} onChange={handleControlChange('labelFilters')}/>
                    <InputControl
                        className={classes.controlsItem} placeholder="Type a pod name or regex"
                        name={nameFilterLabel()} checked={isNameFilterActive()} value={state.controls.nameFilter}
                        onChange={handleControlChange('nameFilter')}/>
                    <SwitchControl
                        className={classes.controlsItem} name="Include ingress neighbors"
                        checked={state.controls.includeIngressNeighbors}
                        onChange={handleControlChange('includeIngressNeighbors')}/>
                    <SwitchControl
                        className={classes.controlsItem} name="Include egress neighbors"
                        checked={state.controls.includeEgressNeighbors}
                        onChange={handleControlChange('includeEgressNeighbors')}/>
                </div>
                <Typography className={classes.controlsTitle} variant="h2">Display options</Typography>
                <div className={classes.controlsSection}>
                    <SwitchControl
                        className={classes.controlsItem} name="Auto refresh" checked={state.controls.autoRefresh}
                        onChange={handleControlChange('autoRefresh')}/>
                    <SwitchControl
                        className={classes.controlsItem} name="Show namespace prefix"
                        checked={state.controls.showNamespacePrefix}
                        onChange={handleControlChange('showNamespacePrefix')}/>
                    <SwitchControl
                        className={classes.controlsItem} name="Highlight non isolated pods (ingress)"
                        checked={state.controls.highlightPodsWithoutIngressIsolation}
                        onChange={handleControlChange('highlightPodsWithoutIngressIsolation')}/>
                    <SwitchControl
                        className={classes.controlsItem} name="Highlight non isolated pods (egress)"
                        checked={state.controls.highlightPodsWithoutEgressIsolation}
                        onChange={handleControlChange('highlightPodsWithoutEgressIsolation')}/>
                    <SwitchControl
                        className={classes.controlsItem} name="Always display large datasets"
                        checked={state.controls.displayLargeDatasets}
                        onChange={handleControlChange('displayLargeDatasets')}/>
                </div>
            </aside>
            {state.podDetails && (
                <aside className={classes.details}>
                    <PodDetails data={state.podDetails}/>
                </aside>
            )}
            {state.allowedRouteDetails && (
                <aside className={classes.details}>
                    <AllowedRouteDetails data={state.allowedRouteDetails}/>
                </aside>
            )}
            {state.serviceDetails && (
                <aside className={classes.details}>
                    <ServiceDetails data={state.serviceDetails}/>
                </aside>
            )}
            {state.replicaSetDetails && (
                <aside className={classes.details}>
                    <ReplicaSetDetails data={state.replicaSetDetails}/>
                </aside>
            )}
        </div>
    );
};

Content.propTypes = {
    className: PropTypes.string
};

export default Content;
