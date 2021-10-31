import { useState } from 'react';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import { Box } from '@mui/material';
import PropTypes from 'prop-types';

const Control = ({ sx, name, checked, children }) => {
    const [expanded, setExpanded] = useState(false);
    const toggleExpand = () => {
        setExpanded(!expanded);
    };

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            mb: 1,
            ...sx
        }}>
            <Box onClick={toggleExpand} sx={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                cursor: 'pointer'
            }}>
                <Button aria-label={expanded ? 'collapse' : 'expand'} variant="outlined"
                        sx={{
                            p: 0,
                            mr: 1,
                            height: 18,
                            minWidth: 32,
                            color: 'text.primary',
                            border: 1,
                            borderColor: 'primary.main',
                            ...checked && {
                                backgroundColor: 'primary.main'
                            }
                        }}>
                    {expanded
                        ? <ExpandLessIcon viewBox="5 5 14 14" sx={{ height: 16 }}/>
                        : <ExpandMoreIcon viewBox="5 5 14 14" sx={{ height: 16 }}/>
                    }
                </Button>
                <Typography variant="body1">{name}</Typography>
            </Box>
            <Collapse in={expanded} timeout="auto" sx={{
                display: 'flex',
                flexDirection: 'column',
                ml: 2,
                pl: 1,
                pb: 1,
                borderLeft: 1,
                borderLeftColor: 'primary.main',
                borderBottom: 1,
                borderBottomColor: 'primary.main',
                ...!expanded && { pb: 0 }
            }}>
                {children}
            </Collapse>
        </Box>
    );
};

Control.propTypes = {
    sx: PropTypes.object,
    name: PropTypes.string.isRequired,
    checked: PropTypes.bool.isRequired,
    children: PropTypes.oneOfType([
        PropTypes.arrayOf(PropTypes.node),
        PropTypes.node
    ]).isRequired
};

export default Control;
