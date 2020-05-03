import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './component/App';
import CssBaseline from '@material-ui/core/CssBaseline';
// https://github.com/mui-org/material-ui/issues/13394
import { ThemeProvider, unstable_createMuiStrictModeTheme as createMuiTheme } from '@material-ui/core/styles';

const theme = createMuiTheme({
    palette: {
        type: 'dark',
        primary: {
            main: '#EC5E69'
        },
        secondary: {
            main: '#5893DF'
        },
        background: {
            paper: '#24344D',
            default: '#192231'
        }
    },
    typography: {
        h1: {
            fontSize: '2rem'
        },
        h2: {
            fontSize: '1.2rem'
        },
        body1: {
            fontSize: '0.8rem'
        },
        body2: {
            fontSize: '0.7rem'
        },
        button: {
            fontSize: '0.65rem'
        }
    },
    overrides: {
        MuiButton: {
            root: {
                minWidth: 0
            }
        }
    }
});

ReactDOM.render(
    <React.StrictMode>
        <ThemeProvider theme={theme}>
            <CssBaseline/>
            <App/>
        </ThemeProvider>
    </React.StrictMode>,
    document.getElementById('root')
);
