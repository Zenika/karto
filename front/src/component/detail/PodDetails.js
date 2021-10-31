import Typography from '@mui/material/Typography';
import PropTypes from 'prop-types';
import detailsStyles from './detailsStyles';
import { Box } from '@mui/material';

const PodDetails = ({ data }) => (
    <>
        <Typography sx={detailsStyles.detailsTitle} variant="h2">Pod details</Typography>
        <div>
            <Typography variant="body1" component="span"
                        sx={detailsStyles.detailsKey}>Namespace:</Typography>
            <Typography variant="body1" component="span"
                        sx={detailsStyles.detailsValue}>{data.namespace}</Typography>
        </div>
        <div>
            <Typography variant="body1" component="span" sx={detailsStyles.detailsKey}>Name:</Typography>
            <Typography variant="body1" component="span"
                        sx={detailsStyles.detailsValue}>{data.name}</Typography>
        </div>
        <div>
            <Typography variant="body1" component="span" sx={detailsStyles.detailsKey}>Labels:</Typography>
            <Box sx={detailsStyles.detailsValueNested}>
                {
                    Object.entries(data.labels).map(([key, value]) => (
                        <div key={key}>
                            <Typography variant="body1" component="span"
                                        sx={detailsStyles.detailsKey}>{key}:</Typography>
                            <Typography variant="body1" component="span"
                                        sx={detailsStyles.detailsValue}>{value}</Typography>
                        </div>
                    ))
                }
            </Box>
        </div>
        {data.isIngressIsolated != null && (
            <div>
                <Typography variant="body1" component="span" sx={detailsStyles.detailsKey}>
                    Isolated for ingress:
                </Typography>
                <Typography variant="body1" component="span" sx={detailsStyles.detailsValue}>
                    {data.isIngressIsolated ? 'yes' : 'no'}
                </Typography>
            </div>
        )}
        {data.isEgressIsolated != null && (
            <div>
                <Typography variant="body1" component="span" sx={detailsStyles.detailsKey}>
                    Isolated for egress:
                </Typography>
                <Typography variant="body1" component="span" sx={detailsStyles.detailsValue}>
                    {data.isEgressIsolated ? 'yes' : 'no'}
                </Typography>
            </div>
        )}
        {data.containers != null && (
            <div>
                <Typography variant="body1" component="span" sx={detailsStyles.detailsKey}>Health:</Typography>
                <Box sx={detailsStyles.detailsValueNested}>
                    <div>
                        <Typography variant="body1" component="span"
                                    sx={detailsStyles.detailsKey}>Containers running:</Typography>
                        <Typography variant="body1" component="span" sx={detailsStyles.detailsValue}>
                            {data.containersRunning}/{data.containers}
                        </Typography>
                    </div>
                    <div>
                        <Typography variant="body1" component="span"
                                    sx={detailsStyles.detailsKey}>Containers ready:</Typography>
                        <Typography variant="body1" component="span" sx={detailsStyles.detailsValue}>
                            {data.containersReady}/{data.containers}
                        </Typography>
                    </div>
                    <div>
                        <Typography variant="body1" component="span"
                                    sx={detailsStyles.detailsKey}>Containers with no restart:</Typography>
                        <Typography variant="body1" component="span" sx={detailsStyles.detailsValue}>
                            {data.containersWithoutRestart}/{data.containers}
                        </Typography>
                    </div>
                </Box>
            </div>
        )}
    </>
);

PodDetails.propTypes = {
    data: PropTypes.shape({
        namespace: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        labels: PropTypes.object.isRequired,
        isEgressIsolated: PropTypes.bool,
        isIngressIsolated: PropTypes.bool
    }).isRequired
};

export default PodDetails;
