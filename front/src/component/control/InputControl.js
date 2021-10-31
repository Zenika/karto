import Button from '@mui/material/Button';
import PropTypes from 'prop-types';
import Control from './Control';
import TextField from './TextField';
import { Box } from '@mui/material';

const InputControl = ({ sx, name, placeholder, checked, value, onChange }) => {
    const handleChange = (event) => {
        onChange(event.target.value);
    };
    const clear = () => {
        onChange('');
    };
    return (
        <Control sx={sx} name={name} checked={checked}>
            <Box sx={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'flex-start',
                mt: 1
            }}>
                <Button color="primary" onClick={clear}>Clear</Button>
            </Box>
            <TextField placeholder={placeholder} value={value} onChange={handleChange}/>
        </Control>
    );
};

InputControl.propTypes = {
    sx: PropTypes.object,
    name: PropTypes.string.isRequired,
    placeholder: PropTypes.string.isRequired,
    checked: PropTypes.bool.isRequired,
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired
};

export default InputControl;
