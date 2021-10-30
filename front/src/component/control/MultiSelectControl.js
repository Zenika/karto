import makeStyles from '@mui/styles/makeStyles';
import Button from '@mui/material/Button';
import PropTypes from 'prop-types';
import Control from './Control';
import Autocomplete from './Autocomplete';

const useStyles = makeStyles(theme => ({
    actions: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginTop: theme.spacing(1)
    }
}));

const MultiSelectControl = ({ className = '', name, placeholder, checked, options, selectedOptions, onChange }) => {
    const classes = useStyles();
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
        <Control className={className} name={name} checked={checked}>
            <div className={classes.actions}>
                <Button color="primary" onClick={selectAll}>Select all</Button>
                <Button color="primary" onClick={selectNone}>Clear</Button>
            </div>
            <Autocomplete multiple options={options} value={selectedOptions} onChange={handleChange}
                          placeholder={placeholder}/>
        </Control>
    );
};

MultiSelectControl.propTypes = {
    className: PropTypes.string,
    name: PropTypes.string.isRequired,
    placeholder: PropTypes.string.isRequired,
    checked: PropTypes.bool.isRequired,
    options: PropTypes.arrayOf(PropTypes.string).isRequired,
    selectedOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
    onChange: PropTypes.func.isRequired
};

export default MultiSelectControl;
