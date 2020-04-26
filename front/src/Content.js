import React, { useEffect, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import CircularProgress from '@material-ui/core/CircularProgress';
import classNames from 'classnames';
import Typography from '@material-ui/core/Typography';

const useStyles = makeStyles(theme => ({
    root: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
    },
    loadingCaption: {
        marginTop: 10,
        color: theme.palette.text.main
    }
}));

const Content = ({ className = '' }) => {
    const classes = useStyles();
    const [isLoading, setIsLoading] = useState(true);
    const [allowedTraffic, setAllowedTraffic] = useState(null);

    useEffect(() => {
        fetchAnalysisResults();
        const interval = setInterval(() => {
            fetchAnalysisResults()
        }, 5000);

        return () => clearInterval(interval);
    }, [])

    async function fetchAnalysisResults() {
        const response = await fetch('./api/analysisResults');
        if (response.status !== 200) {
            console.error(`Could not fetch analysis result: error code : ${response.status}`);
            return;
        }
        const data = await response.json();
        setAllowedTraffic(data);
        setIsLoading(false);
    }

    return (
        <section className={classNames(classes.root, className)}>
            {isLoading && <>
                <CircularProgress thickness={1} size={60} color="secondary"/>
                <Typography className={classes.loadingCaption} variant="caption">Analyzing your cluster...</Typography>
            </>}
            {!isLoading && <>
                <Typography className={classes.loadingCaption} variant="body1">
                    {`Found ${allowedTraffic.pods.length} pods and ${allowedTraffic.allowedTraffic.length} allowed pod-to-pod routes`}
                </Typography>
            </>}
        </section>
    );
}

export default Content;
