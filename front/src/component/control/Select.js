import MuiSelect, { selectClasses } from '@mui/material/Select';

const Select = props => {
    return <MuiSelect variant="standard" disableUnderline={true} {...props} sx={{
        [`&&& .${selectClasses.select}`]: {
            color: 'primary.main',
            minWidth: 0,
            pt: '3px',
            pb: '6px',
            '&:focus': {
                background: 'none'
            }
        }
    }}/>;
};

export default Select;
