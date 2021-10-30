import makeStyles from '@mui/styles/makeStyles';
import MuiSelect from '@mui/material/Select';

const useStyles = makeStyles(theme => ({
    select: {
        '&&&': {
            color: theme.palette.primary.main,
            minWidth: 0,
            paddingTop: 3,
            paddingBottom: 6,
            '&:focus': {
                background: 'none'
            }
        }
    }
}));

const Select = props => {
    const classes = useStyles();
    const selectClasses = { select: classes.select };
    return <MuiSelect classes={selectClasses} variant="standard" disableUnderline={true} {...props}/>;
};

export default Select;
