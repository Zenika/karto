import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import D3NetworkPolicyGraph from './D3NetworkPolicyGraph';

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

const NetworkPolicyMap = ({ analysisResult, onItemFocus, onAllowedRouteFocus }) => {
    const classes = useStyles();
    const d3Graph = useRef(new D3NetworkPolicyGraph());

    useEffect(() => d3Graph.current.init(), []);

    useEffect(() => d3Graph.current.update(analysisResult, onItemFocus, onAllowedRouteFocus));

    return <div id="graph" className={classes.root}/>;
};

NetworkPolicyMap.propTypes = {
    analysisResult: PropTypes.shape({
        pods: PropTypes.arrayOf(PropTypes.shape({
            displayName: PropTypes.string.isRequired,
            name: PropTypes.string.isRequired,
            namespace: PropTypes.string.isRequired
        })).isRequired,
        allowedRoutes: PropTypes.arrayOf(PropTypes.shape({
            sourcePod: PropTypes.shape({
                name: PropTypes.string.isRequired,
                namespace: PropTypes.string.isRequired
            }).isRequired,
            targetPod: PropTypes.shape({
                name: PropTypes.string.isRequired,
                namespace: PropTypes.string.isRequired
            }).isRequired
        })).isRequired
    }).isRequired,
    onPodFocus: PropTypes.func.isRequired,
    onAllowedRouteFocus: PropTypes.func.isRequired
};

export default NetworkPolicyMap;
