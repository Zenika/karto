import React, { useEffect, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import CircularProgress from '@material-ui/core/CircularProgress';
import classNames from 'classnames';
import Typography from '@material-ui/core/Typography';
import SwitchControl from './controls/SwitchControl';
import MultiSelectControl from './controls/MultiSelectControl';
import PropTypes from 'prop-types';
import Graph from './graph/Graph';
import { getStoredControls, storeControls } from '../service/storageService';
import { computeAnalysisResultView, fetchAnalysisResult } from '../service/analysisResultService';
import InputControl from './controls/InputControl';

const DEFAULT_CONTROLS = {
    namespaceFilters: [],
    labelFilters: [],
    nameFilter: '',
    showNamespacePrefix: true,
    autoRefresh: false,
    highlightPodsWithoutIngressIsolation: false,
    highlightPodsWithoutEgressIsolation: false
};

export function isFilterActive(selectedValues, allValues) {
    return selectedValues.length !== 0 && selectedValues.length !== allValues.length;
}

export function filterLabel(filterName, selectedValues, allValues) {
    if (!isFilterActive(selectedValues, allValues)) {
        return `All ${filterName}s`
    } else if (selectedValues.length === 1) {
        return `1 ${filterName} filter`
    } else {
        return `${(selectedValues.length)} namespace filters`
    }
}

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
    loadingCaption: {
        marginTop: theme.spacing(1)
    }
}));

const Content = ({ className = '' }) => {
    const classes = useStyles();
    const [state, setState] = useState({
        isLoading: true,
        analysisResult: null,
        analysisResultView: null,
        controls: Object.assign(DEFAULT_CONTROLS, getStoredControls())
    });

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
                fetchAndUpdate()
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [state.controls.autoRefresh]);

    useEffect(() => {
        storeControls(state.controls);
    }, [state.controls]);

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

    const allNamespaces = state.analysisResult ? state.analysisResult.allNamespaces : [];
    const allLabels = state.analysisResult ? state.analysisResult.allLabels : [];
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
                        name={filterLabel('namespace', state.controls.namespaceFilters, allNamespaces)}
                        selectAllAction={true} clearAction={true}
                        checked={isFilterActive(state.controls.namespaceFilters, allNamespaces)}
                        options={allNamespaces}
                        selectedOptions={state.controls.namespaceFilters}
                        onChange={handleControlChange('namespaceFilters')}/>
                    <MultiSelectControl
                        className={classes.controlsItem} placeholder="Select a pod label"
                        name={filterLabel('pod label', state.controls.labelFilters, allLabels)}
                        selectAllAction={false} clearAction={true}
                        checked={isFilterActive(state.controls.labelFilters, allLabels)}
                        options={allLabels}
                        selectedOptions={state.controls.labelFilters}
                        onChange={handleControlChange('labelFilters')}/>
                    <InputControl
                        className={classes.controlsItem} placeholder="Type a pod name or regex"
                        name={state.controls.nameFilter === '' ? 'All pod names' : '1 pod name filter'}
                        clearAction={true}
                        checked={state.controls.nameFilter !== ''}
                        value={state.controls.nameFilter}
                        onChange={handleControlChange('nameFilter')}/>
                </div>
                <Typography className={classes.controlsTitle} variant="h2">Display options</Typography>
                <div className={classes.controlsSection}>
                    <SwitchControl className={classes.controlsItem} name="Show namespace prefix"
                                   checked={state.controls.showNamespacePrefix}
                                   onChange={handleControlChange('showNamespacePrefix')}/>
                    <SwitchControl className={classes.controlsItem} name="Auto refresh"
                                   checked={state.controls.autoRefresh}
                                   onChange={handleControlChange('autoRefresh')}/>
                    <SwitchControl className={classes.controlsItem} name="Highlight non isolated pods (ingress)"
                                   checked={state.controls.highlightPodsWithoutIngressIsolation}
                                   onChange={handleControlChange('highlightPodsWithoutIngressIsolation')}/>
                    <SwitchControl className={classes.controlsItem} name="Highlight non isolated pods (egress)"
                                   checked={state.controls.highlightPodsWithoutEgressIsolation}
                                   onChange={handleControlChange('highlightPodsWithoutEgressIsolation')}/>
                </div>
            </aside>
        </div>
    );
};

Content.propTypes = {
    className: PropTypes.string
};

export default Content;
