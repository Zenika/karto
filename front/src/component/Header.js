import Typography from '@mui/material/Typography';
import { Box } from '@mui/material';

const Header = () => {
    return (
        <Box component="header" sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 80,
            p: 2,
            zIndex: 1,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            cursor: 'default'
        }}>
            <Typography variant="h1">Karto</Typography>
        </Box>
    );
};

export default Header;
