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

const PodDetails = ({ data }) => {
    const classes = useStyles();

    return (
        <>
            <Typography className={classes.detailsTitle} variant="h2">Pod details</Typography>
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
                <Typography variant="body1" component="span" className={classes.detailsKey}>Labels:</Typography>
                <div className={classes.detailsValueNested}>
                    {
                        Object.entries(data.labels).map(([key, value]) => (
                            <div key={key}>
                                <Typography variant="body1" component="span"
                                            className={classes.detailsKey}>{key}:</Typography>
                                <Typography variant="body1" component="span"
                                            className={classes.detailsValue}>{value}</Typography>
                            </div>
                        ))
                    }
                </div>
            </div>
            <div>
                <Typography variant="body1" component="span" className={classes.detailsKey}>
                    Isolated for ingress:
                </Typography>
                <Typography variant="body1" component="span" className={classes.detailsValue}>
                    {data.isIngressIsolated ? 'yes' : 'no'}
                </Typography>
            </div>
            <div>
                <Typography variant="body1" component="span" className={classes.detailsKey}>
                    Isolated for egress:
                </Typography>
                <Typography variant="body1" component="span" className={classes.detailsValue}>
                    {data.isEgressIsolated ? 'yes' : 'no'}
                </Typography>
            </div>
        </>
    );
};

PodDetails.propTypes = {
    data: PropTypes.shape({
        namespace: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        labels: PropTypes.object.isRequired,
        isEgressIsolated: PropTypes.bool.isRequired,
        isIngressIsolated: PropTypes.bool.isRequired
    }).isRequired
};

export default PodDetails;
