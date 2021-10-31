import Typography from '@mui/material/Typography';
import PropTypes from 'prop-types';
import detailsStyles from './detailsStyles';
import { Box } from '@mui/material';

const DeploymentDetails = ({ data }) => (
    <>
        <Typography sx={detailsStyles.detailsTitle} variant="h2">Deployment details</Typography>
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
            <Typography variant="body1" component="span"
                        sx={detailsStyles.detailsKey}>Target replicaSets:</Typography>
            <Box sx={detailsStyles.detailsValueNested}>
                {data.targetReplicaSets.map((targetReplicaSet, i) =>
                    <Typography key={i} variant="body1" sx={detailsStyles.detailsValue}>
                        {targetReplicaSet.namespace}/{targetReplicaSet.name}
                    </Typography>
                )}
            </Box>
        </div>
    </>
);

DeploymentDetails.propTypes = {
    data: PropTypes.shape({
        namespace: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        targetReplicaSets: PropTypes.arrayOf(PropTypes.shape({
            namespace: PropTypes.string.isRequired,
            name: PropTypes.string.isRequired
        }))
    }).isRequired
};

export default DeploymentDetails;
