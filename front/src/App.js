import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Header from './Header';
import Content from './Content';

const useStyles = makeStyles(theme => ({
    root: {
        height: '100vh',
        backgroundColor: theme.palette.background.default
    },
    header: {
        height: '80px'
    },
    content: {
        height: 'calc(100vh - 80px)'
    }
}));

const App = () => {
    const classes = useStyles();
    return (
        <div className={classes.root}>
            <Header className={classes.header}/>
            <Content className={classes.content}/>
        </div>
    );
}

export default App;
