import Switch, { switchClasses } from '@mui/material/Switch';
import PropTypes from 'prop-types';
import FormControlLabel from '@mui/material/FormControlLabel';

const SwitchControl = ({ sx, name, checked, onChange }) => {
    const handleChange = (event) => {
        onChange(event.target.checked);
    };
    return (
        <FormControlLabel sx={sx} label={name} control={
            <Switch name={name} checked={checked} onChange={handleChange} sx={{
                [`&.${switchClasses.root}`]: {
                    width: 32,
                    height: 18,
                    p: 0,
                    display: 'flex',
                    m: (theme) => `0 ${theme.spacing(1)} 0 calc(${theme.spacing(1)} + 3px)`
                },
                [`& .${switchClasses.switchBase}`]: {
                    p: '2px',
                    color: 'common.white',
                    [`&.${switchClasses.checked}`]: {
                        transform: 'translateX(14px)',
                        color: 'common.white',
                        [`& + .${switchClasses.track}`]: {
                            opacity: 1,
                            backgroundColor: 'primary.main',
                            borderColor: 'primary.main'
                        }
                    }
                },
                [`& .${switchClasses.thumb}`]: {
                    width: 14,
                    height: 14,
                    boxShadow: 'none'
                },
                [`& .${switchClasses.track}`]: {
                    border: 1,
                    borderColor: 'primary.main',
                    borderRadius: 18 / 2,
                    opacity: 1,
                    backgroundColor: 'background.default'
                }
            }}/>
        }/>
    );
};

SwitchControl.propTypes = {
    sx: PropTypes.object,
    name: PropTypes.string.isRequired,
    checked: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired
};

export default SwitchControl;
