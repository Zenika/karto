import React, { useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import Control from './Control';
import PropTypes from 'prop-types';
import Typography from '@material-ui/core/Typography';
import MenuItem from '@material-ui/core/MenuItem';
import Autocomplete from './Autocomplete';
import Select from './Select';
import RemoveIcon from '@material-ui/icons/Remove';
import AddIcon from '@material-ui/icons/Add';
import classNames from 'classnames';

const useStyles = makeStyles(theme => ({
    actions: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginTop: theme.spacing(1)
    },
    entry: {
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        paddingLeft: theme.spacing(1),
        borderLeft: `1px solid ${theme.palette.primary.main}`,
        marginTop: theme.spacing(1),
        '&:first-child': {
            marginTop: 0
        }
    },
    entryRow: {
        display: 'flex',
        flexDirection: 'row'
    },
    entryKey: {
        flex: 1
    },
    entryValue: {
        flex: 1
    },
    entryActions: {
        justifyContent: 'center'
    },
    buttonIcon: {
        height: 9,
        width: 9
    }
}));

const MultiKeyValueSelectControl = (
    { className = '', name, keyPlaceholder, valuePlaceholder, checked, options, selectedOptions, operators, onChange }
) => {
    const classes = useStyles();
    const entries = selectedOptions;

    useEffect(() => {
        if (entries.length === 0) {
            addEntry(0);
        }
    });

    const defaultValueForOperator = (operator) => {
        if (operator.args === 'multiple') {
            return [];
        } else {
            return null;
        }
    };
    const operatorForLabel = label => {
        return operators.find(operator => operator.label === label);
    };
    const labelOptionsForKey = key => {
        if (key == null) {
            return [];
        } else {
            const result = options[key];
            return result || [];
        }
    };
    const addEntry = index => {
        const defaultEntry = {
            key: null,
            operator: operators[0],
            value: defaultValueForOperator(operators[0])
        };
        entries.splice(index, 0, defaultEntry);
        onChange(entries);
    };
    const clearEntries = () => {
        onChange([]);
    };
    const removeEntry = index => {
        entries.splice(index, 1);
        onChange(entries);
    };
    const handleEntryChange = (index, newEntry) => {
        const newEntries = [...entries];
        newEntries[index] = newEntry;
        onChange(newEntries);
    };
    const handleEntryKeyChange = index => (event, newValue) => {
        const oldEntry = entries[index];
        handleEntryChange(index, {
            key: newValue,
            operator: oldEntry.operator,
            value: defaultValueForOperator(oldEntry.operator)
        });
    };
    const handleEntryOperatorChange = index => (event) => {
        const oldEntry = entries[index];
        const newOperator = event.target.value;
        handleEntryChange(index, {
            key: oldEntry.key,
            operator: newOperator,
            value: oldEntry.operator.args === newOperator.args
                ? oldEntry.value
                : defaultValueForOperator(newOperator)
        });
    };
    const handleEntryValueChange = index => (event, newValue) => {
        const oldEntry = entries[index];
        handleEntryChange(index, {
            key: oldEntry.key,
            operator: oldEntry.operator,
            value: newValue
        });
    };

    return (
        <Control className={className} name={name} checked={checked}>
            <div className={classes.actions}>
                <Button color="primary" onClick={clearEntries}>Clear</Button>
            </div>
            <div>{
                entries.map((entry, index) => {
                    return (
                        <div key={index} className={classes.entry}>
                            <div className={classes.entryRow}>
                                <Autocomplete
                                    className={classes.entryKey} options={Object.keys(options)}
                                    value={entry.key} onChange={handleEntryKeyChange(index)}
                                    placeholder={keyPlaceholder}/>
                                <Select
                                    value={operatorForLabel(entry.operator.label)}
                                    renderValue={value => value.label}
                                    onChange={handleEntryOperatorChange(index)}>
                                    {
                                        operators.map(operator =>
                                            <MenuItem key={operator.label} value={operator}>
                                                <Typography noWrap variant="body2">{operator.label}</Typography>
                                            </MenuItem>
                                        )
                                    }
                                </Select>
                            </div>
                            {entry.operator && entry.operator.args === 'multiple' && (
                                <div className={classes.entryRow}>
                                    <Autocomplete
                                        className={classes.entryValue} multiple
                                        options={labelOptionsForKey(entry.key)} placeholder={valuePlaceholder}
                                        onChange={handleEntryValueChange(index)} value={entry.value}/>
                                </div>
                            )}
                            {entry.operator && entry.operator.args === 'single' && (
                                <div className={classes.entryRow}>
                                    <Autocomplete
                                        className={classes.entryValue}
                                        options={labelOptionsForKey(entry.key)} placeholder={valuePlaceholder}
                                        onChange={handleEntryValueChange(index)} value={entry.value}/>
                                </div>
                            )}
                            <div className={classNames(classes.entryRow, classes.entryActions)}>
                                <Button color="primary" onClick={() => removeEntry(index)}>
                                    <RemoveIcon aria-label="Remove entry" className={classes.buttonIcon}
                                                viewBox="5 5 14 14"/>
                                </Button>
                                <Button color="primary" onClick={() => addEntry(index + 1)}>
                                    <AddIcon aria-label="Add entry" className={classes.buttonIcon}
                                             viewBox="5 5 14 14"/>
                                </Button>
                            </div>
                        </div>
                    );
                })
            }
            </div>
        </Control>
    );
};

MultiKeyValueSelectControl.propTypes = {
    className: PropTypes.string,
    name: PropTypes.string.isRequired,
    keyPlaceholder: PropTypes.string.isRequired,
    valuePlaceholder: PropTypes.string.isRequired,
    checked: PropTypes.bool.isRequired,
    options: PropTypes.objectOf(PropTypes.arrayOf(PropTypes.string)).isRequired,
    selectedOptions: PropTypes.arrayOf(PropTypes.shape({
        key: PropTypes.string,
        operator: PropTypes.shape({
            label: PropTypes.string.isRequired,
            args: PropTypes.string.isRequired
        }),
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)])
    })).isRequired,
    operators: PropTypes.arrayOf(PropTypes.shape({
        label: PropTypes.string.isRequired,
        args: PropTypes.string.isRequired
    })).isRequired,
    onChange: PropTypes.func.isRequired
};

export default MultiKeyValueSelectControl;
