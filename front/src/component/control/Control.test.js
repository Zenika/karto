import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Control from './Control';
import '@testing-library/jest-dom/extend-expect';

describe('Control component', () => {
    it('renders children', () => {
        render(
            <Control name={''} checked={false}>
                <span>child1</span>
                <span>child2</span>
            </Control>
        );

        expect(screen.queryByText('child1')).toBeInTheDocument();
        expect(screen.queryByText('child2')).toBeInTheDocument();
    });

    it('displays input name', () => {
        const name = 'input name';

        render(
            <Control name={name} checked={false}>
                <div/>
            </Control>
        );

        expect(screen.queryByText(name)).toBeInTheDocument();
    });

    it('is collapsed by default', () => {
        render(
            <Control name={''} checked={false}>
                <div/>
            </Control>
        );

        expect(screen.queryByLabelText('expand')).toBeInTheDocument();
        expect(screen.queryByLabelText('collapse')).not.toBeInTheDocument();
    });

    it('expands when button is clicked', () => {
        render(
            <Control name={''} checked={false}>
                <div/>
            </Control>
        );

        const expandButton = screen.getByLabelText('expand');
        fireEvent.click(expandButton);

        expect(screen.queryByLabelText('expand')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('collapse')).toBeInTheDocument();
    });

    it('collapses when button is clicked again', () => {
        render(
            <Control name={''} checked={false}>
                <div/>
            </Control>
        );

        const expandButton = screen.getByLabelText('expand');
        fireEvent.click(expandButton);
        const collapseButton = screen.getByLabelText('collapse');
        fireEvent.click(collapseButton);

        expect(screen.queryByLabelText('expand')).toBeInTheDocument();
        expect(screen.queryByLabelText('collapse')).not.toBeInTheDocument();
    });
});
