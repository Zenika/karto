import { useState } from 'react';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import makeStyles from '@mui/styles/makeStyles';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import classNames from 'classnames';
import PropTypes from 'prop-types';

const useStyles = makeStyles(theme => ({
    root: {
        display: 'flex',
        flexDirection: 'column',
        marginBottom: theme.spacing(1)
    },
    summary: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        cursor: 'pointer'
    },
    button: {
        padding: 0,
        marginRight: theme.spacing(1),
        height: 18,
        minWidth: 32,
        color: theme.palette.text.primary,
        border: `1px solid ${theme.palette.primary.main}`
    },
    buttonHighlight: {
        backgroundColor: theme.palette.primary.main
    },
    buttonIcon: {
        height: 16
    },
    content: {
        display: 'flex',
        flexDirection: 'column',
        marginLeft: theme.spacing(2),
        paddingLeft: theme.spacing(1),
        paddingBottom: theme.spacing(1),
        borderLeft: `1px solid ${theme.palette.primary.main}`,
        borderBottom: `1px solid ${theme.palette.primary.main}`
    },
    contentCollapsed: {
        paddingBottom: 0
    }
}));

const Control = ({ className = '', name, checked, children }) => {
    const classes = useStyles();
    const [expanded, setExpanded] = useState(false);
    const toggleExpand = () => {
        setExpanded(!expanded);
    };
    return (
        <div className={classNames(classes.root, className)}>
            <div className={classes.summary} onClick={toggleExpand}>
                <Button className={classNames(classes.button, { [classes.buttonHighlight]: checked })}
                        aria-label={expanded ? 'collapse' : 'expand'} variant="outlined">
                    {expanded
                        ? <ExpandLessIcon className={classes.buttonIcon} viewBox="5 5 14 14"/>
                        : <ExpandMoreIcon className={classes.buttonIcon} viewBox="5 5 14 14"/>
                    }
                </Button>
                <Typography variant="body1">{name}</Typography>
            </div>
            <Collapse className={classNames(classes.content, { [classes.contentCollapsed]: !expanded })} in={expanded}
                      timeout="auto">
                {children}
            </Collapse>
        </div>
    );
};

Control.propTypes = {
    className: PropTypes.string,
    name: PropTypes.string.isRequired,
    checked: PropTypes.bool.isRequired,
    children: PropTypes.oneOfType([
        PropTypes.arrayOf(PropTypes.node),
        PropTypes.node
    ]).isRequired
};

export default Control;
