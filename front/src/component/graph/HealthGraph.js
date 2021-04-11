import { memo } from 'react';
import PropTypes from 'prop-types';
import Graph from './Graph';

const HealthGraph = ({ dataSet, autoZoom, ...focusHandlers }) => {
    // return <Graph dataSet={dataSet} autoZoom={autoZoom} focusHandlers={focusHandlers}
    //               d3GraphClass={D3HealthGraph}/>;
    return null;
};

// HealthGraph.propTypes = {
//     dataSet: PropTypes.shape({
//         podHealths: PropTypes.arrayOf(PropTypes.shape({
//             displayName: PropTypes.string.isRequired,
//             name: PropTypes.string.isRequired,
//             namespace: PropTypes.string.isRequired
//         })).isRequired,
//         allowedRoutes: PropTypes.arrayOf(PropTypes.shape({
//             sourcePod: PropTypes.shape({
//                 name: PropTypes.string.isRequired,
//                 namespace: PropTypes.string.isRequired
//             }).isRequired,
//             targetPod: PropTypes.shape({
//                 name: PropTypes.string.isRequired,
//                 namespace: PropTypes.string.isRequired
//             }).isRequired
//         })).isRequired
//     }).isRequired,
//     autoZoom: PropTypes.bool.isRequired,
//     onPodFocus: PropTypes.func.isRequired,
//     onAllowedRouteFocus: PropTypes.func.isRequired
// };

export default memo(HealthGraph);
