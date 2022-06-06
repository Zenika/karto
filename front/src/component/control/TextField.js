import MuiTextField, { textFieldClasses } from '@mui/material/TextField';
import { inputClasses } from '@mui/material/Input';

const TextField = (props) => {
    return (
        <MuiTextField variant="standard" InputProps={{
            disableUnderline: true, sx: {
                [`& .${inputClasses.input}`]: {
                    pt: '3px',
                    pb: '6px'
                }
            }
        }} {...props} sx={{
            [`&.${textFieldClasses.root}`]: {
                width: '100%'
            }
        }}/>
    );
};

export default TextField;
