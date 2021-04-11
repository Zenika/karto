import { memo } from 'react';
import PropTypes from 'prop-types';
import Graph from './Graph';
import D3HealthGraph from './d3/D3HealthGraph';

const HealthGraph = ({ dataSet, autoZoom, ...focusHandlers }) => {
    return <Graph dataSet={dataSet} autoZoom={autoZoom} focusHandlers={focusHandlers}
                  d3GraphClass={D3HealthGraph}/>;
};

HealthGraph.propTypes = {
    dataSet: PropTypes.shape({
        podHealths: PropTypes.arrayOf(PropTypes.shape({
            displayName: PropTypes.string.isRequired,
            name: PropTypes.string.isRequired,
            namespace: PropTypes.string.isRequired
        })).isRequired
    }).isRequired,
    autoZoom: PropTypes.bool.isRequired,
    onPodFocus: PropTypes.func.isRequired
};

export default memo(HealthGraph);
