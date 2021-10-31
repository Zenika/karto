import { useEffect, useRef } from 'react';
import Button from '@mui/material/Button';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import GetAppIcon from '@mui/icons-material/GetApp';
import { GRAPH_HEIGHT, GRAPH_WIDTH } from './d3/D3Constants';
import { saveSvgAsPng } from 'save-svg-as-png';
import { Box } from '@mui/material';

const Graph = ({ dataSet, autoZoom, focusHandlers, d3GraphClass }) => {
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
        <Box ref={fullscreenElementRef} aria-label="graph container" sx={{
            height: '100%',
            width: '100%',
            overflow: 'hidden',
            backgroundColor: 'background.default'
        }}>
            <Box component="svg" id="graph" ref={graphRef} sx={{
                fontFamily: 'Roboto', // re-declaration here is required for PNG export
                '& .item': {
                    fill: (theme) => theme.palette.secondary.main
                },
                '& .item-highlight': {
                    fill: (theme) => theme.palette.warning.main
                },
                '& .item-faded': {
                    fill: (theme) => theme.palette.secondary.dark
                },
                '& .item-faded-highlight': {
                    fill: (theme) => theme.palette.warning.dark
                },
                '& .label': {
                    fill: (theme) => theme.palette.text.primary,
                    fontWeight: 100,
                    cursor: 'default',
                    pointerEvents: 'none'
                },
                '& .link': {
                    stroke: (theme) => theme.palette.primary.main
                },
                '& .link-faded': {
                    stroke: (theme) => theme.palette.primary.dark
                },
                '& .link-arrow': {
                    fill: (theme) => theme.palette.primary.main
                },
                '& .link-arrow-faded': {
                    fill: (theme) => theme.palette.primary.dark
                }
            }}/>
        </Box>
        <Box sx={{
            position: 'absolute',
            top: 0,
            right: 0
        }}>
            <Button color="primary" onClick={download}>
                <GetAppIcon aria-label="download"/>
            </Button>
            {document.fullscreenEnabled && (
                <Button color="primary" onClick={goFullScreen}>
                    <FullscreenIcon aria-label="enter fullscreen" viewBox="2 3 20 20"/>
                </Button>
            )}
        </Box>
    </>;
};

export default Graph;
