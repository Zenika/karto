import withStyles from '@material-ui/core/styles/withStyles';
import { Switch as MuiSwitch } from '@material-ui/core';
import React from 'react';
import PropTypes from 'prop-types';
import FormControlLabel from '@material-ui/core/FormControlLabel';

const CustomSwitch = withStyles((theme) => ({
    root: {
        width: 32,
        height: 18,
        padding: 0,
        display: 'flex',
        margin: `0 ${theme.spacing(1)}px 0 ${theme.spacing(1) + 3}px`
    },
    switchBase: {
        padding: 2,
        color: theme.palette.common.white,
        '&$checked': {
            transform: 'translateX(14px)',
            color: theme.palette.common.white,
            '& + $track': {
                opacity: 1,
                backgroundColor: theme.palette.primary.main,
                borderColor: theme.palette.primary.main
            }
        }
    },
    thumb: {
        width: 14,
        height: 14,
        boxShadow: 'none'
    },
    track: {
        border: `1px solid ${theme.palette.primary.main}`,
        borderRadius: 18 / 2,
        opacity: 1,
        backgroundColor: theme.palette.background.default
    },
    checked: {}
}))(MuiSwitch);

const SwitchControl = ({ className = '', name, checked, onChange }) => {
    const handleChange = (event) => {
        onChange(event.target.checked);
    };
    return (
        <FormControlLabel className={className} label={name} control={
            <CustomSwitch name={name} checked={checked} onChange={handleChange}/>
        }/>
    );
};

SwitchControl.propTypes = {
    className: PropTypes.string,
    name: PropTypes.string.isRequired,
    checked: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired
};

export default SwitchControl;
