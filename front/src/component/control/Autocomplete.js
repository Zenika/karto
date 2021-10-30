import makeStyles from '@mui/styles/makeStyles';
import MuiAutocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Popper from '@mui/material/Popper';

const useStyles = makeStyles(theme => ({
    chip: {
        '&&&': {
            height: 18,
            marginRight: theme.spacing(0.5),
            fontSize: theme.typography.body2.fontSize
        }
    },
    input: {
        '&&&&': {
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

const Autocomplete = ({ placeholder, ...props }) => {
    const classes = useStyles();
    const chipClasses = { root: classes.chip, deleteIcon: classes.chipDeleteIcon };
    const textFieldClasses = { root: classes.input };
    return <MuiAutocomplete
        size="small" autoHighlight={true} clearIcon={null}
        ChipProps={{
            color: 'primary', variant: 'outlined', classes: chipClasses
        }}
        renderInput={(params) => {
            return (
                <TextField {...params} variant="standard" placeholder={placeholder} InputProps={{
                    ...params.InputProps, disableUnderline: true, classes: textFieldClasses
                }}/>
            );
        }}
        PopperComponent={(props) => (
            <Popper {...props} style={{ minWidth: 263, width: 'auto' }} placement="bottom-start"/>
        )}
        renderOption={((props, option) =>
                <Typography noWrap variant="body2" {...props}>{option}</Typography>
        )}
        {...props}
    />;
};

export default Autocomplete;
