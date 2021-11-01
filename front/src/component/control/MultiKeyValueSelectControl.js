import { useEffect } from 'react';
import Button from '@mui/material/Button';
import Control from './Control';
import PropTypes from 'prop-types';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import Autocomplete from './Autocomplete';
import Select from './Select';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import { Box } from '@mui/material';

const styles = {
    entryRow: {
        display: 'flex',
        flexDirection: 'row'
    },
    entryKey: {
        flex: 1
    },
    entryValue: {
        flex: 1
    }
};

const MultiKeyValueSelectControl = (
    { sx, name, keyPlaceholder, valuePlaceholder, checked, options, selectedOptions, operators, onChange }
) => {
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
        <Control sx={sx} name={name} checked={checked}>
            <Box sx={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'flex-start',
                mt: 1
            }}>
                <Button color="primary" onClick={clearEntries}>Clear</Button>
            </Box>
            <div>{
                entries.map((entry, index) => {
                    return (
                        <Box key={index} sx={{
                            display: 'flex',
                            flex: 1,
                            flexDirection: 'column',
                            pl: 1,
                            borderLeft: 1,
                            borderLeftColor: 'primary.main',
                            mt: 1,
                            '&:first-of-type': {
                                mt: 0
                            }
                        }}>
                            <Box sx={styles.entryRow}>
                                <Autocomplete
                                    sx={styles.entryKey} options={Object.keys(options)}
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
                            </Box>
                            {entry.operator && entry.operator.args === 'multiple' && (
                                <Box sx={styles.entryRow}>
                                    <Autocomplete
                                        sx={styles.entryValue} multiple
                                        options={labelOptionsForKey(entry.key)} placeholder={valuePlaceholder}
                                        onChange={handleEntryValueChange(index)} value={entry.value}/>
                                </Box>
                            )}
                            {entry.operator && entry.operator.args === 'single' && (
                                <Box sx={styles.entryRow}>
                                    <Autocomplete
                                        sx={styles.entryValue}
                                        options={labelOptionsForKey(entry.key)} placeholder={valuePlaceholder}
                                        onChange={handleEntryValueChange(index)} value={entry.value}/>
                                </Box>
                            )}
                            <Box sx={{ ...styles.entryRow, justifyContent: 'center' }}>
                                <Button color="primary" onClick={() => removeEntry(index)}>
                                    <RemoveIcon aria-label="remove entry" viewBox="5 5 14 14"
                                                sx={{ height: 9, width: 9 }}/>
                                </Button>
                                <Button color="primary" onClick={() => addEntry(index + 1)}>
                                    <AddIcon aria-label="add entry" viewBox="5 5 14 14"
                                             sx={{ height: 9, width: 9 }}/>
                                </Button>
                            </Box>
                        </Box>
                    );
                })
            }
            </div>
        </Control>
    );
};

MultiKeyValueSelectControl.propTypes = {
    sx: PropTypes.object,
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
