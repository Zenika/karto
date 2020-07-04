import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
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

const ServiceDetails = ({ data }) => {
    const classes = useStyles();

    return (
        <>
            <Typography className={classes.detailsTitle} variant="h2">Service details</Typography>
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
                            className={classes.detailsKey}>Target pods:</Typography>
                <div className={classes.detailsValueNested}>
                    {data.targetPods.map(targetPod =>
                        <Typography variant="body1" className={classes.detailsValue}>
                            {targetPod.namespace}/{targetPod.name}
                        </Typography>
                    )}
                </div>
            </div>
        </>
    );
};

ServiceDetails.propTypes = {
    data: PropTypes.shape({
        namespace: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        targetPods: PropTypes.arrayOf(PropTypes.shape({
            namespace: PropTypes.string.isRequired,
            name: PropTypes.string.isRequired
        }))
    }).isRequired
};

export default ServiceDetails;
