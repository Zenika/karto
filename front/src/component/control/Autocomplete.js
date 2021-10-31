import MuiAutocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Popper from '@mui/material/Popper';
import { chipClasses } from '@mui/material/Chip';
import { inputClasses } from '@mui/material/Input';

const Autocomplete = ({ placeholder, ...props }) => (
    <MuiAutocomplete
        size="small" autoHighlight={true} clearIcon={null}
        ChipProps={{
            color: 'primary', variant: 'outlined', sx: {
                [`&.${chipClasses.root}`]: {
                    height: 18,
                    mr: 0.5,
                    fontSize: 'body2.fontSize'
                },
                [`& .${chipClasses.deleteIcon}`]: {
                    mr: 0
                }
            }
        }}
        renderInput={(params) => {
            return (
                <TextField {...params} variant="standard" placeholder={placeholder} InputProps={{
                    ...params.InputProps, disableUnderline: true, sx: {
                        [`&&&.${inputClasses.root}`]: {
                            pr: '26px',
                            '&:before': {
                                display: 'none'
                            }
                        }
                    }
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
    />
);

export default Autocomplete;
