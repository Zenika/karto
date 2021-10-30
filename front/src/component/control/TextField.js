import makeStyles from '@mui/styles/makeStyles';
import MuiTextField from '@mui/material/TextField';

const useStyles = makeStyles(() => ({
    textField: {
        width: '100%'
    },
    input: {
        paddingTop: 3,
        paddingBottom: 6
    }
}));

const TextField = props => {
    const classes = useStyles();
    const textFieldClasses = { root: classes.textField };
    return (
        <MuiTextField variant="standard" classes={textFieldClasses}
                      InputProps={{ disableUnderline: true, classes: { input: classes.input } }} {...props}/>
    );
};

export default TextField;
