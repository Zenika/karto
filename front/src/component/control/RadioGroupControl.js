import Radio, { radioClasses } from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import PropTypes from 'prop-types';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import { Box } from '@mui/material';

const CustomRadio = (props) => (
    <Radio
        sx={{
            [`&.${radioClasses.root}`]: {
                height: 20,
                width: (theme) => `calc(${theme.spacing(1)} + 32px)`,
                py: 0,
                '&:hover': {
                    background: 'none'
                }
            }
        }}
        disableRipple
        color="primary"
        icon={
            <Box component="span" sx={{
                height: 16,
                width: 16,
                mr: 1
            }}/>
        }
        checkedIcon={
            <KeyboardArrowRight viewBox="5 5 14 14" sx={{
                height: 16,
                width: 16,
                mr: 1
            }}/>
        }
        {...props}
    />
);

const RadioGroupControl = ({ sx, options, value, onChange }) => {
    const handleChange = (event) => {
        onChange(event.target.value);
    };
    return (
        <RadioGroup sx={sx} value={value} onChange={handleChange}>
            {options.map(option =>
                <FormControlLabel key={option} value={option} control={<CustomRadio/>} label={option} sx={{
                    ml: 0,
                    mb: 1,
                    '&:last-of-type': {
                        mb: 0
                    }
                }}/>
            )}
        </RadioGroup>
    );
};

RadioGroupControl.propTypes = {
    sx: PropTypes.object,
    options: PropTypes.arrayOf(PropTypes.string).isRequired,
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired
};

export default RadioGroupControl;