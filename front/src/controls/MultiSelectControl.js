import React from 'react';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import MuiAutocomplete from '@material-ui/lab/Autocomplete';
import Button from '@material-ui/core/Button';
import PropTypes from 'prop-types';
import TextField from '@material-ui/core/TextField';
import Control from './Control';

const useCustomAutoCompleteStyles = makeStyles(theme => ({
    chip: {
        height: 18,
        marginRight: 0.5 * theme.spacing(1),
        fontSize: theme.typography.body2.fontSize
    },
    input: {
        '&&&': {
            paddingRight: 26,
            '&:before': {
                display: 'none'
            }
        }
    },
    chipDeleteIcon: {
        '&&': {
            marginRight: 0
        }
    }
}));

const CustomAutocomplete = (({ TextFieldProps, ...props }) => {
    const classes = useCustomAutoCompleteStyles();
    const chipClasses = { root: classes.chip, deleteIcon: classes.chipDeleteIcon };
    const textFieldClasses = { root: classes.input };
    return <MuiAutocomplete
        multiple size="small" autoHighlight={true} closeIcon={null}
        ChipProps={{
            color: 'primary', variant: 'outlined', classes: chipClasses
        }}
        renderInput={(params) => {
            return (
                <TextField {...params} {...TextFieldProps} variant="standard" InputProps={{
                    ...params.InputProps, disableUnderline: true, classes: textFieldClasses
                }}/>
            );
        }}
        renderOption={(option) => <Typography noWrap variant="body2">{option}</Typography>}
        {...props}
    />
});

const useStyles = makeStyles(theme => ({
    actions: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginTop: theme.spacing(1)
    }
}));

const MultiSelectControl = (
    { className = '', name, placeholder, selectAllAction, clearAction, checked, options, selectedOptions, onChange }
) => {
    const classes = useStyles();
    const handleChange = (event, newValue) => {
        onChange(newValue)
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
                {selectAllAction && <Button color="primary" onClick={selectAll}>Select all</Button>}
                {clearAction && <Button color="primary" onClick={selectNone}>Clear</Button>}
            </div>
            <CustomAutocomplete options={options} value={selectedOptions} onChange={handleChange}
                                TextFieldProps={{ placeholder: placeholder }}/>
        </Control>
    )
};

MultiSelectControl.propTypes = {
    className: PropTypes.string,
    name: PropTypes.string.isRequired,
    placeholder: PropTypes.string.isRequired,
    selectAllAction: PropTypes.bool.isRequired,
    clearAction: PropTypes.bool.isRequired,
    checked: PropTypes.bool.isRequired,
    options: PropTypes.arrayOf(PropTypes.string).isRequired,
    selectedOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
    onChange: PropTypes.func.isRequired
};

export default MultiSelectControl;
