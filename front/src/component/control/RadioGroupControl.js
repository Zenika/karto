import makeStyles from '@mui/styles/makeStyles';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import PropTypes from 'prop-types';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';

const useCustomRadioStyles = makeStyles(theme => ({
    root: {
        '&&': {
            height: 20,
            width: `calc(${theme.spacing(1)} + 32px)`,
            paddingTop: 0,
            paddingBottom: 0,
            '&:hover': {
                background: 'none'
            }
        }
    },
    icon: {
        height: 16,
        width: 16,
        marginRight: theme.spacing(1)
    }
}));

const CustomRadio = (props) => {
    const classes = useCustomRadioStyles();

    return (
        <Radio
            className={classes.root}
            disableRipple
            color="primary"
            icon={
                <span className={classes.icon}/>
            }
            checkedIcon={
                <KeyboardArrowRight className={classes.icon} viewBox="5 5 14 14"/>
            }
            {...props}
        />
    );
};

const useStyles = makeStyles(theme => ({
    radio: {
        marginLeft: 0,
        marginBottom: theme.spacing(1),
        '&:last-child': {
            marginBottom: 0
        }
    }
}));

const RadioGroupControl = ({ className = '', options, value, onChange }) => {
    const classes = useStyles();

    const handleChange = (event) => {
        onChange(event.target.value);
    };
    return (
        <RadioGroup className={className} value={value} onChange={handleChange}>
            {options.map(option =>
                <FormControlLabel className={classes.radio} key={option} value={option} control={<CustomRadio/>}
                                  label={option}/>
            )}
        </RadioGroup>
    );
};

RadioGroupControl.propTypes = {
    className: PropTypes.string,
    options: PropTypes.arrayOf(PropTypes.string).isRequired,
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired
};

export default RadioGroupControl;