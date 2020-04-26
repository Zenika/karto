import React from 'react';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import classNames from 'classnames';

const useStyles = makeStyles(theme => ({
    root: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: `1px solid ${theme.palette.divider}`
    },
    title: {
        color: theme.palette.text.main
    }
}));

const Header = ({ className = '' }) => {
    const classes = useStyles();
    return (
        <header className={classNames(classes.root, className)}>
            <Typography className={classes.title} variant="h1">Network Policy Explorer</Typography>
        </header>
    );
}

export default Header;
