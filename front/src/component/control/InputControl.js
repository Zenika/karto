import { makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import PropTypes from 'prop-types';
import Control from './Control';
import TextField from './TextField';

const useStyles = makeStyles(theme => ({
    actions: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginTop: theme.spacing(1)
    }
}));

const InputControl = ({ className = '', name, placeholder, checked, value, onChange }) => {
    const classes = useStyles();
    const handleChange = (event) => {
        onChange(event.target.value);
    };
    const clear = () => {
        onChange('');
    };
    return (
        <Control className={className} name={name} checked={checked}>
            <div className={classes.actions}>
                <Button color="primary" onClick={clear}>Clear</Button>
            </div>
            <TextField placeholder={placeholder} value={value} onChange={handleChange}/>
        </Control>
    );
};

InputControl.propTypes = {
    className: PropTypes.string,
    name: PropTypes.string.isRequired,
    placeholder: PropTypes.string.isRequired,
    checked: PropTypes.bool.isRequired,
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired
};

export default InputControl;
