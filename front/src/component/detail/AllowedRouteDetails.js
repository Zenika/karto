import Typography from '@mui/material/Typography';
import PropTypes from 'prop-types';
import { Box } from '@mui/material';
import detailsStyles from './detailsStyles';

const AllowedRouteDetails = ({ data }) => (
    <>
        <Typography sx={detailsStyles.detailsTitle} variant="h2">Allowed route details</Typography>
        <div>
            <Typography variant="body1" component="span" sx={detailsStyles.detailsKey}>Source pod:</Typography>
            <Typography variant="body1" component="span"
                        sx={detailsStyles.detailsValue}>{data.sourcePod.namespace}/
                {data.sourcePod.name}</Typography>
        </div>
        <div>
            <Typography variant="body1" component="span" sx={detailsStyles.detailsKey}>Target pod:</Typography>
            <Typography variant="body1" component="span"
                        sx={detailsStyles.detailsValue}>{data.targetPod.namespace}/
                {data.targetPod.name}</Typography>
        </div>
        <div>
            <Typography variant="body1" component="span"
                        sx={detailsStyles.detailsKey}>Ports:</Typography>
            <Typography variant="body1" component="span"
                        sx={detailsStyles.detailsValue}>
                {data.ports ? data.ports.join(', ') : 'all'}
            </Typography>
        </div>
        <div>
            <Typography variant="body1" component="span" sx={detailsStyles.detailsKey}>Explanation:</Typography>
            <Box sx={detailsStyles.detailsValueNested}>
                <div>
                    <Typography variant="body1" sx={detailsStyles.detailsKey}>
                        Policies allowing egress from source:</Typography>
                    {
                        data.sourcePod.isEgressIsolated ? (
                            <Typography variant="body1" sx={detailsStyles.detailsValue}>{
                                data.egressPolicies
                                    .map(policy => `${policy.namespace}/${policy.name}`)
                                    .join(', ')
                            }</Typography>
                        ) : (
                            <Typography variant="body1" sx={detailsStyles.detailsValue}>no isolation</Typography>
                        )
                    }
                </div>
                <div>
                    <Typography variant="body1" sx={detailsStyles.detailsKey}>
                        Policies allowing ingress to target:</Typography>
                    {
                        data.targetPod.isIngressIsolated ? (
                            <Typography variant="body1" sx={detailsStyles.detailsValue}>{
                                data.ingressPolicies
                                    .map(policy => `${policy.namespace}/${policy.name}`)
                                    .join(', ')
                            }</Typography>
                        ) : (
                            <Typography variant="body1" sx={detailsStyles.detailsValue}>no isolation</Typography>
                        )
                    }
                </div>
            </Box>
        </div>
    </>
);

AllowedRouteDetails.propTypes = {
    data: PropTypes.shape({
        sourcePod: PropTypes.shape({
            namespace: PropTypes.string.isRequired,
            name: PropTypes.string.isRequired,
            isEgressIsolated: PropTypes.bool.isRequired
        }),
        egressPolicies: PropTypes.arrayOf(
            PropTypes.shape({
                namespace: PropTypes.string.isRequired,
                name: PropTypes.string.isRequired
            })
        ).isRequired,
        targetPod: PropTypes.shape({
            namespace: PropTypes.string.isRequired,
            name: PropTypes.string.isRequired,
            isIngressIsolated: PropTypes.bool.isRequired
        }),
        ingressPolicies: PropTypes.arrayOf(
            PropTypes.shape({
                namespace: PropTypes.string.isRequired,
                name: PropTypes.string.isRequired
            })
        ).isRequired,
        ports: PropTypes.arrayOf(PropTypes.number)
    }).isRequired
};

export default AllowedRouteDetails;
