import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import D3ClusterGraph from './d3/D3ClusterGraph';

const useStyles = makeStyles(theme => ({
    root: {
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        '& .item': {
            fill: theme.palette.secondary.main
        },
        '& .item-highlight': {
            fill: theme.palette.warning.main
        },
        '& .item-faded': {
            fill: theme.palette.secondary.dark
        },
        '& .item-faded-highlight': {
            fill: theme.palette.warning.dark
        },
        '& .label': {
            fill: theme.palette.text.primary,
            fontWeight: 100,
            cursor: 'default',
            pointerEvents: 'none'
        },
        '& .link': {
            stroke: theme.palette.primary.main
        },
        '& .link-faded': {
            stroke: theme.palette.primary.dark
        },
        '& .link-arrow': {
            fill: theme.palette.primary.main
        },
        '& .link-arrow-faded': {
            fill: theme.palette.primary.dark
        }
    }
}));

const ClusterMap = ({ analysisResult, onPodFocus, onServiceFocus }) => {
    const classes = useStyles();
    const d3Graph = useRef(new D3ClusterGraph());

    useEffect(() => d3Graph.current.init(), []);

    useEffect(() => d3Graph.current.update(analysisResult, { onPodFocus, onServiceFocus }));

    return <div id="graph" className={classes.root}/>;
};

ClusterMap.propTypes = {
    analysisResult: PropTypes.shape({
        pods: PropTypes.arrayOf(PropTypes.shape({
            displayName: PropTypes.string.isRequired,
            name: PropTypes.string.isRequired,
            namespace: PropTypes.string.isRequired
        })).isRequired,
        services: PropTypes.arrayOf(PropTypes.shape({
            name: PropTypes.string.isRequired,
            namespace: PropTypes.string.isRequired,
            targetPods: PropTypes.arrayOf(PropTypes.shape({
                name: PropTypes.string.isRequired,
                namespace: PropTypes.string.isRequired
            })).isRequired
        }))
    }).isRequired,
    onPodFocus: PropTypes.func.isRequired,
    onServiceFocus: PropTypes.func.isRequired
};

export default ClusterMap;
