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
import withStyles from '@material-ui/core/styles/withStyles';
import TextField from '@material-ui/core/TextField';

const CustomAutocomplete = withStyles((theme) => ({
    root: {
        width: '100%'
    },
    input: {
        '&&&': {
            paddingRight: 26,
            '&:before': {
                display: 'none'
            }
        }
    },
    chip: {
        height: 18,
        marginRight: 0.5 * theme.spacing(1),
        fontSize: theme.typography.body2.fontSize
    },
    chipDeleteIcon: {
        '&&': {
            marginRight: 0
        }
    }
}))(props => {
    const chipClasses = { deleteIcon: props.classes.chipDeleteIcon };
    const textFieldClasses = { root: props.classes.input };
    return <MuiAutocomplete
        {...props} multiple size="small" autoHighlight={true} closeIcon={null}
        ChipProps={{
            className: props.classes.chip, color: 'primary', variant: 'outlined', classes: chipClasses
        }}
        renderInput={(params) => {
            return (
                <TextField {...params} {...props.TextFieldProps} variant="standard" InputProps={{
                    ...params.InputProps, disableUnderline: true, classes: textFieldClasses
                }}/>
            );
        }}
        renderOption={(option) => <Typography noWrap variant="body2">{option}</Typography>}
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
    buttonExpanded: {
        backgroundColor: theme.palette.primary.main
    },
    buttonIcon: {
        height: 16
    },
    actions: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: theme.spacing(1)
    },
    content: {
        display: 'flex',
        flexDirection: 'column'
    }
}));

const MultiSelect = ({ className = '', name, options, selectedOptions, onChange }) => {
    const classes = useStyles();
    const [expanded, setExpanded] = useState(true);
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
        onChange([]); // Empty selection means all options are selected
        toggleExpand();
    };
    return (
        <div className={classNames(classes.root, className)}>
            <div className={classes.summary} onClick={toggleExpand}>
                <Button className={classNames(classes.button, { [classes.buttonExpanded]: selectedOptions.length > 0 })}
                        variant="outlined">
                    {expanded
                        ? <ExpandLessIcon className={classes.buttonIcon} viewBox="5 5 14 14"/>
                        : <ExpandMoreIcon className={classes.buttonIcon} viewBox="5 5 14 14"/>
                    }
                </Button>
                <Typography variant="body1">{name}</Typography>
            </div>
            <Collapse in={expanded} timeout="auto">
                <div className={classes.actions}>
                    <Button color="primary" onClick={selectAll}>Select all</Button>
                    <Button color="primary" onClick={selectNone}>Clear</Button>
                </div>
                <div className={classes.content}>
                    <CustomAutocomplete options={options} value={selectedOptions} onChange={handleChange}
                                        TextFieldProps={{ placeholder: 'Select a namespace' }}/>
                </div>
            </Collapse>
        </div>
    )
};

MultiSelect.propTypes = {
    className: PropTypes.string,
    name: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(PropTypes.string).isRequired,
    selectedOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
    onChange: PropTypes.func.isRequired
};

export default MultiSelect;
