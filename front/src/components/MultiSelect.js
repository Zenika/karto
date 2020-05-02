import React, { useState } from 'react';
import Typography from '@material-ui/core/Typography';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import { makeStyles } from '@material-ui/core/styles';
import MuiAutocomplete from '@material-ui/lab/Autocomplete';
import Button from '@material-ui/core/Button';
import { unstable_StrictModeCollapse as Collapse } from '@material-ui/core/Collapse';
import classNames from 'classnames'
import PropTypes from 'prop-types';
import TextField from '@material-ui/core/TextField';

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
    root: {
        display: 'flex',
        flexDirection: 'column',
        marginBottom: theme.spacing(1)
    },
    summary: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        cursor: 'pointer'
    },
    button: {
        padding: 0,
        marginRight: theme.spacing(1),
        height: 18,
        minWidth: 32,
        color: theme.palette.text.primary,
        border: `1px solid ${theme.palette.primary.main}`
    },
    buttonHighlight: {
        backgroundColor: theme.palette.primary.main
    },
    buttonIcon: {
        height: 16
    },
    actions: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginTop: theme.spacing(1)
    },
    content: {
        display: 'flex',
        flexDirection: 'column',
        marginLeft: theme.spacing(2),
        paddingLeft: theme.spacing(1),
        paddingBottom: theme.spacing(1),
        borderLeft: `1px solid ${theme.palette.primary.main}`,
        borderBottom: `1px solid ${theme.palette.primary.main}`
    }
}));

const MultiSelect = ({ className = '', name, checked, options, selectedOptions, onChange }) => {
    const classes = useStyles();
    const [expanded, setExpanded] = useState(false);
    const handleChange = (event, newValue) => {
        onChange(newValue)
    };
    const toggleExpand = () => {
        setExpanded(!expanded);
    };
    const selectNone = () => {
        onChange([]);
    };
    const selectAll = () => {
        onChange(options);
    };
    return (
        <div className={classNames(classes.root, className)}>
            <div className={classes.summary} onClick={toggleExpand}>
                <Button className={classNames(classes.button, { [classes.buttonHighlight]: checked })}
                        variant="outlined">
                    {expanded
                        ? <ExpandLessIcon className={classes.buttonIcon} viewBox="5 5 14 14"/>
                        : <ExpandMoreIcon className={classes.buttonIcon} viewBox="5 5 14 14"/>
                    }
                </Button>
                <Typography variant="body1">{name}</Typography>
            </div>
            <Collapse className={classes.content} in={expanded} timeout="auto">
                <div className={classes.actions}>
                    <Button color="primary" onClick={selectAll}>Select all</Button>
                    <Button color="primary" onClick={selectNone}>Clear</Button>
                </div>
                <CustomAutocomplete options={options} value={selectedOptions} onChange={handleChange}
                                    TextFieldProps={{ placeholder: 'Select a namespace' }}/>
            </Collapse>
        </div>
    )
};

MultiSelect.propTypes = {
    className: PropTypes.string,
    name: PropTypes.string.isRequired,
    checked: PropTypes.bool.isRequired,
    options: PropTypes.arrayOf(PropTypes.string).isRequired,
    selectedOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
    onChange: PropTypes.func.isRequired
};

export default MultiSelect;
