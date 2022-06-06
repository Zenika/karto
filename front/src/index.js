import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './component/App';
import CssBaseline from '@mui/material/CssBaseline';
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles';
import { theme } from './theme';

const root = createRoot(document.getElementById('root'));
root.render(
    <StrictMode>
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={theme}>
                <CssBaseline/>
                <App/>
            </ThemeProvider>
        </StyledEngineProvider>
    </StrictMode>
);
