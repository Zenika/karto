import { memo, useRef } from 'react';
import PropTypes from 'prop-types';
import D3NetworkPolicyGraph from './d3/D3NetworkPolicyGraph';
import Graph from './Graph';

const NetworkPolicyGraph = ({ dataSet, ...focusHandlers }) => {
    const d3Graph = useRef(new D3NetworkPolicyGraph());

    return <Graph dataSet={dataSet} focusHandlers={focusHandlers} d3Graph={d3Graph.current}/>;
};

NetworkPolicyGraph.propTypes = {
    dataSet: PropTypes.shape({
        podIsolations: PropTypes.arrayOf(PropTypes.shape({
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

export default memo(NetworkPolicyGraph);
