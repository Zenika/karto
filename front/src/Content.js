import React, { useEffect, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import CircularProgress from '@material-ui/core/CircularProgress';
import classNames from 'classnames';
import Typography from '@material-ui/core/Typography';
import SwitchControl from './controls/SwitchControl';
import MultiSelectControl from './controls/MultiSelectControl';
import PropTypes from 'prop-types';
import Graph from './graph/Graph';

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
        width: 300,
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
    loadingCaption: {
        marginTop: theme.spacing(1)
    }
}));

async function fetchAnalysisResult() {
    const response = await fetch('./api/analysisResult');
    if (response.status !== 200) {
        console.error(`Could not fetch analysis result: error code : ${response.status}`);
        return;
    }
    return await response.json();
}

function computeAnalysisResultView(analysisResult, controls) {
    if (analysisResult == null) {
        return null;
    }
    const { namespaceFilters, labelFilters, showNamespacePrefix } = controls;
    const podFilter = pod => {
        const namespaceMatches = namespaceFilters.length === 0 || namespaceFilters.includes(pod.namespace);
        const labels = labelsToStringList(pod);
        const labelsMatch = labelFilters.length === 0
            || labelFilters.every(labelFilter => labels.includes(labelFilter));
        return namespaceMatches && labelsMatch;
    };
    const podMapper = pod => ({ ...pod, displayName: showNamespacePrefix ? `${pod.namespace}/${pod.name}` : pod.name });
    return {
        pods: analysisResult.pods.filter(podFilter).map(podMapper),
        allowedRoutes: analysisResult.allowedRoutes
            .filter(allowedRoute => podFilter(allowedRoute.sourcePod) && podFilter(allowedRoute.targetPod))
    };
}

function distinctAndSort(arr) {
    return [...new Set(arr)].sort();
}

function labelsToStringList(pod) {
    return Object.entries(pod.labels).map(([key, value]) => `${key}=${value}`);
}

function allNamespacesOfPods(pods) {
    return distinctAndSort(pods.map(pod => pod.namespace));
}

function allLabelsOfPods(pods) {
    return distinctAndSort(pods.map(labelsToStringList).flat());
}

function isFilterActive(selectedValues, allValues) {
    return selectedValues.length !== 0 && selectedValues.length !== allValues.length;
}

function filterLabel(filterName, selectedValues, allValues) {
    if (!isFilterActive(selectedValues, allValues)) {
        return `All ${filterName}s`
    } else if (selectedValues.length === 1) {
        return `1 ${filterName} filter`
    } else {
        return `${(selectedValues.length)} namespace filters`
    }
}

const Content = ({ className = '' }) => {
    const classes = useStyles();
    const [state, setState] = useState({
        isLoading: true,
        allNamespaces: [],
        allLabels: [],
        analysisResult: null,
        analysisResultView: null,
        controls: {
            namespaceFilters: [],
            labelFilters: [],
            showNamespacePrefix: true,
            autoRefresh: false
        }
    });

    useEffect(() => {
        console.log('effect')
        const fetchAndUpdate = async () => {
            const analysisResult = await fetchAnalysisResult();
            setState(oldState => ({
                ...oldState,
                isLoading: false,
                allNamespaces: allNamespacesOfPods(analysisResult.pods),
                allLabels: allLabelsOfPods(analysisResult.pods),
                analysisResult: analysisResult,
                analysisResultView: computeAnalysisResultView(analysisResult, oldState.controls)
            }));
        };
        fetchAndUpdate();

        if (state.controls.autoRefresh) {
            const interval = setInterval(() => {
                fetchAndUpdate()
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [state.controls.autoRefresh]);

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

    return (
        <div className={classNames(classes.root, className)}>
            <main className={classes.main}>
                {state.isLoading && <>
                    <CircularProgress thickness={1} size={60}/>
                    <Typography className={classes.loadingCaption} variant="caption">
                        Analyzing your cluster...
                    </Typography>
                </>}
                {!state.isLoading && state.analysisResultView && state.analysisResultView.pods.length === 0 && <>
                    <Typography className={classes.loadingCaption} variant="caption">
                        "No pod to display"
                    </Typography>
                </>}
                {!state.isLoading && state.analysisResultView && state.analysisResultView.pods.length > 0 && <>
                    <Graph analysisResult={state.analysisResultView}/>
                </>}
            </main>
            <aside role="search" className={classes.controls}>
                <Typography className={classes.controlsTitle} variant="h2">Filters</Typography>
                <div className={classes.controlsSection}>
                    <MultiSelectControl
                        className={classes.controlsItem} placeholder="Select a namespace"
                        name={filterLabel('namespace', state.controls.namespaceFilters, state.allNamespaces)}
                        selectAllAction={true} clearAction={true}
                        checked={isFilterActive(state.controls.namespaceFilters, state.allNamespaces)}
                        options={state.allNamespaces}
                        selectedOptions={state.controls.namespaceFilters}
                        onChange={handleControlChange('namespaceFilters')}/>
                    <MultiSelectControl
                        className={classes.controlsItem} placeholder="Select a label"
                        name={filterLabel('label', state.controls.labelFilters, state.allLabels)}
                        selectAllAction={false} clearAction={true}
                        checked={isFilterActive(state.controls.labelFilters, state.allLabels)}
                        options={state.allLabels}
                        selectedOptions={state.controls.labelFilters}
                        onChange={handleControlChange('labelFilters')}/>
                </div>
                <Typography className={classes.controlsTitle} variant="h2">Display options</Typography>
                <div className={classes.controlsSection}>
                    <SwitchControl className={classes.controlsItem} name="Show namespace prefix"
                                   checked={state.controls.showNamespacePrefix}
                                   onChange={handleControlChange('showNamespacePrefix')}/>
                    <SwitchControl className={classes.controlsItem} name="Auto refresh"
                                   checked={state.controls.autoRefresh}
                                   onChange={handleControlChange('autoRefresh')}/>
                </div>
            </aside>
        </div>
    );
};

Content.propTypes = {
    className: PropTypes.string
};

export default Content;
