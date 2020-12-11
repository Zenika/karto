import { memo } from 'react';
import PropTypes from 'prop-types';
import D3NetworkPolicyGraph from './d3/D3NetworkPolicyGraph';
import Graph from './Graph';

const NetworkPolicyGraph = ({ dataSet, autoZoom, ...focusHandlers }) => {
    return <Graph dataSet={dataSet} autoZoom={autoZoom} focusHandlers={focusHandlers}
                  d3GraphClass={D3NetworkPolicyGraph}/>;
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
    autoZoom: PropTypes.bool.isRequired,
    onPodFocus: PropTypes.func.isRequired,
    onAllowedRouteFocus: PropTypes.func.isRequired
};

export default memo(NetworkPolicyGraph);
