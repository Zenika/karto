import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#EC5E69',
            dark: '#65282d'
        },
        secondary: {
            main: '#5893DF',
            dark: '#294468'
        },
        warning: {
            main: '#ff9800',
            dark: '#5f3b00'
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
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    minWidth: 0
                }
            }
        }
    }
});
