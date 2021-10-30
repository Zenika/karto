import { StrictMode } from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './component/App';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import { theme } from './theme';

ReactDOM.render(
    <StrictMode>
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={theme}>
                <CssBaseline/>
                <App/>
            </ThemeProvider>
        </StyledEngineProvider>
    </StrictMode>,
    document.getElementById('root')
);
