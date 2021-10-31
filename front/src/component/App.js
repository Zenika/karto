import Header from './Header';
import Content from './Content';
import { Box } from '@mui/material';

const App = () => {
    return (
        <Box sx={{ backgroundColor: 'background.default' }}>
            <Header/>
            <Content/>
        </Box>
    );
};

export default App;
