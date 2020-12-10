import { memo } from 'react';
import PropTypes from 'prop-types';
import D3ClusterGraph from './d3/D3ClusterGraph';
import Graph from './Graph';

const ClusterGraph = ({ dataSet, autoZoom, ...focusHandlers }) => {
    return <Graph dataSet={dataSet} autoZoom={autoZoom} focusHandlers={focusHandlers}
                  d3GraphClass={D3ClusterGraph}/>;
};

ClusterGraph.propTypes = {
    dataSet: PropTypes.shape({
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
        })),
        ingresses: PropTypes.arrayOf(PropTypes.shape({
            name: PropTypes.string.isRequired,
            namespace: PropTypes.string.isRequired,
            targetServices: PropTypes.arrayOf(PropTypes.shape({
                name: PropTypes.string.isRequired,
                namespace: PropTypes.string.isRequired
            })).isRequired
        })),
        replicaSets: PropTypes.arrayOf(PropTypes.shape({
            name: PropTypes.string.isRequired,
            namespace: PropTypes.string.isRequired,
            targetPods: PropTypes.arrayOf(PropTypes.shape({
                name: PropTypes.string.isRequired,
                namespace: PropTypes.string.isRequired
            })).isRequired
        })),
        statefulSets: PropTypes.arrayOf(PropTypes.shape({
            name: PropTypes.string.isRequired,
            namespace: PropTypes.string.isRequired,
            targetPods: PropTypes.arrayOf(PropTypes.shape({
                name: PropTypes.string.isRequired,
                namespace: PropTypes.string.isRequired
            })).isRequired
        })),
        daemonSets: PropTypes.arrayOf(PropTypes.shape({
            name: PropTypes.string.isRequired,
            namespace: PropTypes.string.isRequired,
            targetPods: PropTypes.arrayOf(PropTypes.shape({
                name: PropTypes.string.isRequired,
                namespace: PropTypes.string.isRequired
            })).isRequired
        })),
        deployments: PropTypes.arrayOf(PropTypes.shape({
            name: PropTypes.string.isRequired,
            namespace: PropTypes.string.isRequired,
            targetReplicaSets: PropTypes.arrayOf(PropTypes.shape({
                name: PropTypes.string.isRequired,
                namespace: PropTypes.string.isRequired
            })).isRequired
        }))
    }).isRequired,
    autoZoom: PropTypes.bool.isRequired,
    onPodFocus: PropTypes.func.isRequired,
    onServiceFocus: PropTypes.func.isRequired,
    onIngressFocus: PropTypes.func.isRequired,
    onReplicaSetFocus: PropTypes.func.isRequired,
    onStatefulSetFocus: PropTypes.func.isRequired,
    onDaemonSetFocus: PropTypes.func.isRequired,
    onDeploymentFocus: PropTypes.func.isRequired
};

export default memo(ClusterGraph);
