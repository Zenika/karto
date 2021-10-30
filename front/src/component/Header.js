import Typography from '@mui/material/Typography';
import makeStyles from '@mui/styles/makeStyles';
import classNames from 'classnames';
import PropTypes from 'prop-types';

const useStyles = makeStyles(theme => ({
    root: {
        zIndex: 1,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: theme.spacing(2),
        cursor: 'default'
    }
}));

const Header = ({ className }) => {
    const classes = useStyles();
    return (
        <header className={classNames(classes.root, className)}>
            <Typography variant="h1">Karto</Typography>
        </header>
    );
};

Header.propTypes = {
    className: PropTypes.string.isRequired
};

export default Header;
