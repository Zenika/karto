import { memo, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import D3NetworkPolicyGraph from './d3/D3NetworkPolicyGraph';

const useStyles = makeStyles(theme => ({
    root: {
        height: '100%',
        width: '100%',
        overflow: 'hidden'
    },
    svg: {
        fontFamily: 'Roboto',
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

const Graph = ({ dataSet, focusHandlers, d3Graph }) => {
    const classes = useStyles();

    useEffect(() => {
        d3Graph.init();
        return () => d3Graph.destroy();
    }, []);

    useEffect(() => d3Graph.update(dataSet, focusHandlers));

    return <div className={classes.root}>
        <svg id="graph" className={classes.svg}/>
    </div>;
};

export default Graph;
