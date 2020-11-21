import { StrictMode } from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './component/App';
import CssBaseline from '@material-ui/core/CssBaseline';
import { ThemeProvider } from '@material-ui/core/styles';
import { theme } from './theme';

ReactDOM.render(
    <StrictMode>
        <ThemeProvider theme={theme}>
            <CssBaseline/>
            <App/>
        </ThemeProvider>
    </StrictMode>,
    document.getElementById('root')
);
