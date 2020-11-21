import { makeStyles } from '@material-ui/core/styles';
import MuiAutocomplete from '@material-ui/lab/Autocomplete';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import Popper from '@material-ui/core/Popper';

const useStyles = makeStyles(theme => ({
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

const Autocomplete = ({ placeholder, ...props }) => {
    const classes = useStyles();
    const chipClasses = { root: classes.chip, deleteIcon: classes.chipDeleteIcon };
    const textFieldClasses = { root: classes.input };
    return <MuiAutocomplete
        size="small" autoHighlight={true} closeIcon={null}
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
            <Popper {...props} style={{ minWidth: 263, width: 'auto' }} placement='bottom-start'/>
        )}
        renderOption={(option) => (
            <Typography noWrap variant="body2">{option}</Typography>
        )}
        {...props}
    />;
};

export default Autocomplete;
