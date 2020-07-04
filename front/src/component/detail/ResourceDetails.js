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

const PodDetails = ({ podDetails }) => {
    const classes = useStyles();

    return (
        <>
            <Typography className={classes.detailsTitle} variant="h2">Pod details</Typography>
            <div>
                <Typography variant="body1" component="span"
                            className={classes.detailsKey}>Namespace:</Typography>
                <Typography variant="body1" component="span"
                            className={classes.detailsValue}>{podDetails.namespace}</Typography>
            </div>
            <div>
                <Typography variant="body1" component="span" className={classes.detailsKey}>Name:</Typography>
                <Typography variant="body1" component="span"
                            className={classes.detailsValue}>{podDetails.name}</Typography>
            </div>
            <div>
                <Typography variant="body1" component="span" className={classes.detailsKey}>Labels:</Typography>
                <div className={classes.detailsValueNested}>
                    {
                        Object.entries(podDetails.labels).map(([key, value]) => (
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
                    {podDetails.isIngressIsolated ? 'yes' : 'no'}
                </Typography>
            </div>
            <div>
                <Typography variant="body1" component="span" className={classes.detailsKey}>
                    Isolated for egress:
                </Typography>
                <Typography variant="body1" component="span" className={classes.detailsValue}>
                    {podDetails.isEgressIsolated ? 'yes' : 'no'}
                </Typography>
            </div>
        </>
    );
};

PodDetails.propTypes = {
    podDetails: PropTypes.shape({
        namespace: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        labels: PropTypes.object.isRequired,
        isEgressIsolated: PropTypes.bool.isRequired,
        isIngressIsolated: PropTypes.bool.isRequired
    }).isRequired
};

const AllowedRouteDetails = ({ allowedRouteDetails }) => {
    const classes = useStyles();

    return (
        <>
            <Typography className={classes.detailsTitle} variant="h2">Allowed route details</Typography>
            <div>
                <Typography variant="body1" component="span" className={classes.detailsKey}>Source pod:</Typography>
                <Typography variant="body1" component="span"
                            className={classes.detailsValue}>{allowedRouteDetails.sourcePod.namespace}/
                    {allowedRouteDetails.sourcePod.name}</Typography>
            </div>
            <div>
                <Typography variant="body1" component="span" className={classes.detailsKey}>Target pod:</Typography>
                <Typography variant="body1" component="span"
                            className={classes.detailsValue}>{allowedRouteDetails.targetPod.namespace}/
                    {allowedRouteDetails.targetPod.name}</Typography>
            </div>
            <div>
                <Typography variant="body1" component="span"
                            className={classes.detailsKey}>Ports:</Typography>
                <Typography variant="body1" component="span"
                            className={classes.detailsValue}>
                    {allowedRouteDetails.ports ? allowedRouteDetails.ports.join(', ') : 'all'}
                </Typography>
            </div>
            <div>
                <Typography variant="body1" component="span" className={classes.detailsKey}>Explanation:</Typography>
                <div className={classes.detailsValueNested}>
                    <div>
                        <Typography variant="body1" className={classes.detailsKey}>
                            Policies allowing egress from source:</Typography>
                        {
                            allowedRouteDetails.sourcePod.isEgressIsolated ? (
                                <Typography variant="body1" className={classes.detailsValue}>{
                                    allowedRouteDetails.egressPolicies
                                        .map(policy => `${policy.namespace}/${policy.name}`)
                                        .join(', ')
                                }</Typography>
                            ) : (
                                <Typography variant="body1" className={classes.detailsValue}>no isolation</Typography>
                            )
                        }
                    </div>
                    <div>
                        <Typography variant="body1" className={classes.detailsKey}>
                            Policies allowing ingress to target:</Typography>
                        {
                            allowedRouteDetails.targetPod.isIngressIsolated ? (
                                <Typography variant="body1" className={classes.detailsValue}>{
                                    allowedRouteDetails.ingressPolicies
                                        .map(policy => `${policy.namespace}/${policy.name}`)
                                        .join(', ')
                                }</Typography>
                            ) : (
                                <Typography variant="body1" className={classes.detailsValue}>no isolation</Typography>
                            )
                        }
                    </div>
                </div>
            </div>
        </>
    );
};

AllowedRouteDetails.propTypes = {
    allowedRouteDetails: PropTypes.shape({
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

export {
    PodDetails,
    AllowedRouteDetails
};
