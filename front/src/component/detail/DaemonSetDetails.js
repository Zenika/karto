import Typography from '@mui/material/Typography';
import PropTypes from 'prop-types';
import { Box } from '@mui/material';
import detailsStyles from './detailsStyles';

const DaemonSetDetails = ({ data }) => (
    <>
        <Typography sx={detailsStyles.detailsTitle} variant="h2">DaemonSet details</Typography>
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
                        sx={detailsStyles.detailsKey}>Target pods:</Typography>
            <Box sx={detailsStyles.detailsValueNested}>
                {data.targetPods.map((targetPod, i) =>
                    <Typography key={i} variant="body1" sx={detailsStyles.detailsValue}>
                        {targetPod.namespace}/{targetPod.name}
                    </Typography>
                )}
            </Box>
        </div>
    </>
);

DaemonSetDetails.propTypes = {
    data: PropTypes.shape({
        namespace: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        targetPods: PropTypes.arrayOf(PropTypes.shape({
            namespace: PropTypes.string.isRequired,
            name: PropTypes.string.isRequired
        }))
    }).isRequired
};

export default DaemonSetDetails;
