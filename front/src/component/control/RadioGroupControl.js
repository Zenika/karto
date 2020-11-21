import { makeStyles } from '@material-ui/core/styles';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import PropTypes from 'prop-types';
import KeyboardArrowRight from '@material-ui/icons/KeyboardArrowRight';

const useCustomRadioStyles = makeStyles(theme => ({
    root: {
        '&&': {
            height: 20,
            width: 32 + theme.spacing(1),
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