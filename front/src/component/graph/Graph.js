import { useEffect, useRef } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import FullscreenIcon from '@material-ui/icons/Fullscreen';
import GetAppIcon from '@material-ui/icons/GetApp';
import classNames from 'classnames';
import { GRAPH_HEIGHT, GRAPH_WIDTH } from './d3/D3Constants';
import { saveSvgAsPng } from 'save-svg-as-png';

const useStyles = makeStyles(theme => ({
    graph: {
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        backgroundColor: theme.palette.background.default
    },
    actions: {
        position: 'absolute',
        top: 0,
        right: 0
    },
    svg: {
        fontFamily: 'Roboto', // re-declaration here is required for PNG export
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

const Graph = ({ dataSet, autoZoom, focusHandlers, d3GraphClass }) => {
    const classes = useStyles();
    const d3Graph = useRef(new d3GraphClass());
    const fullscreenElementRef = useRef(null);
    const graphRef = useRef(null);

    useEffect(() => {
        d3Graph.current.init();
        return () => d3Graph.current.destroy();
    }, []);

    useEffect(() => d3Graph.current.update(dataSet, autoZoom, focusHandlers));

    const goFullScreen = () => fullscreenElementRef.current.requestFullscreen();
    const download = () => saveSvgAsPng(graphRef.current, 'karto-export.png', {
        top: -GRAPH_HEIGHT / 2,
        left: -GRAPH_WIDTH / 2,
        scale: 10,
        encoderOptions: 1,
        modifyStyle: s => {
            return s
                .replace('rgb(255, 255, 255)', 'black')
                .replace('font-weight: 100', 'font-weight: 300');
        }
    });

    return <>
        <div ref={fullscreenElementRef} aria-label="graph container" className={classNames(classes.graph)}>
            <svg id="graph" ref={graphRef} className={classes.svg}/>
        </div>
        <div className={classes.actions}>
            <Button color="primary" onClick={download}>
                <GetAppIcon aria-label="download"/>
            </Button>
            {document.fullscreenEnabled && (
                <Button color="primary" onClick={goFullScreen}>
                    <FullscreenIcon aria-label="enter fullscreen" viewBox="2 3 20 20"/>
                </Button>
            )}
        </div>
    </>;
};

export default Graph;
