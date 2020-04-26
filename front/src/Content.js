import React, { useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import CircularProgress from '@material-ui/core/CircularProgress';
import classNames from 'classnames';
import Typography from '@material-ui/core/Typography';

const useStyles = makeStyles(theme => ({
    root: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
    },
    loadingCaption: {
        marginTop: 10,
        color: theme.palette.text.main
    }
}));

const Content = ({ className = '' }) => {
    const classes = useStyles();
    const [isLoading, setIsLoading] = useState(true);
    return (
        <section className={classNames(classes.root, className)}>
            {isLoading && <>
                <CircularProgress thickness={1} size={60} color="secondary"/>
                <Typography className={classes.loadingCaption} variant="caption">Analyzing your cluster...</Typography>
            </>}
        </section>
    );
}

export default Content;
