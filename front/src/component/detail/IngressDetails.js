import makeStyles from '@mui/styles/makeStyles';
import Typography from '@mui/material/Typography';
import PropTypes from 'prop-types';

const useStyles = makeStyles(theme => ({
    root: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start'
    },
    detailsTitle: {
        marginBottom: theme.spacing(1),
        cursor: 'default'
    },
    detailsKey: {
        marginRight: theme.spacing(1)
    },
    detailsValue: {
        fontWeight: 200
    },
    detailsValueNested: {
        marginLeft: theme.spacing(1)
    }
}));

const IngressDetails = ({ data }) => {
    const classes = useStyles();

    return (
        <>
            <Typography className={classes.detailsTitle} variant="h2">Ingress details</Typography>
            <div>
                <Typography variant="body1" component="span"
                            className={classes.detailsKey}>Namespace:</Typography>
                <Typography variant="body1" component="span"
                            className={classes.detailsValue}>{data.namespace}</Typography>
            </div>
            <div>
                <Typography variant="body1" component="span" className={classes.detailsKey}>Name:</Typography>
                <Typography variant="body1" component="span"
                            className={classes.detailsValue}>{data.name}</Typography>
            </div>
            <div>
                <Typography variant="body1" component="span"
                            className={classes.detailsKey}>Target services:</Typography>
                <div className={classes.detailsValueNested}>
                    {data.targetServices.map((targetService, i) =>
                        <Typography key={i} variant="body1" className={classes.detailsValue}>
                            {targetService.namespace}/{targetService.name}
                        </Typography>
                    )}
                </div>
            </div>
        </>
    );
};

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
