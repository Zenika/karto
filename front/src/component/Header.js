import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import PropTypes from 'prop-types';

const useStyles = makeStyles(theme => ({
    root: {
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
