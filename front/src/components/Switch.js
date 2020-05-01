import withStyles from '@material-ui/core/styles/withStyles';
import { Switch as MuiSwitch } from '@material-ui/core';

const Switch = withStyles((theme) => ({
    root: {
        width: 32,
        height: 18,
        padding: 0,
        display: 'flex',
        margin: '0 12px'
    },
    switchBase: {
        padding: 2,
        color: theme.palette.common.white,
        '&$checked': {
            transform: 'translateX(14px)',
            color: theme.palette.common.white,
            '& + $track': {
                opacity: 1,
                backgroundColor: theme.palette.secondary.main,
                borderColor: theme.palette.secondary.main
            }
        }
    },
    thumb: {
        width: 14,
        height: 14,
        boxShadow: 'none'
    },
    track: {
        border: `1px solid ${theme.palette.secondary.main}`,
        borderRadius: 18 / 2,
        opacity: 1,
        backgroundColor: theme.palette.background.default
    },
    checked: {}
}))(MuiSwitch);

export default Switch;
