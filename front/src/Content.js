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

async function fetchAnalysisResults() {
    const response = await fetch('./api/analysisResults');
    if (response.status !== 200) {
        console.error(`Could not fetch analysis result: error code : ${response.status}`);
        return;
    }
    return await response.json();
}

function applyControls(analysisResult, controls) {
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
    return [...new Set(pods.map(pod => pod.namespace))];
}

function displayedNamespaceLabel(displayedNamespaces) {
    const namespaceCount = displayedNamespaces.length;
    if (namespaceCount === 0) {
        return 'All namespaces'
    } else if (namespaceCount === 1) {
        return '1 namespace filter'
    } else {
        return `${namespaceCount} namespace filters`
    }
}

const Content = ({ className = '' }) => {
    const classes = useStyles();
    const [isLoading, setIsLoading] = useState(true);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [allNamespaces, setAllNamespaces] = useState([]);
    const [controls, setControls] = useState({
        displayedNamespaces: [],
        showNamespacePrefix: true
    });

    useEffect(() => {
        async function updateAnalysisResults() {
            const analysisResult = await fetchAnalysisResults();
            setAnalysisResult(applyControls(analysisResult, controls));
            setAllNamespaces(allNamespacesOfPods(analysisResult.pods));
            setIsLoading(false);
        }

        updateAnalysisResults();
        const interval = setInterval(() => {
            updateAnalysisResults()
        }, 5000);

        return () => clearInterval(interval);
    }, [controls]);

    const handleControlChange = key => newState => {
        let newControls = { ...controls, [key]: newState };
        setControls(newControls);
    };

    return (
        <div className={classNames(classes.root, className)}>
            <main className={classes.main}>
                {isLoading && <>
                    <CircularProgress thickness={1} size={60}/>
                    <Typography className={classes.loadingCaption} variant="caption">Analyzing your
                        cluster...</Typography>
                </>}
                {!isLoading && analysisResult && analysisResult.pods.length === 0 && <>
                    <Typography className={classes.loadingCaption} variant="caption">
                        {`Found ${analysisResult.pods.length} pods in your cluster`}
                    </Typography>
                </>}
                {!isLoading && analysisResult && analysisResult.pods.length > 0 && <>
                    <Graph analysisResult={analysisResult}/>
                </>}
            </main>
            <aside role="search" className={classes.controls}>
                <Typography className={classes.controlsTitle} variant="h2">Filters</Typography>
                <div className={classes.controlsSection}>
                    <MultiSelect className={classes.controlsItem}
                                 name={displayedNamespaceLabel(controls.displayedNamespaces)}
                                 options={allNamespaces} selectedOptions={controls.displayedNamespaces}
                                 onChange={handleControlChange('displayedNamespaces')}/>
                </div>
                <Typography className={classes.controlsTitle} variant="h2">Display options</Typography>
                <div className={classes.controlsSection}>
                    <Switch className={classes.controlsItem} name="Show namespace prefix"
                            checked={controls.showNamespacePrefix}
                            onChange={handleControlChange('showNamespacePrefix')}/>
                </div>
            </aside>
        </div>
    );
};

Content.propTypes = {
    className: PropTypes.string
};

export default Content;
