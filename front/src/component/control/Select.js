import { makeStyles } from '@material-ui/core/styles';
import MuiSelect from '@material-ui/core/Select';

const useStyles = makeStyles(theme => ({
    select: {
        color: theme.palette.primary.main,
        minWidth: 0,
        paddingTop: 3,
        paddingBottom: 6,
        '&:focus': {
            background: 'none'
        }
    }
}));

const Select = props => {
    const classes = useStyles();
    const selectClasses = { select: classes.select };
    return <MuiSelect classes={selectClasses} disableUnderline={true} {...props}/>;
};

export default Select;
