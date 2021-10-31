import Typography from '@mui/material/Typography';
import PropTypes from 'prop-types';
import detailsStyles from './detailsStyles';
import { Box } from '@mui/material';

const IngressDetails = ({ data }) => (
    <>
        <Typography sx={detailsStyles.detailsTitle} variant="h2">Ingress details</Typography>
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
                        sx={detailsStyles.detailsKey}>Target services:</Typography>
            <Box sx={detailsStyles.detailsValueNested}>
                {data.targetServices.map((targetService, i) =>
                    <Typography key={i} variant="body1" sx={detailsStyles.detailsValue}>
                        {targetService.namespace}/{targetService.name}
                    </Typography>
                )}
            </Box>
        </div>
    </>
);

IngressDetails.propTypes = {
    data: PropTypes.shape({
        namespace: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        targetServices: PropTypes.arrayOf(PropTypes.shape({
            namespace: PropTypes.string.isRequired,
            name: PropTypes.string.isRequired
        }))
    }).isRequired
};

export default IngressDetails;
