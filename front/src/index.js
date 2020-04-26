import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import CssBaseline from '@material-ui/core/CssBaseline';
import { ThemeProvider } from '@material-ui/core/styles';
import { createMuiTheme } from '@material-ui/core';

const theme = createMuiTheme({
    palette: {
        type: 'dark',
        primary: {
            main: '#5893DF'
        },
        secondary: {
            main: '#9878d9'
        },
        text: {
            main: 'rgba(255, 255, 255, 0.75)',
            primary: 'rgba(0, 0, 0, 0.75)',
            secondary: 'rgba(0, 0, 0, 0.75)',
            disabled: 'rgba(255, 255, 255, 0.38)',
            hint: 'rgba(255, 255, 255, 0.38)'
        },
        background: {
            paper: '#24344D',
            default: '#192231'
        },
        divider: '#27303E'
    },
    typography: {
        h1: {
            fontSize: 32
        },
        h2: {
            fontSize: 24
        },
        h3: {
            fontSize: 18
        }
    }
});

ReactDOM.render(
    <React.StrictMode>
        <CssBaseline/>
        <ThemeProvider theme={theme}>
            <App/>
        </ThemeProvider>
    </React.StrictMode>,
    document.getElementById('root')
);
