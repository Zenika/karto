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

const AllowedRouteDetails = ({ data }) => {
    const classes = useStyles();

    return (
        <>
            <Typography className={classes.detailsTitle} variant="h2">Allowed route details</Typography>
            <div>
                <Typography variant="body1" component="span" className={classes.detailsKey}>Source pod:</Typography>
                <Typography variant="body1" component="span"
                            className={classes.detailsValue}>{data.sourcePod.namespace}/
                    {data.sourcePod.name}</Typography>
            </div>
            <div>
                <Typography variant="body1" component="span" className={classes.detailsKey}>Target pod:</Typography>
                <Typography variant="body1" component="span"
                            className={classes.detailsValue}>{data.targetPod.namespace}/
                    {data.targetPod.name}</Typography>
            </div>
            <div>
                <Typography variant="body1" component="span"
                            className={classes.detailsKey}>Ports:</Typography>
                <Typography variant="body1" component="span"
                            className={classes.detailsValue}>
                    {data.ports ? data.ports.join(', ') : 'all'}
                </Typography>
            </div>
            <div>
                <Typography variant="body1" component="span" className={classes.detailsKey}>Explanation:</Typography>
                <div className={classes.detailsValueNested}>
                    <div>
                        <Typography variant="body1" className={classes.detailsKey}>
                            Policies allowing egress from source:</Typography>
                        {
                            data.sourcePod.isEgressIsolated ? (
                                <Typography variant="body1" className={classes.detailsValue}>{
                                    data.egressPolicies
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
                            data.targetPod.isIngressIsolated ? (
                                <Typography variant="body1" className={classes.detailsValue}>{
                                    data.ingressPolicies
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
