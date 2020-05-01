import React, { useEffect, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import CircularProgress from '@material-ui/core/CircularProgress';
import classNames from 'classnames';
import Typography from '@material-ui/core/Typography';
import Graph from './Graph';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from './components/Switch';

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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: '0 16px'
    },
    controlsTitle: {
        marginBottom: 8
    },
    controlsItem: {
        marginBottom: 8
    },
    loadingCaption: {
        marginTop: 8
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
    const { includeKubeSystem, showNamespacePrefix } = controls;
    const podFilter = pod => includeKubeSystem || pod.namespace !== 'kube-system';
    const podMapper = pod => ({...pod, displayName: showNamespacePrefix ? `${pod.namespace}/${pod.name}` : pod.name});
    return {
        pods: analysisResult.pods.filter(podFilter).map(podMapper),
        allowedRoutes: analysisResult.allowedRoutes
            .filter(allowedRoute => podFilter(allowedRoute.sourcePod) && podFilter(allowedRoute.targetPod))
    };
}

const Content = ({ className = '' }) => {
    const classes = useStyles();
    const [isLoading, setIsLoading] = useState(true);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [controls, setControls] = useState({
        includeKubeSystem: false,
        showNamespacePrefix: true
    });

    useEffect(() => {
        async function updateAnalysisResults() {
            const analysisResult = await fetchAnalysisResults();
            setAnalysisResult(applyControls(analysisResult, controls));
            setIsLoading(false);
        }

        updateAnalysisResults();
        const interval = setInterval(() => {
            updateAnalysisResults()
        }, 5000);

        return () => clearInterval(interval);
    }, [controls]);

    function handleControlChange(key, newState) {
        let newControls = { ...controls, [key]: newState };
        setControls(newControls);
    }

    return (
        <div className={classNames(classes.root, className)}>
            <main className={classes.main}>
                {isLoading && <>
                    <CircularProgress thickness={1} size={60} color="secondary"/>
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
                <Typography className={classes.controlsTitle} variant="h2">Controls</Typography>
                <FormControlLabel className={classes.controlsItem} label="Include kube-system namespace" control={
                    <Switch color="primary" name="includeKubeSystem" checked={controls.includeKubeSystem}
                            onChange={event => handleControlChange('includeKubeSystem', event.target.checked)}/>
                }/>
                <FormControlLabel className={classes.controlsItem} label="Show namespace prefix" control={
                    <Switch color="primary" name="showNamespacePrefix" checked={controls.showNamespacePrefix}
                            onChange={event => handleControlChange('showNamespacePrefix', event.target.checked)}/>
                }/>
            </aside>
        </div>
    );
};

export default Content;
