import Button from '@mui/material/Button';
import PropTypes from 'prop-types';
import Control from './Control';
import Autocomplete from './Autocomplete';
import { Box } from '@mui/material';

const MultiSelectControl = ({ sx, name, placeholder, checked, options, selectedOptions, onChange }) => {
    const handleChange = (event, newValue) => {
        onChange(newValue);
    };
    const selectNone = () => {
        onChange([]);
    };
    const selectAll = () => {
        onChange(options);
    };
    return (
        <Control sx={sx} name={name} checked={checked}>
            <Box sx={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'flex-start',
                mt: 1
            }}>
                <Button color="primary" onClick={selectAll}>Select all</Button>
                <Button color="primary" onClick={selectNone}>Clear</Button>
            </Box>
            <Autocomplete multiple options={options} value={selectedOptions} onChange={handleChange}
                          placeholder={placeholder}/>
        </Control>
    );
};

MultiSelectControl.propTypes = {
    sx: PropTypes.object,
    name: PropTypes.string.isRequired,
    placeholder: PropTypes.string.isRequired,
    checked: PropTypes.bool.isRequired,
    options: PropTypes.arrayOf(PropTypes.string).isRequired,
    selectedOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
    onChange: PropTypes.func.isRequired
};

export default MultiSelectControl;
