import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import PropTypes from 'prop-types';
import TextField from '@material-ui/core/TextField';
import Control from './Control';

const useStyles = makeStyles(theme => ({
    actions: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginTop: theme.spacing(1)
    },
    input: {
        width: '100%'
    }
}));

const InputControl = ({ className = '', name, placeholder, clearAction, checked, value, onChange }) => {
    const classes = useStyles();
    const textFieldClasses = { root: classes.input };
    const handleChange = (event) => {
        onChange(event.target.value);
    };
    const clear = () => {
        onChange("");
    };
    return (
        <Control className={className} name={name} checked={checked}>
            <div className={classes.actions}>
                {clearAction && <Button color="primary" onClick={clear}>Clear</Button>}
            </div>
            <TextField variant="standard" placeholder={placeholder} InputProps={{ disableUnderline: true }}
                       value={value} onChange={handleChange} classes={textFieldClasses}/>
        </Control>
    )
};

InputControl.propTypes = {
    className: PropTypes.string,
    name: PropTypes.string.isRequired,
    placeholder: PropTypes.string.isRequired,
    clearAction: PropTypes.bool.isRequired,
    checked: PropTypes.bool.isRequired,
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired
};

export default InputControl;
