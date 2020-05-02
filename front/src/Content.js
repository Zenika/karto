import React, { useEffect, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import CircularProgress from '@material-ui/core/CircularProgress';
import classNames from 'classnames';
import Typography from '@material-ui/core/Typography';
import Switch from './components/Switch';
import MultiSelect from './components/MultiSelect';
import PropTypes from 'prop-types';
import Graph from './Graph';

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
    const { displayedNamespaces, showNamespacePrefix } = controls;
    const podFilter = pod => displayedNamespaces.length === 0 || displayedNamespaces.includes(pod.namespace);
    const podMapper = pod => ({ ...pod, displayName: showNamespacePrefix ? `${pod.namespace}/${pod.name}` : pod.name });
    return {
        pods: analysisResult.pods.filter(podFilter).map(podMapper),
        allowedRoutes: analysisResult.allowedRoutes
            .filter(allowedRoute => podFilter(allowedRoute.sourcePod) && podFilter(allowedRoute.targetPod))
    };
}

function allNamespacesOfPods(pods) {
    return [...new Set(pods.map(pod => pod.namespace))].sort();
}

function namespaceFilterActive(displayedNamespaces, allNamespaces) {
    return displayedNamespaces.length !== 0 && displayedNamespaces.length !== allNamespaces.length;
}

function displayedNamespaceLabel(displayedNamespaces, allNamespaces) {
    if (!namespaceFilterActive(displayedNamespaces, allNamespaces)) {
        return 'All namespaces'
    } else if (displayedNamespaces.length === 1) {
        return '1 namespace filter'
    } else {
        return `${(displayedNamespaces.length)} namespace filters`
    }
}

const Content = ({ className = '' }) => {
    const classes = useStyles();
    const [state, setState] = useState({
        isLoading: true,
        allNamespaces: [],
        analysisResult: null,
        analysisResultView: null,
        controls: {
            displayedNamespaces: [],
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
                    <Typography className={classes.loadingCaption} variant="caption">Analyzing your
                        cluster...</Typography>
                </>}
                {!state.isLoading && state.analysisResultView && state.analysisResultView.pods.length === 0 && <>
                    <Typography className={classes.loadingCaption} variant="caption">
                        {`No pod to display`}
                    </Typography>
                </>}
                {!state.isLoading && state.analysisResultView && state.analysisResultView.pods.length > 0 && <>
                    <Graph analysisResult={state.analysisResultView}/>
                </>}
            </main>
            <aside role="search" className={classes.controls}>
                <Typography className={classes.controlsTitle} variant="h2">Filters</Typography>
                <div className={classes.controlsSection}>
                    <MultiSelect className={classes.controlsItem}
                                 name={displayedNamespaceLabel(state.controls.displayedNamespaces, state.allNamespaces)}
                                 checked={namespaceFilterActive(state.controls.displayedNamespaces,
                                     state.allNamespaces)}
                                 options={state.allNamespaces} selectedOptions={state.controls.displayedNamespaces}
                                 onChange={handleControlChange('displayedNamespaces')}/>
                </div>
                <Typography className={classes.controlsTitle} variant="h2">Display options</Typography>
                <div className={classes.controlsSection}>
                    <Switch className={classes.controlsItem} name="Show namespace prefix"
                            checked={state.controls.showNamespacePrefix}
                            onChange={handleControlChange('showNamespacePrefix')}/>
                    <Switch className={classes.controlsItem} name="Auto refresh"
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
